const connection = require("../../config/db");
const logAudit = require("../../utils/logAudit");
const mailSender = require("../../utils/mailSender");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const uploadFileToS3 = require("../../utils/s3Upload");
const moment = require("moment");

const sendConsentEmail = async (req, res) => {
  const values = { ...req.body, ...req.query };
  const sql = `SELECT um.user_id AS patient_id,um.fk_physician_id,up.firstname,up.lastname,CONCAT(up2.firstname," ",up2.lastname) as doctorname,up.work_email from users_mappings um LEFT JOIN user_profiles up ON up.fk_userid = um.user_id LEFT JOIN user_profiles up2 ON up2.fk_userid = um.fk_physician_id  where user_id = ${values.patientId} and fk_role_id = 7`;
  const [patient] = await connection.query(sql);
  if (patient.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Patient not found",
    });
  }
  const details = patient ? patient[0] : {};
  let email = details.work_email;
  let emailvalues = {
    firstName: details.firstname,
    lastName: details.lastname,
    doctorName: details.doctorname,
    patientId: details.patientId,
  };
  const token = uuidv4();
  const url = `http://localhost:8000/api/v1/ehr/consent-form?token=${token}`;

  const htmlContent = `
 <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05); overflow: hidden;">

    <!-- Header / Logo -->
    <div style="background-color: #1a73e8; padding: 20px; text-align: center;">
      <img src="https://via.placeholder.com/150x50?text=Healthcare+Logo" alt="Healthcare Logo" style="max-width: 150px;" />
    </div>

    <!-- Body -->
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333;">👋 Dear <strong>${
        emailvalues.firstName
      }</strong>,</p>

      <p style="font-size: 16px; color: #333;">
        🩺 You have been invited by <strong>Dr. ${
          emailvalues.doctorName
        }</strong> to review and provide your consent for a medical procedure or treatment.
      </p>

      <p style="font-size: 16px; color: #333;">
        ✍️ To proceed, please click the button below to view and electronically sign the consent form:
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${url}" style="display: inline-block; padding: 14px 28px; background-color: #1a73e8; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
          📄 Review & Sign Consent Form
        </a>
      </div>

      <!-- Expiry Notice -->
      <p style="font-size: 14px; color: #888; text-align: center;">
        ⏳ <strong>Note:</strong> This link will expire in <strong>48 hours</strong>.
      </p>

      <!-- Footer -->
      <p style="font-size: 16px; color: #333;">
        If you have any questions or concerns, feel free to contact your healthcare provider.
      </p>

      <p style="font-size: 16px; color: #333;">Thank you,<br/>The Healthcare Team</p>
    </div>

    <!-- Optional footer branding -->
    <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 13px; color: #777;">
      © ${new Date().getFullYear()} VARN DIGIHEALTH. All rights reserved.
    </div>
  </div>
</div>

  `;
  const sql1 = `INSERT INTO patient_consent_tokens (patient_id, consent_token) VALUES (?, ?)`;
  const [result] = await connection.query(sql1, [values.patientId, token]);
  // const htmlContent = getHTMLConsent(emailvalues);
  if (email) {
    email = "adityapohane3989@gmail.com"; //testing
    mailSender(
      email,
      "Secure Document: Patient Consent Form for Your Approval",
      htmlContent
    );
    await logAudit(req, 'EMAIL_SENT', 'PATIENT_CONSENT', values.patientId, `SENT CONSENT FORM: ${values.patientId} - ${email}`);
    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
    });
  } else {
    return res.status(400).json({
      success: false,
      message: "Email not found",
    });
  }
};
const getConsentDetails = async (req, res) => {
  try {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: "Missing token",
    });
  }
  const sql1 = `SELECT * FROM patient_consent_tokens WHERE consent_token = ? and status = 0`;

  const [rows1] = await connection.query(sql1, [token]);

  if (rows1.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Link is expired or invalid",
    });
  }

  const sql = `
        SELECT pc.patient_id,up.phone,up.dob,up.address_line,up.address_line_2,up.city,up.state,up.country,up.zip, pc.created_at, up.firstname, up.lastname,up.service_type,up.work_email, CONCAT(up2.firstname, " ", up2.lastname) AS doctorname,
        up2.phone as doctorPhone,
        up2.work_email as doctorEmail,
        up2.address_line as doctorAddress1,
        up2.address_line_2 as doctorAddress2,
        up2.city as doctorCity,
        up2.state as doctorState,
        up2.country as doctorCountry,
        up2.zip as doctorZipcode,
        pp.practice_name as practiceName,
        pp.address_line1 as practiceAddress1,
        pp.address_line2 as practiceAddress2,
        pp.city as practiceCity,
        pp.state as practiceState,
        pp.zip as practiceZipcode,
        pp.country as practiceCountry
        FROM patient_consent_tokens pc
        JOIN users_mappings um ON um.user_id = pc.patient_id
        LEFT JOIN provider_practices pp ON pp.provider_id = um.fk_physician_id
        LEFT JOIN user_profiles up ON up.fk_userid = pc.patient_id
        LEFT JOIN user_profiles up2 ON up2.fk_userid = um.fk_physician_id
        WHERE pc.consent_token = ?
        `;
  const [rows] = await connection.query(sql, [token]);

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Link is expired or invalid",
    });
  }

  const consent = rows[0]
  const services = consent.service_type;
  const servicesNamed = services
    ?.filter((service) => service)
    .map((service) => {
      if (service == 1) return "RPM";
      if (service == 2) return "CCM";
      if (service == 3) return "PCM";
      return null;
    })
    .filter(Boolean);
  const emailvalues = {
    // Patient Info
    firstName: consent.firstname,
    lastName: consent.lastname,
    email: consent.work_email,
    phone: consent.phone,
    dob: consent.dob,
    address1: consent.address_line,
    address2: consent.address_line_2,
    city: consent.city,
    state: consent.state,
    country: consent.country,
    zipcode: consent.zip,

    // Provider Info
    doctorName: consent.doctorname,
    providerPhone: consent.doctorPhone || "",
    providerEmail: consent.doctorEmail || "",
    providerAddress1: consent.doctorAddress1 || "",
    providerCity: consent.doctorCity || "",
    providerState: consent.doctorState || "",
    providerZip: consent.doctorZipcode || "",

    //Practice Info
    practiceName: consent.practiceName || "",
    practiceAddress1: consent.practiceAddress1 || "",
    practiceAddress2: consent.practiceAddress2 || "",
    practiceCity: consent.practiceCity || "",
    practiceState: consent.practiceState || "",
    practiceZip: consent.practiceZipcode || "",
    practiceCountry: consent.practiceCountry || "",

    // Selected Services
    services: servicesNamed,
  };
  const createdTime = new Date(consent.created);
  const now = new Date();
  const timeDiff = (now - createdTime) / (1000 * 60 * 60); // hours

  if (timeDiff > 48) {
    return res.status(410).send("<h3>Consent link has expired.</h3>");
  }

  return res.status(200).json({
    success: true,
    data: emailvalues,
  });
} catch (error) {
  console.error("Error in consent form submission:", error);
  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
};

const submitConsentForm = async (req, res) => {
  try {
    const values = { ...req.body, ...req.query };
    const { token, htmlContent } = values;
    // console.log(values)

    if (!token || !htmlContent) {
      return res.status(400).json({
        success: false,
        message: "Missing token or HTML content",
      });
    }

    // Check token validity
    const [rows] = await connection.query(
      `SELECT * FROM patient_consent WHERE consent_token = ?`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Link is expired or invalid",
      });
    }
    // Replace the Submit button's text and disable it in the HTML
    const updatedHtmlContent = htmlContent.replace(
      /<button[\s\S]*?class=(["'])[^"']*submit-button[^"']*\1[\s\S]*?>[\s\S]*?<\/button>/i,
      '<button class="submit-button" disabled>✅ Submitted</button>'
    );

    // Use Puppeteer to generate styled PDF from full HTML content
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Ensure viewport to render properly
    await page.setViewport({ width: 1700, height: 2000 });

    await page.setContent(updatedHtmlContent, { waitUntil: "networkidle0" });

    // Get the height of the entire page content
    const bodyHandle = await page.$("body");
    const boundingBox = await bodyHandle.boundingBox();
    const contentHeight = boundingBox.height;
    await bodyHandle.dispose();

    // Generate a single-page PDF with adjusted height
    const pdfBuffer = await page.pdf({
      printBackground: true,
      width: "8.27in", // A4 width
      height: `${contentHeight}px`, // exact content height
      pageRanges: "1",
    });
    await browser.close();

    // Save PDF
    const fileName = `consent-${Date.now()}.pdf`;
    const pdfDirectory = path.join(__dirname, "./private-consents");
    const pdfPath = path.join(pdfDirectory, fileName);

    if (!fs.existsSync(pdfDirectory)) {
      fs.mkdirSync(pdfDirectory, { recursive: true });
    }

    fs.writeFileSync(pdfPath, pdfBuffer);

    const bucketName = process.env.BUCKET_NAME; // ✅ Replace with your bucket
    const s3Key = `documents/consents/${fileName}`;
    let s3Url = await uploadFileToS3(pdfPath, bucketName, s3Key);
    if (!s3Url) {
      s3Url = await uploadFileToS3(pdfPath, bucketName, s3Key);
    } else {
      // fs.unlinkSync(pdfPath);
    }
    // console.log(s3Url)
    // Update status
    await connection.query(
      `UPDATE patient_consent SET status = 1, received = CURRENT_TIMESTAMP,s3_bucket_url_rpm = ? WHERE consent_token = ?`,
      [s3Url, token]
    );
    await logAudit(req, 'PDF_GENERATED', 'PATIENT_CONSENT', values.patientId, `SUBMITTED CONSENT FORM Token/PatientID: ${rows[0].patient_id || values.token}`);
    return res.status(200).json({
      success: true,
      message: "Consent form submitted and PDF saved successfully",
    });
  } catch (err) {
    console.error("Error in consent form submission:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
const uploadConsentForms = async (req, res) => {
  try {
    const file = req.files?.pdf;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
        error: "Please upload a PDF file",
      });
    }

    // Validate size
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "File too large",
        error: "File size exceeds 5MB",
      });
    }

    const { token,consentType } = { ...req.body, ...req.query,...req.user };
    console.log(req.body,req.query,req.user)
    if (!token || !consentType) {
      return res.status(400).json({
        success: false,
        message: "Missing token or consent type",
      });
    }
    const [rows] = await connection.query(
      `SELECT * FROM patient_consent_tokens WHERE consent_token = ?`,
      [token]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Link is expired or invalid",
      });
    }
    const user_id = rows[0].patient_id;

    const tempPath = file.tempFilePath;
    const fileName = `documents/consents/${Date.now()}_${file.name}`;

    const aws_url = await uploadFileToS3(tempPath, process.env.BUCKET_NAME, fileName);

    // Save to DB
    const [result] = await connection.execute(
      `INSERT INTO patient_consent (patient_id, s3_bucket_url_rpm,consent_type) VALUES (?, ?,?)`,
      [user_id, aws_url,consentType]
    );

    // Remove temp file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    // Optional: audit logging
    await logAudit(req, 'CREATE', `PATIENT_CONSENT-${consentType}`, user_id, `Consent form uploaded to s3.`);

    res.status(200).json({
      success: true,
      message: 'Consent form uploaded successfully',
    });

  } catch (err) {
    console.error("Agreement upload error:", err);

    try {
      if (req.files?.pdf?.tempFilePath && fs.existsSync(req.files.pdf.tempFilePath)) {
        fs.unlinkSync(req.files.pdf.tempFilePath);
      }
    } catch (cleanupErr) {
      console.error("File cleanup error:", cleanupErr);
    }

    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: err.message,
    });
  }
};
module.exports = {
  sendConsentEmail,
  getConsentDetails,
  submitConsentForm,
  uploadConsentForms
};
const getHTMLConsent = (values) => {
  const htmlContent = `
    <!DOCTYPE html>
  <html lang="en">
  
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Patient Consent Form</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', sans-serif;
    background: #f8f9fa;
    color: #212529;
    min-height: 100vh;
    padding: 40px 20px;
  }

  .container {
    max-width: 900px;
    margin: 0 auto;
    background: #ffffff;
    border: 1px solid #dee2e6;
    border-radius: 12px;
    box-shadow: 0 0 0.5rem rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }

  .header {
    background: #e0e7ff;
    color: #1e293b;
    padding: 30px 20px;
    text-align: center;
  }

  .header-icon {
    width: 60px;
    height: 60px;
    background: #c7d2fe;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    margin: 0 auto 20px;
  }

  .header h1 {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .header p {
    font-size: 16px;
    color: #334155;
  }

  .form-section {
    padding: 32px;
  }

  .section-card {
    background: #fdfdfd;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  }

  .section-header {
    background: #f1f5f9;
    padding: 16px 24px;
    border-bottom: 1px solid #e2e8f0;
  }

  .section-title {
    font-size: 18px;
    font-weight: 600;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .section-description {
    color: #6b7280;
    font-size: 14px;
    margin-top: 4px;
  }

  .section-content {
    padding: 24px;
  }

  .form-row {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .form-row > div {
    width: 48%;
  }

  .form-row p {
    font-size: 15px;
    margin-bottom: 10px;
    color: #374151;
  }

  .form-row > div:first-child {
    text-align: left;
  }

  .form-row > div:last-child {
    text-align: right;
  }

  ul {
    list-style: disc;
    padding-left: 20px;
    font-size: 15px;
    color: #374151;
  }

  .checkbox-group {
    background: #f8fafc;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 14px 18px;
    margin-bottom: 20px;
  }

  .checkbox-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .checkbox-input {
    width: 18px;
    height: 18px;
    margin-top: 3px;
    accent-color: #4b5563;
  }

  .checkbox-label {
    font-weight: 600;
    font-size: 15px;
    color: #1f2937;
    margin-bottom: 4px;
  }

  .checkbox-description {
    font-size: 14px;
    color: #6b7280;
    margin-top: 2px;
  }

  .submit-section {
    text-align: center;
    padding: 30px 24px;
    background: #f9fafb;
  }

  .submit-button {
    background: #4b5563;
    color: white;
    border: none;
    padding: 12px 28px;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    margin-top: 2rem;
  }

  .disclaimer {
    margin-top: 20px;
    font-size: 13px;
    color: #6b7280;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    text-align: center;
  }

  @media (max-width: 768px) {
    .form-row {
      flex-direction: column;
    }

    .form-row > div {
      width: 100%;
      text-align: left !important;
    }
    .signature-box {
      display: block;
      margin: 0 auto;
      max-width: 100%;
    }
  }
</style>

</head>
  <body>
    <div class="container">
      <div class="header">
        <div class="header-icon">🛡️</div>
        <h1>Patient Consent Form</h1>
        <p>Please review your information and provide consent for treatment.</p>
      </div>
  
      <form id="consentForm" method="post" novalidate>
        <div class="form-section">
  
          <!-- Patient & Provider Info -->
          <div class="section-card">
            <div class="section-header">
              <div class="section-title">👤 Patient & 🩺 Provider Details</div>
              <div class="section-description">
                Contact and identity details of both parties
              </div>
            </div>
         <div class="section-content">
  <div class="form-row" style="display: flex; justify-content: space-between; align-items: flex-start;">
    <!-- Patient Info - Left Aligned -->
    <div style="width: 48%; text-align: left;">
      <p>${values.firstName} ${values.lastName}</p>
      <p>${values.dob}</p>
      <p>${values.phone}</p>
      <p>${values.email}</p>
      <p>${values.address1},${values.address2 || ""}</p>
      <p>${values.city} ${values.state} ${values.country}</p>
      <p>${values.zipcode}</p>
    </div>

    <!-- Provider Info - Right Aligned -->
    <div style="width: 48%; text-align: right;">
      <p>${values.doctorName || ""}</p>
      <p>${values.providerPhone || ""}</p>
      <p>${values.providerEmail || ""}</p>
      <p>${values.providerAddress1 || ""}</p>
      <p>${values.providerCity || ""} ${values.providerState || ""} ${
    values.providerCountry || ""
  }</p>
      <p>${values.providerZip}</p>
    </div>
  </div>
</div>

          </div>
  
          <!-- Services Section -->
          <div class="section-card">
            <div class="section-header">
              <div class="section-title">🧾 Selected Services</div>
              <div class="section-description">
                Services applicable to the patient
              </div>
            </div>
            <div class="section-content">
              <ul style="list-style-type: disc; padding-left: 20px;">
                ${
                  values.services?.includes("RPM")
                    ? "<li><strong>RPM</strong> (Remote Patient Monitoring)</li>"
                    : ""
                }
                ${
                  values.services?.includes("CCM")
                    ? "<li><strong>CCM</strong> (Chronic Care Management)</li>"
                    : ""
                }
                ${
                  values.services?.includes("PCM")
                    ? "<li><strong>PCM</strong> (Principal Care Management)</li>"
                    : ""
                }
              </ul>
            </div>
          </div>
  
<!-- Consent Checkboxes -->
<div class="section-card">
  <div class="section-header">
    <div class="section-title">✅ Patient Consent Acknowledgments</div>
    <div class="section-description">
      Please review and confirm your understanding by checking all applicable boxes.
    </div>
  </div>
  <div class="section-content">
    ${[
      {
        id: "insuranceWaiver",
        label: "Insurance Waiver",
        desc: "I acknowledge that I am choosing not to utilize any insurance coverage for this visit. I understand and agree that I am personally and fully responsible for the payment of all medical services rendered during this encounter. I waive the right to submit any claims to my insurance provider and accept responsibility for any and all charges incurred."
      },
      {
        id: "telemedicineConsent",
        label: "Telemedicine Consent",
        desc: "I hereby consent to receive healthcare services through telemedicine technology, which may include audio, video, or other electronic communications. I understand that telemedicine allows for remote diagnosis and treatment, and I acknowledge that the same privacy and confidentiality protections apply as with in-person visits. I have the right to refuse or discontinue telemedicine services at any time without affecting my future care or treatment."
      },
      {
        id: "privacyPractices",
        label: "Notice of Privacy Practices",
        desc: "I acknowledge that I have been provided access to the provider’s Notice of Privacy Practices, which outlines how my personal health information (PHI) may be used and disclosed under the Health Insurance Portability and Accountability Act (HIPAA). I understand my rights regarding my PHI and know how to access further information or file a complaint if I have concerns."
      },
      {
        id: "consentForTreatment",
        label: "Consent for Treatment",
        desc: "I voluntarily consent to receive medical evaluation, diagnosis, and treatment from the healthcare provider. I understand that this may include physical examinations, diagnostic testing, and therapeutic procedures as deemed necessary for my care. I acknowledge that I have the right to ask questions and decline any part of the proposed treatment plan."
      },
      {
        id: "creditCardAuthorization",
        label: "Credit Card Authorization",
        desc: "I authorize the provider to securely store and charge my credit card for medical services rendered, including but not limited to co-pays, deductibles, non-covered services, and any outstanding balances. I understand that this authorization will remain in effect until I notify the provider in writing to revoke it, and that I will receive a receipt for each charge made."
      }
    ].map(
        (item) => `
        <div class="checkbox-group">
          <div class="checkbox-item">
            <input type="checkbox" id="${item.id}" name="${item.id}" class="checkbox-input" required />
            <div>
              <label class="checkbox-label" for="${item.id}">
                ${item.label} <span class="required">*</span>
              </label>
              <div class="checkbox-description">${item.desc}</div>
            </div>
          </div>
        </div>
      `
      )
      .join("")}
  </div>
</div>

          
                  <!-- Signature Section -->
          <div class="section-card">
            <div class="section-header">
              <div class="section-title">✍️ Patient Signature</div>
              <div class="section-description">Please sign below to confirm your consent</div>
            </div>
            <div class="section-content">
              <div style="border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; background: #f8fafc;">
                <canvas id="signature-pad"
  style="width: 100%; height: 200px; border: 2px dashed #94a3b8; border-radius: 8px; background: white; touch-action: none;"></canvas>
                <div style="text-align: right; margin-top: 10px;">
                  <button type="button" id="clear-signature"
                    style="padding: 6px 12px; border: none; background-color: #ef4444; color: white; border-radius: 6px; cursor: pointer;">Clear</button>
                </div>
                <input type="hidden" name="signatureData" id="signatureData" />
              </div>
            </div>
          </div>
          <!-- Submit -->
          <div class="submit-section" style="text-align:center; padding:30px;">
            <button type="submit" class="submit-button">
              ✅ Submit Consent Form
            </button>
            <div class="disclaimer">
              <p>
                By submitting this form, you confirm the above information is accurate and complete.
                The form is HIPAA compliant and securely stored.
              </p>
            </div>
          </div>
  
        </div>
      </form>
    <!-- Electronically Generated -->
    <div style="background-color:rgb(255, 255, 255); padding: 15px; text-align: center; font-size: 13px; color: #777;">
      Electronically Generated on  ${moment().format("MM-DD-YYYY HH:mm:ss")} 
    </div>            
    <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 13px; color: #777;">
      © ${moment().format("YYYY")} VARN DIGIHEALTH. All rights reserved.
    </div>
    </div>

<script src="/js/libs/signature_pad.umd.min.js"></script>
<script src="/js/consent-form.js"></script>


  </body>
  </html>
  `;
  return htmlContent;
};

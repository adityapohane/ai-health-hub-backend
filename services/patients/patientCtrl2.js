const connection = require("../../config/db");
const logAudit = require("../../utils/logAudit");
const mailSender = require("../../utils/mailSender");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const uploadFileToS3 = require("../../utils/s3Upload");

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
  const sql1 = `INSERT INTO patient_consent (patient_id, consent_token,consent_url) VALUES (?, ?, ?)`;
  const [result] = await connection.query(sql1, [values.patientId, token, url]);
  // const htmlContent = getHTMLConsent(emailvalues);
  if (email) {
    email = "adityapohane3989@gmail.com";
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
const getConsentForm = async (req, res) => {
  const { token } = req.query;

  const sql = `
        SELECT pc.patient_id,up.phone,up.dob,up.address_line,up.address_line_2,up.city,up.state,up.country,up.zip, pc.created, up.firstname, up.lastname,up.service_type,up.work_email, CONCAT(up2.firstname, " ", up2.lastname) AS doctorname,
        up2.phone as doctorPhone,
        up2.work_email as doctorEmail,
        up2.address_line as doctorAddress1,
        up2.address_line_2 as doctorAddress2,
        up2.city as doctorCity,
        up2.state as doctorState,
        up2.country as doctorCountry,
        up2.zip as doctorZipcode
        FROM patient_consent pc
        JOIN users_mappings um ON um.user_id = pc.patient_id
        LEFT JOIN user_profiles up ON up.fk_userid = pc.patient_id
        LEFT JOIN user_profiles up2 ON up2.fk_userid = um.fk_physician_id
        WHERE pc.consent_token = ?
        `;
  const [rows] = await connection.query(sql, [token]);

  if (rows.length === 0) {
    return res.status(404).send("<h3>Invalid or expired token.</h3>");
  }

  const consent = rows[0];
  // let emailvalues = {
  //     firstName: consent.firstname,
  //     lastName: consent.lastname,
  //     doctorName: consent.doctorname,
  //     patientId: consent.patientId,
  // }
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

    // Selected Services
    services: servicesNamed,
  };

  const htmlContent = getHTMLConsent(emailvalues);

  const createdTime = new Date(consent.created);
  const now = new Date();
  const timeDiff = (now - createdTime) / (1000 * 60 * 60); // hours

  if (timeDiff > 48) {
    return res.status(410).send("<h3>Consent link has expired.</h3>");
  }

  res.send(htmlContent);
};

const submitConsentForm = async (req, res) => {
  try {
    const values = { ...req.body, ...req.query };
    const { token, htmlContent } = values;

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
    await logAudit(req, 'PDF_GENERATED', 'PATIENT_CONSENT', values.patientId, `SUBMITTED CONSENT FORM: ${values.patientId} - ${email}`);
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

module.exports = {
  sendConsentEmail,
  getConsentForm,
  submitConsentForm,
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
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(to right, #f0f4f8, #d9e2ec);
      min-height: 100vh;
      padding: 40px 20px;
      color: #1f2937;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #3b82f6, #06b6d4);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }

    .header-icon {
      width: 70px;
      height: 70px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      margin: 0 auto 20px;
    }

    .header h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 10px;
    }

    .header p {
      font-size: 18px;
      opacity: 0.95;
    }

    .form-section {
      padding: 40px;
    }

    .section-card {
      background: #f9fafb;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
      
    }

    .section-header {
      background: #eff6ff;
      padding: 20px 30px;
      border-bottom: 1px solid #dbeafe;
    }

    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #2563eb;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .section-description {
      color: #475569;
      font-size: 14px;
      margin-top: 6px;
    }

    .section-content {
      padding: 30px;
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
    }

    .checkbox-group {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 20px;
    }

    .checkbox-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .checkbox-input {
      width: 18px;
      height: 18px;
      margin-top: 4px;
      accent-color: #2563eb;
    }

    .checkbox-label {
      font-weight: 600;
      font-size: 15px;
      color: #1e293b;
      margin-bottom: 6px;
    }

    .checkbox-description {
      font-size: 14px;
      color: #64748b;
      margin-top: 4px;
    }

    .submit-section {
      text-align: center;
      padding: 40px 30px;
      background: #f8fafc;
    }

    .submit-button {
      background: linear-gradient(to right, #3b82f6, #06b6d4);
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .submit-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(59, 130, 246, 0.4);
    }

    .disclaimer {
      margin-top: 20px;
      font-size: 13px;
      color: #64748b;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    @media (max-width: 768px) {
      .form-row {
        flex-direction: column;
      }

      .form-row > div {
        width: 100%;
        text-align: left !important;
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
      <p>${values.doctorName}</p>
      <p>${values.providerPhone}</p>
      <p>${values.providerEmail}</p>
      <p>${values.providerAddress1}</p>
      <p>${values.providerCity} ${values.providerState} ${
    values.providerCountry
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
              <div class="section-title">✅ Consent & Authorization</div>
              <div class="section-description">
                Please review and confirm your consent
              </div>
            </div>
            <div class="section-content">
              ${[
                {
                  id: "treatmentConsent",
                  label: "Treatment Consent",
                  desc: "I consent to receive medical treatment and understand the risks, benefits, and alternatives have been explained to me.",
                },
                {
                  id: "privacyConsent",
                  label: "Privacy Policy Acknowledgment",
                  desc: "I acknowledge that I have read and understand the privacy policy and how my personal health information will be used and protected.",
                },
                {
                  id: "dataProcessingConsent",
                  label: "Data Processing Consent",
                  desc: "I consent to the processing of my personal data for medical care purposes, insurance claims, and healthcare coordination.",
                },
                {
                  id: "communicationConsent",
                  label: "Communication Consent (Optional)",
                  desc: "I consent to receive appointment reminders, health information, and marketing communications via email or text message.",
                },
              ]
                .map(
                  (item) => `
                <div class="checkbox-group">
                  <div class="checkbox-item">
                    <input type="checkbox" id="${item.id}" name="${
                    item.id
                  }" class="checkbox-input" ${
                    item.id !== "communicationConsent" ? "required" : ""
                  } />
                    <div>
                      <label class="checkbox-label" for="${item.id}">
                        ${item.label}${
                    item.id !== "communicationConsent"
                      ? ' <span class="required">*</span>'
                      : ""
                  }
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

    <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 13px; color: #777;">
      © ${new Date().getFullYear()} VARN DIGIHEALTH. All rights reserved.
    </div>
    </div>

    <script src="/js/consent-form.js"></script>
  </body>
  </html>
  `;
  return htmlContent;
};

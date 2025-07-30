const connection = require("../../config/db");
const logAudit = require("../../utils/logAudit");
const mailSender = require("../../utils/mailSender");
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const uploadFileToS3 = require("../../utils/s3Upload");

const sendConsentEmail = async (req,res) => {
    const values = { ...req.body, ...req.query };
    const sql = `SELECT um.user_id AS patient_id,um.fk_physician_id,up.firstname,up.lastname,CONCAT(up2.firstname," ",up2.lastname) as doctorname,up.work_email from users_mappings um LEFT JOIN user_profiles up ON up.fk_userid = um.user_id LEFT JOIN user_profiles up2 ON up2.fk_userid = um.fk_physician_id  where user_id = ${values.patientId} and fk_role_id = 7`;
    const [patient] = await connection.query(sql);
    if(patient.length === 0){
        return res.status(400).json({
            success: false,
            message: "Patient not found",
        });
    }
    const details =patient?patient[0]:{};
    let email = details.work_email;
    let emailvalues = {
        firstName: details.firstname,
        lastName: details.lastname,
        doctorName: details.doctorname,
        patientId: details.patientId,
    }
    const token = uuidv4();
    const url = `http://localhost:8000/api/v1/ehr/consent-form?token=${token}`;

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <p>Dear <strong>${emailvalues.firstName}</strong>,</p>

      <p>You have been requested to provide consent by <strong>${emailvalues.doctorName}</strong>.</p>

      <p>Please click the link below to review and sign the consent form:</p>

      <p>
        👉 <a href="${url}" style="color: #1a73e8;">Review and Sign Consent Form</a>
      </p>

      <p>This link will expire in 24 hours.</p>

      <p>Thank you,<br/>Healthcare Team</p>
    </div>
  `;
    const sql1 = `INSERT INTO patient_consent (patient_id, consent_token,consent_url) VALUES (?, ?, ?)`;
    const [result] = await connection.query(sql1, [values.patientId, token, url]);
    // const htmlContent = getHTMLConsent(emailvalues);
if(email){
email = "adityapohane3989@gmail.com"
   mailSender(email,"Secure Document: Patient Consent Form for Your Approval",htmlContent)
   return res.status(200).json({
    success: true,
    message: "Email sent successfully",
});
}else{
    return res.status(400).json({
        success: false,
        message: "Email not found",
    });
}
  };
    const getConsentForm = async (req, res) => {
        const { token } = req.query;
    
        const sql = `
        SELECT pc.patient_id, pc.created, up.firstname, up.lastname, CONCAT(up2.firstname, " ", up2.lastname) AS doctorname
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
        let emailvalues = {
            firstName: consent.firstname,
            lastName: consent.lastname,
            doctorName: consent.doctorname,
            patientId: consent.patientId,
        }
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
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        
            const page = await browser.newPage();
        
            // Ensure viewport to render properly
            await page.setViewport({ width: 1280, height: 800 });
        
            // If content already includes DOCTYPE and <html> structure, use as-is
            await page.setContent(updatedHtmlContent, { waitUntil: 'networkidle0' });
        
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
            });
        
            await browser.close();
        
            // Save PDF
            const fileName = `consent-${Date.now()}.pdf`;
            const pdfDirectory = path.join(__dirname, './private-consents');
            const pdfPath = path.join(pdfDirectory, fileName);
        
            if (!fs.existsSync(pdfDirectory)) {
                fs.mkdirSync(pdfDirectory, { recursive: true });
            }
        
            fs.writeFileSync(pdfPath, pdfBuffer);
        
            const bucketName = process.env.BUCKET_NAME; // ✅ Replace with your bucket
            const s3Key = `documents/consents/${fileName}`;
            let s3Url = await uploadFileToS3(pdfPath, bucketName, s3Key);
            if(!s3Url){
                s3Url = await uploadFileToS3(pdfPath, bucketName, s3Key);
            }else{
                fs.unlinkSync(pdfPath);
            }
            // console.log(s3Url)
            // Update status
            await connection.query(
                `UPDATE patient_consent SET status = 1, received = CURRENT_TIMESTAMP,s3_bucket_url_rpm = ? WHERE consent_token = ?`,
                [s3Url,token]
            );
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
    submitConsentForm
  };
  const getHTMLConsent = (values) => {
    const htmlContent = `
    <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Patient Consent Form</title>
 <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            min-height: 100vh;
            padding: 20px;
            line-height: 1.6;
            color: #1e293b;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px -2px rgba(59, 130, 246, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #3b82f6, #06b6d4);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        
        .header-icon {
            width: 60px;
            height: 60px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            font-size: 24px;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .form-section {
            margin: 30px;
        }
        
        .section-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 24px;
            overflow: hidden;
            box-shadow: 0 2px 10px -2px rgba(15, 23, 42, 0.08);
        }
        
        .section-header {
            background: linear-gradient(90deg, rgba(59, 130, 246, 0.05), rgba(6, 182, 212, 0.05));
            padding: 20px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #3b82f6;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
        }
        
        .section-description {
            color: #64748b;
            font-size: 14px;
        }
        
        .section-content {
            padding: 24px;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 16px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            font-weight: 500;
            margin-bottom: 6px;
            color: #374151;
            font-size: 14px;
        }
        
        .required {
            color: #ef4444;
        }
        
        .form-input {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            transition: all 0.2s ease;
            background: #ffffff;
        }
        
        .form-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .form-input.prefilled {
            background: rgba(219, 234, 254, 0.3);
        }
        
        .checkbox-group {
            background: rgba(219, 234, 254, 0.2);
            border: 1px solid rgba(219, 234, 254, 0.3);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
        }
        
        .checkbox-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }
        
        .checkbox-input {
            width: 18px;
            height: 18px;
            margin-top: 2px;
            accent-color: #3b82f6;
        }
        
        .checkbox-label {
            font-weight: 500;
            font-size: 14px;
            color: #374151;
            margin-bottom: 4px;
        }
        
        .checkbox-description {
            font-size: 13px;
            color: #64748b;
            line-height: 1.5;
        }
        
        .submit-section {
            text-align: center;
            padding: 30px;
            background: #f8fafc;
        }
        
        .submit-button {
            background: linear-gradient(135deg, #3b82f6, #06b6d4);
            color: white;
            border: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 20px -2px rgba(59, 130, 246, 0.3);
        }
        
        .submit-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 25px -2px rgba(59, 130, 246, 0.4);
        }
        
        .disclaimer {
            margin-top: 20px;
            font-size: 12px;
            color: #64748b;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .error-message {
            color: #ef4444;
            font-size: 12px;
            margin-top: 4px;
            display: none;
        }
        
        .form-input:invalid {
            border-color: #ef4444;
        }
        
        .form-input:invalid + .error-message {
            display: block;
        }
        
        @media (max-width: 768px) {
            .form-row {
                grid-template-columns: 1fr;
            }
            
            .container {
                margin: 10px;
            }
            
            .form-section {
                margin: 20px;
            }
        }
    </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-icon">🛡️</div>
      <h1>Patient Consent Form</h1>
      <p>Please review your information and provide consent for treatment.</p>
    </div>

    <!-- Form -->
    <form id="consentForm" method="post" novalidate>
      <div class="form-section">
        <!-- Patient Information Section -->
        <div class="section-card">
          <div class="section-header">
            <div class="section-title">👤 Patient Information</div>
            <div class="section-description">
              Patient and doctor information for this consent form
            </div>
          </div>
          <div class="section-content">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="firstName">First Name</label>
                <input type="text" id="firstName" name="firstName" class="form-input prefilled" value="${values.firstName}" readonly />
              </div>

              <div class="form-group">
                <label class="form-label" for="lastName">Last Name</label>
                <input type="text" id="lastName" name="lastName" class="form-input prefilled" value="${values.lastName}" readonly />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="doctorName">Doctor Name</label>
              <input type="text" id="doctorName" name="doctorName" class="form-input prefilled" value="${values.doctorName}" readonly />
            </div>
          </div>
        </div>

        <!-- Consent Section -->
        <div class="section-card">
          <div class="section-header">
            <div class="section-title">✅ Consent & Authorization</div>
            <div class="section-description">
              Please read and acknowledge the following statements
            </div>
          </div>
          <div class="section-content">
            <!-- Consent checkboxes (unchanged) -->
            <div class="checkbox-group">
              <div class="checkbox-item">
                <input type="checkbox" id="treatmentConsent" name="treatmentConsent" class="checkbox-input" required />
                <div>
                  <label class="checkbox-label" for="treatmentConsent">
                    Treatment Consent <span class="required">*</span>
                  </label>
                  <div class="checkbox-description">
                    I consent to receive medical treatment and understand the
                    risks, benefits, and alternatives have been explained to me.
                  </div>
                </div>
              </div>
            </div>

            <div class="checkbox-group">
              <div class="checkbox-item">
                <input type="checkbox" id="privacyConsent" name="privacyConsent" class="checkbox-input" required />
                <div>
                  <label class="checkbox-label" for="privacyConsent">
                    Privacy Policy Acknowledgment <span class="required">*</span>
                  </label>
                  <div class="checkbox-description">
                    I acknowledge that I have read and understand the privacy
                    policy and how my personal health information will be used and
                    protected.
                  </div>
                </div>
              </div>
            </div>

            <div class="checkbox-group">
              <div class="checkbox-item">
                <input type="checkbox" id="dataProcessingConsent" name="dataProcessingConsent" class="checkbox-input" required />
                <div>
                  <label class="checkbox-label" for="dataProcessingConsent">
                    Data Processing Consent <span class="required">*</span>
                  </label>
                  <div class="checkbox-description">
                    I consent to the processing of my personal data for medical
                    care purposes, insurance claims, and healthcare coordination.
                  </div>
                </div>
              </div>
            </div>

            <div class="checkbox-group">
              <div class="checkbox-item">
                <input type="checkbox" id="communicationConsent" name="communicationConsent" class="checkbox-input" />
                <div>
                  <label class="checkbox-label" for="communicationConsent">
                    Communication Consent (Optional)
                  </label>
                  <div class="checkbox-description">
                    I consent to receive appointment reminders, health
                    information, and marketing communications via email or text
                    message.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Submit Section -->
      <div class="submit-section">
        <button type="submit" class="submit-button">
          ✅ Submit Consent Form
        </button>
        <div class="disclaimer">
          <p>
            By submitting this form, you acknowledge that all information
            provided is accurate and complete. This form is securely encrypted
            and HIPAA compliant. If you have any questions, please contact our
            office.
          </p>
        </div>
      </div>
    </form>
  </div>

  <!-- ✅ Fixed Script -->
<script src="/js/consent-form.js"></script>

</body>
</html>

`; 
return htmlContent;
  }


const mailSender = require("../../utils/mailSender");
const connection = require("../../config/db");
const bcrypt = require("bcryptjs");
const logAudit = require("../../utils/logAudit");

const sendIntake = async (req, res) => {
  try {
    const { email, url } = req.body;

    if (!email || !url) {
      return res.status(400).json({
        success: false,
        message: "Email and URL are required"
      });
    }

    await mailSender(
      email,
      "Patient Intake Form",
      `Your link to fill the patient intake form: ${url}. Please click this link to continue.`
    );

    return res.status(200).json({
      success: true,
      message: "Intake form link sent successfully"
    });
  } catch (error) {
    console.error("Error sending intake email:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send intake link"
    });
  }
};

const registerPatient = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      email,
      phone,
      gender,
      status,
      birthDate,
      lastVisit,
      emergencyContact,
      ethnicity,
      height,
      weight,
      bmi,
      allergies,
      bloodPressure,
      heartRate,
      temperature,
      insurance,
      currentMedications,
      diagnosis,
      notes,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      zipCode,
      organizationId,
      practiceId,
      nurseId,
      patientService,
      providerId: user_id
    } = req.body;
    let password = `${firstName}@hub`;

    const [rows] = await connection.execute(
      'SELECT 1 FROM users WHERE username = ? LIMIT 1',
      [email]
    );
    if (rows.length > 0) {
      return res.status(401).send({ success: false, message: 'email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const insertQuery =
      "INSERT INTO users (username, password,fk_roleid,created_user_id) VALUES (?, ?,7,?)";
    const userValue = [email, hashedPassword, user_id];
    const [result] = await connection.query(insertQuery, userValue);
    const insertedId = result.insertId;

    const sql1 = `
INSERT INTO user_profiles (
  firstname, middlename, lastname, dob, work_email, phone,
  gender, ethnicity, last_visit, emergency_contact,
  address_line, address_line_2, city, state, country, zip, service_type, status, fk_userid
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`;
    const values1 = [
      firstName,        // 1. firstname
      middleName,       // 2. middlename
      lastName,         // 3. lastname
      birthDate,        // 4. dob
      email,            // 5. work_email
      phone,            // 6. phone
      gender,           // 7. gender
      ethnicity,        // 8. ethnicity
      lastVisit,        // 9. last_visit
      emergencyContact, // 10. emergency_contact
      addressLine1,     // 11. address_line
      addressLine2,     // 12. address_line_2
      city,             // 13. city
      state,            // 14. state
      country,          // 15. country
      zipCode,          // 16. zip
      JSON.stringify(patientService), // 17. service_type
      status,           // 18. status
      insertedId        // 19. fk_userid
    ];

    const [userResult] = await connection.query(sql1, values1);





    const sql3 = `INSERT INTO patient_insurances (
      insurance_policy_number,
      insurance_group_number,
      insurance_company,
      insurance_plan,
      insurance_relationship,
      insurance_expiry,
      insurance_type,
      effective_date,
      insured_name,
      insured_gender,
      insured_dob,
      insured_address,
      insured_phone,
      fk_userid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
    insurance?.map(async (insurance) => {
      const values3 = [
        insurance.policyNumber,
        insurance.groupNumber,
        insurance.company,
        insurance.plan,
        insurance.relationship,
        insurance.expirationDate,
        insurance.type,
        insurance.effectiveDate,
        insurance.insuredName,
        insurance.insuredGender,
        insurance.insuredDOB,
        insurance.insuredAddress,
        insurance.insuredPhone,
        insertedId,
      ];
      const [insuranceResult] = await connection.query(sql3, values3);
    });

    const sql7 = `INSERT INTO users_mappings (
  organizations_id,
  practice_id,
  user_id,
  fk_role_id,
  fk_physician_id,
  fk_nurse_id
) VALUES (?, ?, ?, ?, ?, ?);`;

    const values7 = [
      organizationId ? organizationId : 0,
      practiceId ? practiceId : 0,
      insertedId,
      7,
      user_id ? user_id : 0,
      nurseId ? nurseId : 0,
    ];
    const [mappingResult] = await connection.query(sql7, values7);

    // cpt billing for rpm
    patientService?.includes(1) && await connection.query(
      `INSERT INTO cpt_billing (patient_id, cpt_code_id) VALUES (?, ?);`,
      [insertedId, 4]
    );

    await logAudit(req, 'CREATE', 'PATIENT', insertedId, `Patient created with patientId: ${insertedId} - ${firstName} ${lastName}`);
    return res.status(200).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Error creating patient:", error);
    res
      .status(500)
      .json({ success: false, message: "Error in create patient API" });
  }
};


module.exports = {
  sendIntake,
  registerPatient
}
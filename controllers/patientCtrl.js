const bcrypt = require("bcryptjs");
const connection = require("../config/db");


// Create patient
 const addPatient = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      email,
      phone,
      gender,
      status,
      address,
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
      providerId,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      zipCode,
    } = req.body;
    let password=`${firstName}@hub`
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertQuery = "INSERT INTO users (username, password,fk_roleid) VALUES (?, ?,6)";
    const userValue = [email, hashedPassword];
    const [result] = await connection.query(insertQuery, userValue);
    const insertedId = result.insertId;

    const sql1 = `
INSERT INTO user_profiles (
  firstname, middlename, lastname, dob, work_email, phone,
  gender, ethnicity, last_visit, emergency_contact,
  height, dry_weight, bmi, fk_userid, status, bp, heart_rate, temp,
  address_line,address_line_2, city, state, country, zip
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;
  
  const values1 = [
    firstName, middleName, lastName, birthDate, email, phone,         // 1–6 ✅
    gender, ethnicity, lastVisit, emergencyContact,                   // 7–10 ✅
    height, weight, bmi,                                              // 11–13 ✅
    insertedId, status,bloodPressure, heartRate, temperature, addressLine1, addressLine2, city, state, country,   zipCode,                                      // 14–16 ✅
                                 // 17–19 ✅
  ];
    
    const [userResult] = await connection.query(sql1, values1);
  
    const sql2 = `INSERT INTO allergies (category, allergen, reaction,patient_id) VALUES (?, ?, ?,?);`;
    allergies?.map(async (allergy)=>{
      const values2 = [allergy.category, allergy.allergen, allergy.reaction,insertedId];
      const [allergyResult] = await connection.query(sql2, values2);
    })

    const sql3 = `INSERT INTO patient_insurances (
  insurance_policy_number,
  insurance_group_number,
  insurance_company,
  insurance_plan,
  insurance_expiry,
  insurance_type,
  effective_date,
  fk_userid
) VALUES (?, ?, ?, ?, ?, ?, ?,?);`
    insurance?.map(async (insurance)=>{
      const values3 = [insurance.policyNumber, insurance.groupNumber, insurance.company, insurance.plan, insurance.expirationDate, insurance.type, insurance.effectiveDate,insertedId];
      const [insuranceResult] = await connection.query(sql3, values3);
    })

    const sql4 = `INSERT INTO patient_medication (
  patient_id,
  name,
  dosage,
  frequency,
  prescribedBy,
  startDate,
  endDate,
  status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`
currentMedications?.map(async (medication)=>{
      const values4 = [insertedId, medication.name, medication.dosage, medication.frequency, medication.prescribedBy, medication.startDate, medication.endDate, medication.status];
      const [medicationResult] = await connection.query(sql4, values4);
    })

    const sql5 = `INSERT INTO patient_diagnoses (
  patient_id,
  date,
  icd10,
  diagnosis,
  status
) VALUES (?, ?, ?, ?, ?);`
for (const diagnos of diagnosis || []) {
  const values5 = [
    insertedId,
    diagnos.date,
    diagnos.icd10,
    diagnos.diagnosis,
    diagnos.status
  ];
  await connection.query(sql5, values5);
}


    const sql6 = `INSERT INTO notes (
  patient_id,
  note,
  created_by
) VALUES (?, ?, ?);`
notes?.map(async (note)=>{
  const values6 = [insertedId, note.note,providerId];
  const [noteResult] = await connection.query(sql6, values6);
});

// const sql7 = `INSERT INTO users_mappings (
//   organization_id,
//   practice_id,
//   user_id,
//   role_id,
//   fk_physician_id,
//   fk_nurse_id
// ) VALUES (?, ?, ?, ?, ?);`
// const values7 = [organizationId, practiceId, insertedId, roleId, providerId,nurseId]; 
// const [mappingResult] = await connection.query(sql7, values7);
    return res.status(200).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Error creating patient:", error);
    res.status(500).json({ success: false, message: "Error in create patient API" });
  }
};

// Get all patients with pagination
const getPatientDataById = async (req, res) => {
  try {
    const { patientId } = req.query;

    // Get user profile
    const [profileRows] = await connection.query(
      `SELECT * FROM user_profiles WHERE fk_userid = ?`,
      [patientId]
    );
    const profile = profileRows[0];

    // Get user login/email info
    const [userRows] = await connection.query(
      `SELECT username FROM users WHERE user_id = ?`,
      [patientId]
    );
    const user = userRows[0];

    // Get allergies
    const [allergies] = await connection.query(
      `SELECT
        CASE category
          WHEN 1 THEN 'food'
          WHEN 2 THEN 'medication'
          WHEN 3 THEN 'envoirment'
          WHEN 4 THEN 'biological'
          ELSE NULL
        END AS category,
        allergen,
        reaction,
        id
      FROM allergies
      WHERE patient_id = ?`,
      [patientId]
    );
    

    // Get insurance
    const [insurances] = await connection.query(
      `SELECT insurance_policy_number AS policyNumber,
              insurance_group_number AS groupNumber,
              insurance_company AS company,
              insurance_plan AS plan,
              insurance_expiry AS expirationDate,
              insurance_type AS type,
              effective_date AS effectiveDate,
              patient_insurance_id
       FROM patient_insurances WHERE fk_userid = ?`,
      [patientId]
    );

    // Get medications
    const [currentMedications] = await connection.query(
      `SELECT name, dosage, frequency, prescribedBy, startDate, endDate, status ,id
       FROM patient_medication WHERE patient_id = ?`,
      [patientId]
    );

    // Get diagnoses
    const [diagnosis] = await connection.query(
      `SELECT date, icd10, diagnosis, status ,id
       FROM patient_diagnoses WHERE patient_id = ?`,
      [patientId]
    );

    // Get notes
    const [notes] = await connection.query(
      `SELECT note, created, created_by ,note_id FROM notes WHERE patient_id = ?`,
      [patientId]
    );

    // Compose full response
    const response = {
      firstName: profile.firstname,
      middleName: profile.middlename,
      lastName: profile.lastname,
      email: profile.work_email || user?.username,
      phone: profile.phone,
      gender: profile.gender,
      status: profile.status,
      address: profile.address_line,
      birthDate: profile.dob,
      lastVisit: profile.last_visit,
      emergencyContact: profile.emergency_contact,
      ethnicity: profile.ethnicity,
      height: profile.height,
      weight: profile.dry_weight,
      bmi: profile.bmi,
      bloodPressure: profile.bp,
      heartRate: profile.heart_rate,
      temperature: profile.temp,
      allergies,
      insurance: insurances,
      currentMedications,
      diagnosis,
      notes,
      createdBy: notes?.[0]?.created_by || null
    };

    return res.status(200).json({
      success: true,
      message: "Patient data fetched successfully",
      data: response
    });
  } catch (error) {
    console.error("Error fetching patient data:", error);
    res.status(500).json({ success: false, message: "Error in get patient data API" });
  }
};

const editPatientDataById = async (req, res) => {
  try {
    const {
      patientId,
      firstName,
      middleName,
      lastName,
      email,
      phone,
      gender,
      status,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      zipCode,
      birthDate,
      lastVisit,
      emergencyContact,
      ethnicity,
      height,
      weight,
      bmi,
      bloodPressure,
      heartRate,
      temperature,
      allergies,
      insurance,
      currentMedications,
      diagnosis,
      notes,
    } = req.body;

    // 1. Update user profile
    const profileQuery = `
    UPDATE user_profiles SET
      firstname = ?, middlename = ?, lastname = ?, dob = ?, work_email = ?, phone = ?,
      gender = ?, ethnicity = ?, last_visit = ?, emergency_contact = ?, height = ?,
      dry_weight = ?, bmi = ?, status = ?, address_line = ?, address_line_2 = ?, city = ?,
      state = ?, country = ?, zip = ?, bp = ?, heart_rate = ?, temp = ?
    WHERE fk_userid = ?;
  `;
  
  const profileValues = [
    firstName, middleName, lastName, birthDate, email, phone,
    gender, ethnicity, lastVisit, emergencyContact,
    height, weight, bmi, status,
    addressLine1, addressLine2, city, state, country, zipCode,
    bloodPressure, heartRate, temperature,
    patientId // for WHERE clause
  ];
    await connection.query(profileQuery, profileValues);

    // 2. Update users table (username = email)
    await connection.query(`UPDATE users SET username = ? WHERE user_id = ?`, [email, patientId]);

    // 3. Update allergies
    for (const allergy of allergies || []) {
      await connection.query(
        `UPDATE allergies SET category = ?, allergen = ?, reaction = ? WHERE id = ? AND patient_id = ?`,
        [allergy.category, allergy.allergen, allergy.reaction, allergy.id, patientId]
      );
    }

    // 4. Update insurance
    for (const ins of insurance || []) {
      await connection.query(
        `UPDATE patient_insurances SET 
          insurance_policy_number = ?, insurance_group_number = ?, insurance_company = ?,
          insurance_plan = ?, insurance_expiry = ?, insurance_type = ?, effective_date = ?
         WHERE patient_insurance_id = ? AND fk_userid = ?`,
        [
          ins.policyNumber, ins.groupNumber, ins.company,
          ins.plan, ins.expirationDate, ins.type, ins.effectiveDate,
          ins.patient_insurance_id, patientId
        ]
      );
    }

    // 5. Update medications
    for (const med of currentMedications || []) {
      await connection.query(
        `UPDATE patient_medication SET
          name = ?, dosage = ?, frequency = ?, prescribedBy = ?, startDate = ?, endDate = ?, status = ?
         WHERE id = ? AND patient_id = ?`,
        [
          med.name, med.dosage, med.frequency, med.prescribedBy,
          med.startDate, med.endDate, med.status, med.id, patientId
        ]
      );
    }

    // 6. Update diagnosis
    for (const diag of diagnosis || []) {
      await connection.query(
        `UPDATE patient_diagnoses SET
          date = ?, icd10 = ?, diagnosis = ?, status = ?
         WHERE id = ? AND patient_id = ?`,
        [diag.date, diag.icd10, diag.diagnosis, diag.status, diag.id, patientId]
      );
    }

    // 7. Update notes
    for (const note of notes || []) {
      await connection.query(
        `UPDATE notes SET note = ? WHERE note_id = ? AND patient_id = ?`,
        [note.note, note.note_id, patientId]
      );
    }

    return res.status(200).json({
      success: true,
      message: "Patient data updated successfully"
    });

  } catch (error) {
    console.error("Error updating patient data:", error);
    res.status(500).json({ success: false, message: "Error in edit patient data API" });
  }
};
const getAllPatients = async (req, res) => {
 
  try {
    let { page = 1, limit = 10, order = "DESC", orderBy = "last_visit" } = req.query;
console.log(req)
    // Convert and sanitize inputs
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    // Safelist to avoid SQL injection on columns
    const allowedOrderBy = [
      "firstname", "lastname", "dob", "gender", "ethnicity",
      "last_visit", "height", "dry_weight", "bmi", "bp", "heart_rate", "temp"
    ];
    const allowedOrder = ["ASC", "DESC"];

    if (!allowedOrderBy.includes(orderBy)) orderBy = "last_visit";
    if (!allowedOrder.includes(order.toUpperCase())) order = "DESC";

    // Fetch paginated patient data
    const [patients] = await connection.query(
      `SELECT 
        fk_userid AS patientId,
        firstname, middlename, lastname,
        dob AS birthDate,
        work_email AS email,
        phone,
        gender,
        ethnicity,
        last_visit AS lastVisit,
        emergency_contact AS emergencyContact,
        height, dry_weight AS weight, bmi,
        bp AS bloodPressure,
        heart_rate AS heartRate,
        temp AS temperature,
        status,
        address_line AS address
      FROM user_profiles
      ORDER BY ${orderBy} ${order}
      LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Total count for pagination
    const [[{ total }]] = await connection.query(
      `SELECT COUNT(*) AS total FROM user_profiles`
    );

    return res.status(200).json({
      success: true,
      message: "Patients fetched successfully",
      data: patients,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching patients"
    });
  }
};

const getPatientMonitoringData = async (req, res) => {
  try {
    let { page = 1, limit = 25 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    // 1. Get status counts
    const [statsRows] = await connection.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS critical,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS abnormal,
        SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) AS normal
      FROM user_profiles
    `);
    const stats = statsRows[0];

    // 2. Get paginated patient list
    const [patients] = await connection.query(`
    SELECT 
  fk_userid AS patientId,
  CONCAT_WS(' ', firstname, middlename, lastname) AS name,
  TIMESTAMPDIFF(YEAR, dob, CURDATE()) AS age,
  last_visit AS lastVisit,
  phone,
  height,
  dry_weight,
  bmi,
  bp,
  heart_rate,
  temp,
  CASE status
    WHEN 1 THEN 'Critical'
    WHEN 2 THEN 'Abnormal'
    WHEN 3 THEN 'Normal'
    ELSE 'NA'
  END AS status
FROM user_profiles
ORDER BY last_visit DESC
LIMIT ? OFFSET ?;
    `, [limit, offset]);

    return res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully",
      stats: {
        total: stats.total,
        critical: stats.critical,
        abnormal: stats.abnormal,
        normal: stats.normal
      },
      patients,
      pagination: {
        total: stats.total,
        page,
        limit,
        totalPages: Math.ceil(stats.total / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};


module.exports = {
  addPatient,
  getPatientDataById,
  editPatientDataById,
  getAllPatients,
  getPatientMonitoringData
};

const bcrypt = require("bcryptjs");
const connection = require("../../config/db");
const moment = require('moment');
const logAudit = require("../../utils/logAudit");


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
      patientService
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
    const { user_id, username } = req.user;
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

    const sql2 = `INSERT INTO allergies (category, allergen, reaction,patient_id) VALUES (?, ?, ?,?);`;
    allergies?.map(async (allergy) => {
      const values2 = [
        allergy.category,
        allergy.allergen,
        allergy.reaction,
        insertedId,
      ];
      const [allergyResult] = await connection.query(sql2, values2);
    });


    const vitalsSql = `
  INSERT INTO patient_vitals 
  (patient_id, height, weight, bmi, blood_pressure, heart_rate, temperature) 
  VALUES (?, ?, ?, ?, ?, ?, ?)
`;
    await connection.query(vitalsSql, [
      insertedId,
      height || 0,
      weight || 0,
      bmi || 0,
      bloodPressure || '0/0',
      heartRate || 0,
      temperature || 0,
    ]);


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

    const sql4 = `INSERT INTO patient_medication (
  patient_id,
  name,
  dosage,
  frequency,
  prescribed_by,
  startDate,
  endDate,
  status,
  refills
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`;
    currentMedications?.map(async (medication) => {
      const values4 = [
        insertedId,
        medication.name,
        medication.dosage,
        medication.frequency,
        medication.prescribedBy,
        medication.startDate,
        medication.endDate,
        medication.status,
        medication.refills
      ];
      const [medicationResult] = await connection.query(sql4, values4);
    });

    const sql5 = `INSERT INTO patient_diagnoses (
  patient_id,
  icd10,
  diagnosis,
  status,
  type,
  created_by
) VALUES (?, ?, ?, ?, ?, ?);`;
    for (const diagnos of diagnosis || []) {
      const values5 = [
        insertedId,
        diagnos.icd10,
        diagnos.diagnosis,
        diagnos.status,
        diagnos.type,
        req.user.user_id ? req.user.user_id : 0
      ];
      await connection.query(sql5, values5);
    }

    const sql6 = `INSERT INTO notes (
  patient_id,
  note,
  duration,
  type,
  created_by
) VALUES (?, ?, ?, ?, ?);`;
    notes?.map(async (note) => {
      const values6 = [insertedId, note.note, note.duration,note.type, user_id];
      const [noteResult] = await connection.query(sql6, values6);
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

// Get all patients with pagination
const getPatientDataById = async (req, res) => {
  try {
    // const { patientId } = req.query;
    // console.log(req.user)
    const { roleid, user_id } = req.user;
    let patientId;

    if (roleid == 6) {
      patientId = req.query.patientId;
      if (!patientId) {
        return res.status(400).json({ message: 'patientId is required for provider' });
      }
    } else if (roleid == 7) {
      patientId = user_id;
    } else {
      return res.status(403).json({ message: 'Unauthorized role' });
    }
    // Get user profile
    const [profileRows] = await connection.query(
      `SELECT 
    firstname,
    middlename,
    lastname,
    work_email,
    phone,
    gender,
    address_line,
    address_line_2,
    city,
    state,
    country,
    zip,
    dob,
    last_visit,
    emergency_contact,
    ethnicity,
    height,
    dry_weight,
    bmi,
    bp,
    patient_condition,
    heart_rate,
    temp,
    CASE (status)
      WHEN 1 THEN 'Critical'
      WHEN 2 THEN 'Abnormal'
      WHEN 3 THEN 'Normal'
      ELSE 'NA'
    END AS status,
    u.created,
    service_type
  FROM user_profiles 
  LEFT JOIN users u on u.user_id = user_profiles.fk_userid
  WHERE fk_userid = ?`,
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
              patient_insurance_id,
              insured_name,
              insured_gender,
              insured_dob,
              insured_address,
              insured_phone
       FROM patient_insurances WHERE fk_userid = ?`,
      [patientId]
    );

    // Get medications
    const [currentMedications] = await connection.query(
      `SELECT name, dosage, frequency, prescribed_by, startDate, endDate, status ,id,refills
       FROM patient_medication WHERE patient_id = ? ORDER BY id DESC`,
      [patientId]
    );

    // Get diagnoses
    const [diagnosis] = await connection.query(
      `SELECT date, icd10, diagnosis, status ,id,type
       FROM patient_diagnoses WHERE patient_id = ? ORDER BY id DESC`,
      [patientId]
    );

    // Get notes
    const [notes] = await connection.query(
      `SELECT note, created,duration, created_by,type ,note_id FROM notes WHERE patient_id = ? ORDER BY note_id DESC`,
      [patientId]
    );
    const [tasks] = await connection.query(
      `SELECT * FROM tasks WHERE patient_id = ? ORDER BY id DESC`,
      [patientId]
    );
    const [patientVitals] = await connection.query(
      `SELECT * FROM patient_vitals WHERE patient_id = ? ORDER BY id DESC LIMIT 1`,
      [patientId]
    )
    const vitals = patientVitals[0];
    // Compose full response
    if (profile) {
      const response = {
        firstName: profile.firstname,
        middleName: profile.middlename,
        lastName: profile.lastname,
        email: profile.work_email || user?.username,
        phone: profile.phone,
        gender: profile.gender,
        status: profile.status,
        addressLine1: profile.address_line,
        addressLine2: profile.address_line_2,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        zipCode: profile.zip,
        birthDate: profile.dob,
        lastVisit: profile.last_visit,
        emergencyContact: profile.emergency_contact,
        ethnicity: profile.ethnicity,
        patientService: profile.service_type,
        allergies,
        insurance: insurances,
        currentMedications,
        diagnosis,
        notes,
        tasks,
        createdBy: notes?.[0]?.created_by || null,
        created: profile.created,
        patientId,
        height:vitals?.height,
        weight:vitals?.weight,
        bmi:vitals?.bmi,
        bloodPressure:vitals?.blood_pressure,
        heartRate:vitals?.heart_rate,
        temperature:vitals?.temperature,
      };
      return res.status(200).json({
        success: true,
        message: "Patient data fetched successfully",
        data: response,
      });
    } else {
      return res.status(200).json({
        success: false,
        message: "Patient data not found",
      });
    }

  } catch (error) {
    console.error("Error fetching patient data:", error);
    res
      .status(500)
      .json({ success: false, message: "Error in get patient data API" });
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
      allergies,
      insurance,
      currentMedications,
      diagnosis,
      notes,
      patientService
    } = req.body;

    // 1. Update user profile
const profileQuery = `
  UPDATE user_profiles SET
    firstname = ?, middlename = ?, lastname = ?, dob = ?, work_email = ?, phone = ?,
    gender = ?, ethnicity = ?, last_visit = ?, emergency_contact = ?,
    address_line = ?, address_line_2 = ?, city = ?, state = ?, country = ?, zip = ?,
    service_type = ?, status=? 
  WHERE fk_userid = ?;
`;


 const profileValues = [
  firstName,
  middleName,
  lastName,
  birthDate,
  email,
  phone,
  gender,
  ethnicity,
  lastVisit,
  emergencyContact,
  addressLine1,
  addressLine2,
  city,
  state,
  country,
  zipCode,
  JSON.stringify(patientService),
  status,
  patientId // for WHERE clause
];
    await connection.query(profileQuery, profileValues);

    // 2. Update users table (username = email)
    await connection.query(`UPDATE users SET username = ? WHERE user_id = ?`, [
      email,
      patientId,
    ]);



// 6. Update diagnosis
if (diagnosis && diagnosis.length > 0) {
  // Step 1: Get all diagnosis IDs from input
  const diagIds = diagnosis
    .filter(diag => diag.id)
    .map(diag => diag.id);

  // Step 2: Delete old diagnoses that are not in current list
  if (diagIds.length) {
    const placeholders = diagIds.map(() => '?').join(',');
    await connection.query(
      `DELETE FROM patient_diagnoses WHERE patient_id = ? AND id NOT IN (${placeholders})`,
      [patientId, ...diagIds]
    );
  } else {
    // No valid IDs in list — delete all
    await connection.query(
      `DELETE FROM patient_diagnoses WHERE patient_id = ?`,
      [patientId]
    );
  }

  // Step 3: Insert or update each diagnosis
  for (const diag of diagnosis || []) {
    if (diag.id) {
      // Update existing diagnosis
      await connection.query(
        `UPDATE patient_diagnoses
         SET date = ?, icd10 = ?, diagnosis = ?, status = ?, type = ?
         WHERE id = ? AND patient_id = ?`,
        [diag.date, diag.icd10, diag.diagnosis, diag.status, diag.type, diag.id, patientId]
      );
      console.log("Updated diagnosis ID:", diag.id);
    } else {
      // Insert new diagnosis
      const [result] = await connection.query(
        `INSERT INTO patient_diagnoses
         (date, icd10, diagnosis, status, patient_id, type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [diag.date, diag.icd10, diag.diagnosis, diag.status, patientId, diag.type]
      );
      console.log("Inserted new diagnosis ID:", result.insertId);
    }
  }

  console.log("Diagnosis update completed for patient:", patientId);
} else {
  // Step 4: If no diagnosis entries, delete all for patient
  await connection.query(
    `DELETE FROM patient_diagnoses WHERE patient_id = ?`,
    [patientId]
  );
  console.log("No diagnosis entries provided. All deleted for patient:", patientId);
}



 // 1. Allergies
if (allergies && allergies.length > 0) {
  // Step 1: Extract valid allergy IDs
  const allergyIds = allergies
    .filter(allergy => allergy.id)
    .map(allergy => allergy.id);

  // Step 2: Delete allergies not present in the input list
  if (allergyIds.length) {
    const placeholders = allergyIds.map(() => '?').join(',');
    await connection.query(
      `DELETE FROM allergies WHERE patient_id = ? AND id NOT IN (${placeholders})`,
      [patientId, ...allergyIds]
    );
  } else {
    // If no valid IDs, delete all allergies for patient
    await connection.query(
      `DELETE FROM allergies WHERE patient_id = ?`,
      [patientId]
    );
  }

  // Step 3: Update or insert allergies
  for (const allergy of allergies || []) {
    if (allergy.id) {
      const [result] = await connection.query(
        `UPDATE allergies
         SET category = ?, allergen = ?, reaction = ?
         WHERE id = ? AND patient_id = ?`,
        [allergy.category, allergy.allergen, allergy.reaction, allergy.id, patientId]
      );
      console.log("Updated allergy ID:", allergy.id);
    } else {
      const [result] = await connection.query(
        `INSERT INTO allergies (category, allergen, reaction, patient_id)
         VALUES (?, ?, ?, ?)`,
        [allergy.category, allergy.allergen, allergy.reaction, patientId]
      );
      console.log("Inserted new allergy ID:", result.insertId);
    }
  }

  console.log("Allergy update completed for patient:", patientId);
} else {
  // Step 4: No allergies provided – delete all for patient
  await connection.query(
    `DELETE FROM allergies WHERE patient_id = ?`,
    [patientId]
  );
  console.log("No allergy entries provided. All deleted for patient:", patientId);
}


 // 2. Insurance
if (insurance && insurance.length > 0) {
  // Step 1: Extract all valid insurance IDs
  const insuranceIds = insurance
    .filter(ins => ins.patient_insurance_id)
    .map(ins => ins.patient_insurance_id);

  // Step 2: Delete old insurance entries not in current list
  if (insuranceIds.length) {
    const placeholders = insuranceIds.map(() => '?').join(',');
    await connection.query(
      `DELETE FROM patient_insurances
       WHERE fk_userid = ? AND patient_insurance_id NOT IN (${placeholders})`,
      [patientId, ...insuranceIds]
    );
  } else {
    // If no valid IDs, delete all for the patient
    await connection.query(
      `DELETE FROM patient_insurances WHERE fk_userid = ?`,
      [patientId]
    );
  }

  // Step 3: Update or insert each insurance entry
  for (const ins of insurance || []) {
    if (ins.patient_insurance_id) {
      const [result] = await connection.query(
        `UPDATE patient_insurances SET
           insurance_policy_number = ?, insurance_group_number = ?, insurance_company = ?,
           insurance_plan = ?, insurance_expiry = ?, insurance_type = ?, effective_date = ?
         WHERE patient_insurance_id = ? AND fk_userid = ?`,
        [
          ins.policyNumber,
          ins.groupNumber,
          ins.company,
          ins.plan,
          ins.expirationDate,
          ins.type,
          ins.effectiveDate,
          ins.patient_insurance_id,
          patientId
        ]
      );
      console.log("Updated insurance ID:", ins.patient_insurance_id);
    } else {
      const [result] = await connection.query(
        `INSERT INTO patient_insurances (
           insurance_policy_number, insurance_group_number, insurance_company,
           insurance_plan, insurance_expiry, insurance_type, effective_date, fk_userid
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ins.policyNumber,
          ins.groupNumber,
          ins.company,
          ins.plan,
          ins.expirationDate,
          ins.type,
          ins.effectiveDate,
          patientId
        ]
      );
      console.log("Inserted new insurance ID:", result.insertId);
    }
  }

  console.log("Insurance update completed for patient:", patientId);
} else {
  // Step 4: If no insurance entries, delete all
  await connection.query(
    `DELETE FROM patient_insurances WHERE fk_userid = ?`,
    [patientId]
  );
  console.log("No insurance entries provided. All deleted for patient:", patientId);
}

  // 3. Medications
if (currentMedications && currentMedications.length > 0) {
  // Step 1: Extract valid medication IDs
  const medicationIds = currentMedications
    .filter(med => med.id)
    .map(med => med.id);

  // Step 2: Delete old medications not in the current list
  if (medicationIds.length) {
    const placeholders = medicationIds.map(() => '?').join(',');
    await connection.query(
      `DELETE FROM patient_medication
       WHERE patient_id = ? AND id NOT IN (${placeholders})`,
      [patientId, ...medicationIds]
    );
  } else {
    // If no valid IDs, delete all medications for the patient
    await connection.query(
      `DELETE FROM patient_medication WHERE patient_id = ?`,
      [patientId]
    );
  }

  // Step 3: Update or insert each medication
  for (const med of currentMedications || []) {
    if (med.id) {
      const [result] = await connection.query(
        `UPDATE patient_medication SET
           name = ?, dosage = ?, frequency = ?, prescribed_by = ?,
           startDate = ?, endDate = ?, status = ?,refills=?
         WHERE id = ? AND patient_id = ?`,
        [
          med.name,
          med.dosage,
          med.frequency,
          med.prescribedBy,
          med.startDate,
          med.endDate,
          med.status,
          med.refills,
          med.id,
          patientId
        ]
      );
      console.log("Updated medication ID:", med.id);
    } else {
      const [result] = await connection.query(
        `INSERT INTO patient_medication (
           name, dosage, frequency, prescribed_by,
           startDate, endDate, status,refills, patient_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          med.name,
          med.dosage,
          med.frequency,
          med.prescribedBy,
          med.startDate,
          med.endDate,
          med.status,
          med.refills,
          patientId
        ]
      );
      console.log("Inserted new medication ID:", result.insertId);
    }
  }

  console.log("Medication update completed for patient:", patientId);
} else {
  // Step 4: No medications provided — delete all for patient
  await connection.query(
    `DELETE FROM patient_medication WHERE patient_id = ?`,
    [patientId]
  );
  console.log("No medication entries provided. All deleted for patient:", patientId);
}


    // 4. Notes
  const noteIds = notes
  .filter(note => note.note_id)        // Keep only notes with a note_id
  .map(note => note.note_id);
  if(noteIds.length){
    const deleteids = await connection.query(`DELETE FROM notes
WHERE note_id NOT IN (${noteIds.join(",")});`);
  }else{
    const deleteids = await connection.query(`DELETE FROM notes
WHERE patient_id = ${patientId} `);
  }
    for (const note of notes || []) {
      // console.log("Processing note:", note);

      if (note.note_id) {
        const [result] = await connection.query(
          `UPDATE notes SET note = ?,type = ?,duration=? WHERE note_id = ? AND patient_id = ?`,
          [note.note, note.type, note.duration, note.note_id, patientId]
        );
        console.log("Updated note ID:", note.note_id, result);
      } else {
        const [result] = await connection.query(
          `INSERT INTO notes (note,type, patient_id,duration, created_by) VALUES (?, ?, ?,?,?)`,
          [note.note, note.type, patientId, note.duration, note.created_by || null]
        );
        console.log("Inserted new note:", result);
      }
    }

    await logAudit(req, 'UPDATE', 'PATIENT', patientId, `Patient data updated: ${firstName} ${lastName}`);
    return res.status(200).json({
      success: true,
      message: "Patient data updated successfully",
    });
  } catch (error) {
    console.error("Error updating patient data:", error);
    res
      .status(500)
      .json({ success: false, message: "Error in edit patient data API" });
  }
};


const getAllPatients = async (req, res) => {
  try {
    let { page = 1, limit = 10, order = "DESC", orderBy = "fk_userid" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;
    const { roleid, user_id: providerid } = req.user;
    const { searchterm } = req.headers;

    const allowedOrderBy = [
      "firstname",
      "lastname",
      "dob",
      "gender",
      "ethnicity",
      "last_visit",
      "height",
      "dry_weight",
      "bmi",
      "bp",
      "heart_rate",
      "temp",
      "created"
    ];
    const allowedOrder = ["ASC", "DESC"];

    if (!allowedOrderBy.includes(orderBy)) orderBy = "last_visit";
    if (!allowedOrder.includes(order.toUpperCase())) order = "DESC";

    // Fetch patient data by joining users and user_profiles, filtering on fk_roleid = 7
    let getAllQ = `SELECT 
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
    CASE status
WHEN 1 THEN 'Critical'
WHEN 2 THEN 'Abnormal'
WHEN 3 THEN 'Normal'
ELSE 'NA'
END AS status,
    address_line AS address,
   service_type
  FROM user_profiles`
      + ' LEFT JOIN users_mappings ON user_profiles.fk_userid = users_mappings.user_id WHERE users_mappings.fk_role_id = 7';
    if (roleid == 6) {
      getAllQ += ` AND users_mappings.fk_physician_id = ${providerid}`;
    }
    if (searchterm) {
      getAllQ += ` AND (firstname LIKE '%${searchterm}%' OR lastname LIKE '%${searchterm}%' OR middlename LIKE '%${searchterm}%') `;
    }
    getAllQ += ` GROUP BY users_mappings.user_id ORDER BY ${orderBy} ${order}
  LIMIT ${limit} OFFSET ${offset}`;

    const [patients] = await connection.query(
      getAllQ
    );

    // Total count for pagination
    let countQ = ``
    if (roleid == 6) {
      countQ += ` SELECT COUNT(*) AS total FROM user_profiles LEFT JOIN users_mappings ON users_mappings.user_id = user_profiles.fk_userid WHERE users_mappings.fk_physician_id = ${providerid} GROUP BY users_mappings.user_id;`;
    } else {
      countQ = `SELECT COUNT(*) AS total FROM user_profiles GROUP BY user_profiles.fk_userid;`
    }
    // console.log(countQ)
    let total = 0;
    const [countRows] = await connection.query(countQ);
    if (Array.isArray(countRows) && countRows.length > 0) {
      if (countRows[0].total !== undefined) {
        // If not grouped, just use the first value
        total = countRows[0].total;
      } else {
        // If grouped, sum all totals
        total = countRows.reduce((acc, row) => acc + (row.total || 0), 0);
      }
    }
    if (patients.length) {
      for (let patient of patients) {
        const [rows] = await connection.query(
          `SELECT icd10, diagnosis, status, id, type
           FROM patient_diagnoses
           WHERE patient_id = ? ORDER BY id DESC`,
          [patient.patientId]
        );

        // Assign diagnoses array to patient, even if empty
        patient.diagnosis = rows || [];
      }
    }
    // WHERE u.fk_roleid = 6
    return res.status(200).json({
      success: true,
      message: "Patients fetched successfully",
      data: patients,
      pagination: {
        total: total ? total : 0,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching patients",
    });
  }
};



const getPatientMonitoringData = async (req, res) => {
  try {
    let { page = 1, limit = 250000 } = req.query;
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
    const [patients] = await connection.query(
      `
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
  END AS status,
      CASE 
    WHEN service_type = 1 THEN 'CCM'
    WHEN service_type = 2 THEN 'PCM'
    ELSE 'NA'
  END AS patientService
FROM user_profiles
ORDER BY last_visit DESC
LIMIT ? OFFSET ?;
    `,
      [limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully",
      stats: {
        total: stats.total,
        critical: stats.critical,
        abnormal: stats.abnormal,
        normal: stats.normal,
      },
      patients,
      pagination: {
        total: stats.total,
        page,
        limit,
        totalPages: Math.ceil(stats.total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};


const getPatientTaskDetails = async (req, res) => {
  try {

    const [tasksCategories] = await connection.query('SELECT * FROM `tasks_category`');
    const [tasksSubCategories] = await connection.query('SELECT tasks_sub_category_id, tasks_sub_category_name FROM `tasks_sub_category`');
    const [taskActions] = await connection.query('SELECT task_action_id, task_action FROM `task_action`');
    const [taskResults] = await connection.query('SELECT task_result_id, task_result FROM `task_result`');
    const [taskTypes] = await connection.query('SELECT task_type_id, task_type FROM `task_types`');


    res.status(200).json({
      success: true,
      tasksCategories,
      tasksSubCategories,
      taskActions,
      taskResults,
      taskTypes
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};


const addPatientTask = async (req, res) => {
  const { user_id } = req.user;
  const {
    title,
    patientId,
    type,
    description,
    priority,
    dueDate,
    duration,
    frequency,
    frequencyType,
    status,
    program_type,
    cpt_code,
    billing_minutes
  } = { ...req.body, ...req.query };
  try {
    const sql = `
  INSERT INTO tasks (
    task_title,
    created_by,
    frequency,
    patient_id,
    status,
    task_description,
    priority,
    due_date,
    type,
    duration,
    frequency_type,
    program_type,
    cpt_code,
    billing_minutes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

    const values = [
      title,
      user_id,
      frequency ? frequency : "NA",
      patientId,
      status,
      description,
      priority,
      dueDate,
      type,
      duration,
      frequencyType,
      program_type ? program_type : null,
      cpt_code ? cpt_code : null,
      billing_minutes ? billing_minutes : null
    ];

    const [result] = await connection.query(sql, values);

    await logAudit(req, 'CREATE', 'PATIENT_TASK', patientId, `Task created: ${title} for patient ${patientId}`);
    res.status(200).json({
      success: true,
      message: 'Task inserted successfully',
      task_id: result.insertId
    });

  } catch (error) {
    console.error('Insert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to insert task',
      error: error.message
    });
  }
};





const getAllPatientTasks = async (req, res) => {
  const { patientId, type } = { ...req.body, ...req.query };

  try {
    let sql = `SELECT * FROM tasks WHERE patient_id = ?`;
    if (type) {
      sql += ` AND type = '${type}'`;
    }
    sql+= '  ORDER BY id DESC'
    const [taskDetails] = await connection.query(sql, [patientId]);

    if (!taskDetails || taskDetails.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'No task is available for this patient',
        task_id: []
      });
    }

    res.status(200).json({
      success: true,
      message: 'Tasks fetched successfully',
      task_id: taskDetails
    });

  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
};



const getPatientByPhoneNumber = async (req, res) => {
  try {
    let { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    // Normalize input (strip +91, +1, 0)
    phone = phone.replace(/^(\+91|\+1|0)/, '');

    const query = `
      SELECT fk_userid AS patientId,
             firstname, 
             middlename, 
             lastname,
             dob AS birthDate,
             work_email AS email,
             phone,
             gender,
             ethnicity,
             last_visit AS lastVisit,
             emergency_contact AS emergencyContact
      FROM user_profiles 
      WHERE phone LIKE ?
    `;

    const [rows] = await connection.query(query, [`%${phone}`]); // match from end

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};



const editPatientTask = async (req, res) => {
  const { user_id } = req.user;
  const {
    taskId,
    title,
    type,
    description,
    priority,
    dueDate,
    duration,
    frequency,
    frequencyType,
    status
  } = { ...req.body, ...req.query };
  console.log(req.body)
  if (!taskId) {
    return res.status(400).json({ success: false, message: 'Missing taskId' });
  }

  try {
    const sql = `
      UPDATE tasks SET
        task_title = ?,
        frequency = ?,
        status = ?,
        task_description = ?,
        priority = ?,
        due_date = ?,
        type = ?,
        duration = ?,
        frequency_type = ?
      WHERE
        id = ? 
    `;

    const values = [
      title,
      frequency,
      status,
      description,
      priority,
      dueDate,
      type,
      duration,
      frequencyType,
      taskId
    ];
    console.log(values)
    const [result] = await connection.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or not authorized'
      });
    }

    await logAudit(req, 'UPDATE', 'PATIENT_TASK', taskId, `Task updated: ${title}`);
    res.status(200).json({
      success: true,
      message: 'Task updated successfully'
    });

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task',
      error: error.message
    });
  }
};


const getPcmByPatientId = async (req, res) => {
  const { patientId } = req.params;

  try {
    const [rows] = await connection.execute(
      `SELECT * FROM pcm_mappings WHERE patient = ? ORDER BY created DESC`,
      [patientId]
    );

    res.status(200).json({
      success: true,
      message: 'Patient document mappings fetched successfully',
      data: rows
    });
  } catch (err) {
    console.error('Error fetching mappings:', err);
    res.status(500).json({
      success: false,
      message: 'Database error',
      error: err.message || err
    });
  }
};
const getCcmByPatientId = async (req, res) => {
  const { patientId } = req.params;

  try {
    const [rows] = await connection.execute(
      `SELECT * FROM ccm_mappings WHERE patient = ? ORDER BY created DESC`,
      [patientId]
    );

    res.status(200).json({
      success: true,
      message: 'Patient document mappings fetched successfully',
      data: rows
    });
  } catch (err) {
    console.error('Error fetching mappings:', err);
    res.status(500).json({
      success: false,
      message: 'Database error',
      error: err.message || err
    });
  }
};
const addPatientDiagnosis = async (req, res) => {
  const { patientId } = req.query;
  const { icd10, diagnosis, status, type } = req.body;
  const { user_id } = req.user;
  try {
    const sql5 = `INSERT INTO patient_diagnoses (
      patient_id,
      icd10,
      diagnosis,
      status,
      type,
      created_by
    ) VALUES (?, ?, ?, ?, ?, ?);`;

    const values5 = [
      patientId,
      icd10,
      diagnosis,
      status,
      type,
      user_id
    ];
    const [rows] = await connection.query(sql5, values5);

    await logAudit(req, 'CREATE', 'PATIENT_DIAGNOSIS', patientId, `Diagnosis added: ${diagnosis}`);
    res.status(200).json({
      success: true,
      message: 'Patient diagnosis added successfully'
    });
  } catch (err) {
    console.error('Error fetching mappings:', err);
    res.status(500).json({
      success: false,
      message: 'Database error',
      error: err.message || err
    });
  }
};
const getPatientDiagnosis = async (req, res) => {
  const { patientId } = req.query;
  const { diagnosisId } = req.query;
  let sql = `SELECT icd10, diagnosis,patient_diagnoses.status ,id,created_by,type,CONCAT(up.firstname," ",up.lastname) AS created_by_name,created_at FROM patient_diagnoses LEFT JOIN user_profiles up ON up.fk_userid =  created_by WHERE patient_id = ${patientId}`;
  if (diagnosisId) {
    sql += ` AND id = ${diagnosisId}`;
  }

  sql += ' ORDER BY id DESC'

  try {
    const [diagnosis] = await connection.query(
      sql,
      [patientId]
    );

    res.status(200).json({
      success: true,
      message: 'Patient diagnosis fetched successfully',
      diagnosis
    });
  } catch (err) {
    console.error('Error adding diagnosis:', err);
    res.status(500).json({
      success: false,
      message: 'Database error',
      error: err.message || err
    });
  }
};
const addPatientNotes = async (req, res) => {
  const { note, type, duration, patientId } = { ...req.body, ...req.query };
  const { user_id } = req.user;
  try {


    const [notes] = await connection.query(
      `INSERT INTO notes(
    patient_id,
    note,
    type,
    duration,
    created_by
  ) VALUES(?, ?, ?, ?,?);`,
      [patientId, note, type, duration, user_id]
    );

    await logAudit(req, 'CREATE', 'PATIENT_NOTE', patientId, `Note added for patient ${patientId}`);
    res.status(200).json({
      success: true,
      message: 'Patient Notes added successfully',
    });
  } catch (err) {
    console.error('Error adding notes:', err);
    res.status(500).json({
      success: false,
      message: 'Database error',
      error: err.message || err
    });
  }
};
const getPatientNotes = async (req, res) => {
  const { patientId, type } = { ...req.body, ...req.query };
  try {
    let sql = `SELECT * FROM notes WHERE patient_id = ?`;
    if (type) {
      sql += ` AND type = ${type}`;
    }
    sql+= ` order by note_id DESC`
    const [notes] = await connection.query(sql, [patientId]);

    res.status(200).json({
      success: true,
      message: 'Patient Notes fetched successfully',
      data: notes
    });
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({
      success: false,
      message: 'Database error',
      error: err.message || err
    });
  }
};
const getUpcomingAndOverdueTasks = async (req, res) => {
  const patientId = req.query.patientId;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  console.log(today)
  const [upcomingTasks] = await connection.query(`
    SELECT * FROM tasks
    WHERE patient_id = ? AND due_date >= ?
  `, [patientId, today]);

  const [overdueTasks] = await connection.query(`
    SELECT * FROM tasks
    WHERE patient_id = ? AND due_date < ?
  `, [patientId, today]);
  console.log(upcomingTasks, overdueTasks)
  res.json({
    patient_id: patientId,
    upcoming: upcomingTasks,
    overdue: overdueTasks
  });
};
const addPatientAllergy = async (req, res) => {
  const { category, allergen, reaction, patientId } = { ...req.body, ...req.query };

  if (!category || !allergen || !reaction || !patientId) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  try {
    const sql = `INSERT INTO allergies (category, allergen, reaction, patient_id) VALUES (?, ?, ?, ?)`;
    const [result] = await connection.execute(sql, [
      category,
      allergen,
      reaction,
      patientId,
    ]);
    await logAudit(req, 'CREATE', 'PATIENT_ALLERGY', patientId, `Allergy added: ${allergen}`);
    res.status(201).json({ success: true, message: 'Allergy added', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'DB error', error: error.message });
  }
}


const addPatientInsurance = async (req, res) => {
  const {
    policyNumber,
    groupNumber,
    company,
    plan,
    expirationDate,
    type,
    effectiveDate,
    patientId,

  } = { ...req.body, ...req.query };

  // Basic validation
  if (
    !policyNumber || !groupNumber || !company ||
    !plan || !expirationDate || !type || !effectiveDate
  ) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {

    const sql = `
      INSERT INTO patient_insurances (
        insurance_policy_number,
        insurance_group_number,
        insurance_company,
        insurance_plan,
        insurance_expiry,
        insurance_type,
        effective_date,
        fk_userid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      policyNumber,
      groupNumber,
      company,
      plan,
      expirationDate,
      type,
      effectiveDate,
      patientId,
    ];

    const [result] = await connection.execute(sql, values);

    await logAudit(req, 'CREATE', 'PATIENT_INSURANCE', patientId, `Insurance record added: ${company}`);
    res.status(201).json({
      success: true,
      message: 'Insurance record added successfully',
      patient_insurance_id: result.insertId,
    });

  } catch (error) {
    console.error('DB Error:', error.message);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};




const addPatientMedication = async (req, res) => {
  const {
    patientId,
    name,
    dosage,
    frequency,
    startDate,
    endDate,
    status,
    refills = 0
  } = { ...req.body, ...req.query };
  const { user_id } = req.user;
  // Basic validation
  if (
    !patientId || !name || !dosage || !frequency
    || !startDate || !endDate || !status
  ) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const sql = `
      INSERT INTO patient_medication (
        patient_id,
        name,
        dosage,
        frequency,
        prescribed_by,
        startDate,
        endDate,
        status,
        refills
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      patientId,
      name,
      dosage,
      frequency,
      user_id,
      startDate,
      endDate,
      status,
      refills
    ];

    const [result] = await connection.execute(sql, values);

    await logAudit(req, 'CREATE', 'PATIENT_MEDICATION', patientId, `Medication added: ${name}`);
    res.status(201).json({
      success: true,
      message: 'Medication added successfully',
      medication_id: result.insertId,
    });
  } catch (error) {
    console.error('Error adding medication:', error.message);
    res.status(500).json({ success: false, message: 'Database error', error: error.message });
  }
};
const getPatientTimings = async (req, res) => {
  let { patientId, date } = { ...req.query, ...req.body };
  let user_id = req.user.user_id;

  if (!patientId || !user_id) {
    return res.status(400).json({ error: 'Missing patientId or provider_id' });
  }

  const queryDate = date ? moment(date) : moment();
  const startDate = queryDate.clone().startOf('month').format('YYYY-MM-DD HH:mm:ss');
  const endDate = queryDate.clone().endOf('month').format('YYYY-MM-DD HH:mm:ss');
  console.log(patientId, user_id, patientId, user_id)
  try {
    const [rows] = await connection.query(`
      SELECT
        (
          SELECT IFNULL(SUM(duration), 0)
          FROM (
            SELECT DISTINCT created, duration
            FROM notes
            WHERE patient_id = ? AND type LIKE '%rpm%' AND created BETWEEN ? AND ?
          ) AS rpm_notes
        ) +
        (
          SELECT IFNULL(SUM(duration), 0)
          FROM (
            SELECT DISTINCT created, duration
            FROM tasks
            WHERE patient_id = ? AND type LIKE '%rpm%' AND created BETWEEN ? AND ?
          ) AS rpm_tasks
        ) AS rpm_minutes,
    
        (
          SELECT IFNULL(SUM(duration), 0)
          FROM (
            SELECT DISTINCT created, duration
            FROM notes
            WHERE patient_id = ? AND  type LIKE '%ccm%' AND created BETWEEN ? AND ?
          ) AS ccm_notes
        ) +
        (
          SELECT IFNULL(SUM(duration), 0)
          FROM (
            SELECT DISTINCT created, duration
            FROM tasks
            WHERE patient_id = ? AND  type LIKE '%ccm%' AND created BETWEEN ? AND ?
          ) AS ccm_tasks
        ) AS ccm_minutes,
    
        (
          SELECT IFNULL(SUM(duration), 0)
          FROM (
            SELECT DISTINCT created, duration
            FROM notes
            WHERE patient_id = ? AND  type LIKE '%pcm%' AND created BETWEEN ? AND ?
          ) AS pcm_notes
        ) +
        (
          SELECT IFNULL(SUM(duration), 0)
          FROM (
            SELECT DISTINCT created, duration
            FROM tasks
            WHERE patient_id = ? AND type LIKE '%pcm%' AND created BETWEEN ? AND ?
          ) AS pcm_tasks
        ) AS pcm_minutes
    `, [
      patientId, startDate, endDate, patientId, startDate, endDate,  // RPM
      patientId, startDate, endDate, patientId, startDate, endDate,  // CCM
      patientId, startDate, endDate, patientId, startDate, endDate   // PCM
    ]);


    const [tasks] = await connection.query(
      `
      SELECT task_title as title, duration, type as category, created, 'task' as billing 
      FROM tasks 
      WHERE patient_id = ? 
        AND created BETWEEN '${startDate}' AND '${endDate}'
      ORDER BY created DESC
      `,
      [patientId]
    );
    const [notes] = await connection.query(
      `
      SELECT *
      FROM notes 
      WHERE patient_id = ?  
        AND created BETWEEN '${startDate}' AND '${endDate}'
      ORDER BY created DESC
      `,
      [patientId]
    );
    const sql2 = `SELECT cpt_code_id,cc.code,code_units,created,cc.price from cpt_billing LEFT JOIN cpt_codes cc ON cc.id = cpt_code_id WHERE patient_id = ? AND created BETWEEN ? AND ?`;
    const [data] = await connection.query(sql2, [
      patientId,
      startDate,
      endDate,
    ]);
    let total = data.reduce((sum, item) => {
      const price = parseFloat(item.price);
      const units =
        item.code_units && item.code_units > 0 ? item.code_units : 1;
      return sum + price * units;
    }, 0);
    total = parseFloat(total.toFixed(2));



    res.status(200).json({
      success: true,
      message: 'Patient timings fetched successfully',
      totalMinutes: rows[0]?.rpm_minutes + rows[0]?.ccm_minutes + rows[0]?.pcm_minutes,
      totalAmount: total,
      tasks: [ ...tasks],
      notes: [...notes],
      cpt_data: [...data],
      filterRange: { startDate, endDate },
      rpm_minutes: rows.length ? rows[0].rpm_minutes : 0,
      ccm_minutes: rows.length ? rows[0].ccm_minutes : 0,
      pcm_minutes: rows.length ? rows[0].pcm_minutes : 0
    });
  } catch (error) {
    console.error('Error fetching patient timings:', error.message);
    res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message || error
    });
  }
};


const addPatientVitals = async (req, res) => {
  try {
    const {
      height = 0,
      weight = 0,
      bmi = 0,
      bloodPressure = "0/0",
      heartRate = 0,
      temperature = 0,
    } = req.body;

    const patient_id = req.params.patientId;

    if (!patient_id) {
      return res.status(400).json({ success: false, message: "Patient ID is required." });
    }

    // Insert into patient_vitals
    const vitalsSql = `
      INSERT INTO patient_vitals 
      (patient_id, height, weight, bmi, blood_pressure, heart_rate, temperature) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await connection.query(vitalsSql, [
      patient_id,
      height,
      weight,
      bmi,
      bloodPressure,
      heartRate,
      temperature,
    ]);

    // Update vitals in user_profiles
    const profileUpdateSql = `
      UPDATE user_profiles 
      SET height = ?, dry_weight = ?, bmi = ?, bp = ?, heart_rate = ?, temp = ?
      WHERE fk_userid = ?
    `;
    await connection.query(profileUpdateSql, [
      height,
      weight,
      bmi,
      bloodPressure,
      heartRate,
      temperature,
      patient_id,
    ]);

    await logAudit(req, 'CREATE', 'PATIENT_VITALS', patient_id, `Vital signs recorded for patient ${patient_id}`);
    return res.status(201).json({
      success: true,
      message: "Vitals added successfully and user profile updated.",
    });
  } catch (err) {
    console.error("Error in addPatientVitals:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred while adding vitals.",
      error: err.message || err,
    });
  }
};
const fetchDataByPatientId = async (req, res) => {
  try {
    const { patientId, date,reportType } = { ...req.query, ...req.params, ...req.body };
    const { user_id } = req.user;
    const targetDate = date ? moment(date) : moment();
    const { startOfMonth, endOfMonth } = getMonthRange(targetDate);

    // console.log(patientId)
    const [profileRows] = await connection.query(
      `SELECT 
    up.firstname,
    up.middlename,
    up.lastname,
    up.work_email,
    up.phone,
    up.gender,
    up.address_line,
    up.address_line_2,
    up.city,
    up.state,
    up.country,
    up.zip,
    up.dob,
    up.last_visit,
    up.emergency_contact,
    up.ethnicity,
    up.height,
    up.dry_weight,
    up.bmi,
    up.bp,
    up.patient_condition,
    up.heart_rate,
    up.temp,
    um.fk_physician_id,
    CASE (up.status)
      WHEN 1 THEN 'Critical'
      WHEN 2 THEN 'Abnormal'
      WHEN 3 THEN 'Normal'
      ELSE 'NA'
    END AS status,
    u.created,
    up.service_type,
   CONCAT(up2.firstname," ",up2.lastname) as physicianName,
   um.fk_physician_id as physicianId,
   up2.state as physicianState,up2.city as physicianCity,up2.country as physicianCountry
  FROM user_profiles up
  LEFT JOIN users u on u.user_id = up.fk_userid
  LEFT JOIN users_mappings um ON um.user_id = up.fk_userid
  LEFT JOIN user_profiles up2 ON up2.fk_userid = um.fk_physician_id
  WHERE up.fk_userid = ?`,
      [patientId]
    );

    const profile = profileRows[0];

    // Get user login/email info
    const [userRows] = await connection.query(
      `SELECT username FROM users WHERE user_id = ?`,
      [patientId]
    );
    const user = userRows[0];




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
            id,
            created
          FROM allergies
          WHERE patient_id = ?
            AND created BETWEEN ? AND ?`,
      [patientId, startOfMonth, endOfMonth]
    );



    // Get medications
    const [currentMedications] = await connection.query(
      `SELECT name, dosage, frequency, prescribed_by, startDate, endDate, status, id,refills
       FROM patient_medication
       WHERE patient_id = ?
         AND created_at BETWEEN ? AND ? ORDER BY id DESC`,
      [patientId, startOfMonth, endOfMonth]
    );

    // Get diagnoses
    const [diagnosis] = await connection.query(
      `SELECT date, icd10, diagnosis, status, id, type
       FROM patient_diagnoses
       WHERE patient_id = ? AND type = ?
         AND created_at BETWEEN ? AND ? ORDER BY id DESC`,
      [patientId, reportType, startOfMonth, endOfMonth]
    );

    const [notes] = await connection.query(
      `SELECT note, created,type, created_by, note_id,duration
       FROM notes
       WHERE patient_id = ? AND type = ?
         AND created BETWEEN ? AND ? ORDER BY note_id DESC`,
      [patientId, reportType, startOfMonth, endOfMonth]
    );
    const [vitals] = await connection.query(
      `SELECT *
       FROM patient_vitals
       WHERE patient_id = ?
         AND created BETWEEN ? AND ?`,
      [patientId, startOfMonth, endOfMonth]
    );
    const [tasks] = await connection.query(
      `SELECT *
       FROM tasks
       WHERE patient_id = ? AND type = ?
         AND created BETWEEN ? AND ? ORDER BY id DESC`,
      [patientId, reportType, startOfMonth, endOfMonth]
    );
    // #production
    const [rows] = await connection.query(`
      SELECT
        (
          SELECT IFNULL(SUM(duration), 0)
          FROM (
            SELECT DISTINCT created, duration
            FROM notes
            WHERE patient_id = ? AND type LIKE '%rpm%' AND created BETWEEN ? AND ?
          ) AS rpm_notes
        ) +
        (
          SELECT IFNULL(SUM(duration), 0)
          FROM (
            SELECT DISTINCT created, duration
            FROM tasks
            WHERE patient_id = ? AND type LIKE '%rpm%' AND created BETWEEN ? AND ?
          ) AS rpm_tasks
        ) AS rpm_minutes,
    
        (
          SELECT IFNULL(SUM(duration), 0)
          FROM (
            SELECT DISTINCT created, duration
            FROM notes
            WHERE patient_id = ? AND  type LIKE '%ccm%' AND created BETWEEN ? AND ?
          ) AS ccm_notes
        ) +
        (
          SELECT IFNULL(SUM(duration), 0)
          FROM (
            SELECT DISTINCT created, duration
            FROM tasks
            WHERE patient_id = ? AND  type LIKE '%ccm%' AND created BETWEEN ? AND ?
          ) AS ccm_tasks
        ) AS ccm_minutes,
    
        (
          SELECT IFNULL(SUM(duration), 0)
          FROM (
            SELECT DISTINCT created, duration
            FROM notes
            WHERE patient_id = ? AND  type LIKE '%pcm%' AND created BETWEEN ? AND ?
          ) AS pcm_notes
        ) +
        (
          SELECT IFNULL(SUM(duration), 0)
          FROM (
            SELECT DISTINCT created, duration
            FROM tasks
            WHERE patient_id = ? AND type LIKE '%pcm%' AND created BETWEEN ? AND ?
          ) AS pcm_tasks
        ) AS pcm_minutes
    `, [
      patientId,  startOfMonth, endOfMonth, patientId, startOfMonth, endOfMonth,  // RPM
      patientId, startOfMonth, endOfMonth, patientId, startOfMonth, endOfMonth,  // CCM
      patientId, startOfMonth, endOfMonth, patientId, startOfMonth, endOfMonth   // PCM
    ]);
    let totalMinutes = rows[0]?.rpm_minutes + rows[0]?.ccm_minutes + rows[0]?.pcm_minutes;
    let minutesObj = calculateBilledMinutes(totalMinutes)
    // console.log(minutes)
    // Compose full response
    if (profile) {
      const response = {
        firstName: profile.firstname,
        middleName: profile.middlename,
        lastName: profile.lastname,
        email: profile.work_email || user?.username,
        phone: profile.phone,
        gender: profile.gender,
        status: profile.status,
        addressLine1: profile.address_line,
        addressLine2: profile.address_line_2,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        zipCode: profile.zip,
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
        patientService: profile.service_type,
        physicianId: profile.physicianId,
        physicianName: profile.physicianName,
        physicianState: profile.physicianState,
        physicianCity: profile.physicianCity,
        physicianCountry: profile.physicianCountry,
        allergies,
        currentMedications,
        diagnosis,
        notes: [...notes],
        tasks,
        vitals,
        createdBy: notes?.[0]?.created_by || null,
        created: profile.created,
        patientId,
        total_minutes: minutesObj,
        rpm_minutes: rows[0]?.rpm_minutes,
        ccm_minutes: rows[0]?.ccm_minutes,
        pcm_minutes: rows[0]?.pcm_minutes,
        reportType
      };
      console.log(startOfMonth, endOfMonth)
      return res.status(200).json({
        success: true,
        message: "Patient data fetched successfully",
        data: response,
      });
    } else {
      return res.status(200).json({
        success: false,
        message: "Patient data not found",
      });
    }

  } catch (error) {
    console.error("Error fetching patient data:", error);
    res
      .status(500)
      .json({ success: false, message: "Error in get patient data API" });
  }
};
const fetchDataByPatientIdForccm = async (req, res) => {
  try {
    const { patientId, date,reportType } = { ...req.query, ...req.params, ...req.body };
    const { user_id } = req.user;
    const targetDate = date ? moment(date) : moment();
    const { startOfMonth, endOfMonth } = getMonthRange(targetDate);

    const [profileRows] = await connection.query(
      `SELECT 
    up.firstname,
    up.middlename,
    up.lastname,
    up.work_email,
    up.phone,
    up.gender,
    up.address_line,
    up.address_line_2,
    up.city,
    up.state,
    up.country,
    up.zip,
    up.dob,
    up.last_visit,
    up.emergency_contact,
    up.height,
    up.dry_weight,
    up.bmi,
    up.bp,
    up.patient_condition,
    up.heart_rate,
    up.temp,
    um.fk_physician_id,
    CASE (up.status)
      WHEN 1 THEN 'Critical'
      WHEN 2 THEN 'Abnormal'
      WHEN 3 THEN 'Normal'
      ELSE 'NA'
    END AS status,
    u.created,
    up.service_type,
   CONCAT(up2.firstname," ",up2.lastname) as physicianName,
   um.fk_physician_id as physicianId,
   up2.state as physicianState,up2.city as physicianCity,up2.country as physicianCountry
  FROM user_profiles up
  LEFT JOIN users u on u.user_id = up.fk_userid
  LEFT JOIN users_mappings um ON um.user_id = up.fk_userid
  LEFT JOIN user_profiles up2 ON up2.fk_userid = um.fk_physician_id
  WHERE up.fk_userid = ?`,
      [patientId]
    );

    const profile = profileRows[0];

    const [userRows] = await connection.query(
      `SELECT username FROM users WHERE user_id = ?`,
      [patientId]
    );
    const user = userRows[0];
    //#production
    // Get medications
    const [currentMedications] = await connection.query(
      `SELECT name, dosage, frequency, prescribed_by, startDate, endDate, status, id,refills
       FROM patient_medication
       WHERE patient_id = ?
         AND created_at BETWEEN ? AND ? ORDER BY id DESC`,
      [patientId, startOfMonth, endOfMonth]
    );

    // Get diagnoses
    const [diagnosis] = await connection.query(
      `SELECT date, icd10, diagnosis, status, id, type
       FROM patient_diagnoses
       WHERE patient_id = ? AND type = ?
         AND created_at BETWEEN ? AND ? ORDER BY id DESC`,
      [patientId, reportType, startOfMonth, endOfMonth]
    );

    const [notes] = await connection.query(
      `SELECT note, created,duration,type, created_by, note_id
       FROM notes
       WHERE patient_id = ? AND type = ?
         AND created BETWEEN ? AND ? ORDER BY note_id DESC`,
      [patientId, reportType, startOfMonth, endOfMonth]
    );
    const [vitals] = await connection.query(
      `SELECT *
       FROM patient_vitals
       WHERE patient_id = ?
         AND created BETWEEN ? AND ?`,
      [patientId, startOfMonth, endOfMonth]
    );
    const [tasks] = await connection.query(
      `SELECT *
       FROM tasks
       WHERE patient_id = ? AND type = ?
         AND created BETWEEN ? AND ? ORDER BY id DESC`,
      [patientId, reportType, startOfMonth, endOfMonth]
    );
    const [rows] = await connection.query(`
      SELECT
        (
          SELECT IFNULL(SUM(duration), 0)
          FROM (
            SELECT DISTINCT created, duration
            FROM notes
            WHERE patient_id = ? AND type LIKE '%rpm%' AND created BETWEEN ? AND ?
          ) AS rpm_notes
        ) +
        (
          SELECT IFNULL(SUM(duration), 0)
          FROM (
            SELECT DISTINCT created, duration
            FROM tasks
            WHERE patient_id = ? AND type LIKE '%rpm%' AND created BETWEEN ? AND ?
          ) AS rpm_tasks
        ) AS rpm_minutes,
    
        (
          SELECT IFNULL(SUM(duration), 0)
          FROM (
            SELECT DISTINCT created, duration
            FROM notes
            WHERE patient_id = ? AND  type LIKE '%ccm%' AND created BETWEEN ? AND ?
          ) AS ccm_notes
        ) +
        (
          SELECT IFNULL(SUM(duration), 0)
          FROM (
            SELECT DISTINCT created, duration
            FROM tasks
            WHERE patient_id = ? AND  type LIKE '%ccm%' AND created BETWEEN ? AND ?
          ) AS ccm_tasks
        ) AS ccm_minutes,
    
        (
          SELECT IFNULL(SUM(duration), 0)
          FROM (
            SELECT DISTINCT created, duration
            FROM notes
            WHERE patient_id = ? AND  type LIKE '%pcm%' AND created BETWEEN ? AND ?
          ) AS pcm_notes
        ) +
        (
          SELECT IFNULL(SUM(duration), 0)
          FROM (
            SELECT DISTINCT created, duration
            FROM tasks
            WHERE patient_id = ? AND type LIKE '%pcm%' AND created BETWEEN ? AND ?
          ) AS pcm_tasks
        ) AS pcm_minutes
    `, [
      patientId, startOfMonth, endOfMonth, patientId, startOfMonth, endOfMonth,  // RPM
      patientId, startOfMonth, endOfMonth, patientId, startOfMonth, endOfMonth,  // CCM
      patientId, startOfMonth, endOfMonth, patientId, startOfMonth, endOfMonth   // PCM
    ]);
    let total_minutes = rows[0]?.rpm_minutes + rows[0]?.ccm_minutes + rows[0]?.pcm_minutes;
    let minutesObj = calculateBilledMinutes(total_minutes)
    if (profile) {
      const response = {
        firstName: profile.firstname,
        middleName: profile.middlename,
        lastName: profile.lastname,
        email: profile.work_email || user?.username,
        phone: profile.phone,
        gender: profile.gender,
        status: profile.status,
        addressLine1: profile.address_line,
        addressLine2: profile.address_line_2,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        zipCode: profile.zip,
        birthDate: profile.dob,
        lastVisit: profile.last_visit,
        emergencyContact: profile.emergency_contact,
        patientService: profile.service_type,
        notes: [...notes],
        createdBy: notes?.[0]?.created_by || null,
        created: profile.created,
        patientId,
        total_minutes: minutesObj,
        rpm_minutes: rows[0]?.rpm_minutes,
        ccm_minutes: rows[0]?.ccm_minutes,
        pcm_minutes: rows[0]?.pcm_minutes,
        providerId: profile.physicianId,
        providerName: profile.physicianName,
        providerState: profile.physicianState,
        providerCity: profile.physicianCity,
        providerCountry: profile.physicianCountry,
        currentMedications,
        diagnosis,
        vitals,
        tasks,
        reportType
      };
      console.log(startOfMonth, endOfMonth)
      return res.status(200).json({
        success: true,
        message: "Patient data fetched successfully",
        data: response,
      });
    } else {
      return res.status(200).json({
        success: false,
        message: "Patient data not found",
      });
    }

  } catch (error) {
    console.error("Error fetching patient data:", error);
    res
      .status(500)
      .json({ success: false, message: "Error in get patient data API" });
  }
};
const getMonthRange = (targetDate) => {
  const startOfMonth = moment(targetDate).startOf('month').format('YYYY-MM-DD HH:mm:ss');
  const endOfMonth = moment(targetDate).endOf('month').format('YYYY-MM-DD HH:mm:ss');
  return { startOfMonth, endOfMonth };
};

function calculateBilledMinutes(totalMinutes) {
  const billed = Math.floor(totalMinutes / 20) * 20;
  const unbilled = totalMinutes - billed;
  return {
    total: totalMinutes ? totalMinutes : 0,
    billed: billed ? billed : 0,
    unbilled: unbilled ? unbilled : 0
  };
}

const searchPatient = async (req,res)=>{
    try {
        const {searchterm} = req.query;
        const query = `SELECT CONCAT(up.firstname," ",up.lastname) as patient_name ,up.fk_userid as patient_id FROM user_profiles up LEFT JOIN users_mappings um ON um.user_id = up.fk_userid WHERE um.fk_role_id = 7 AND um.fk_physician_id = ${req.user.user_id} AND (up.firstname LIKE '%${searchterm}%' OR up.middlename LIKE '%${searchterm}%' OR up.dob LIKE '%${searchterm}%' OR up.lastname LIKE '%${searchterm}%' OR up.work_email LIKE '%${searchterm}%' OR up.phone LIKE '%${searchterm}%') LIMIT 10`;
        // console.log(query)
        const [rows] = await connection.query(query);
        return res.status(200).json({
            success: true,
            message: "Patient data fetched successfully",
            data: rows,
        });
    } catch (error) {
        console.error("Error searching patient:", error);
        res.status(500).json({
            success: false,
            message: "Error in search patient API",
        });
    }
}
const getAllTasks = async (req,res)=>{
    try {
      if(!req.user.user_id){
        return res.status(400).json({
            success: false,
            message: "User ID is required",
        });
      }
        const query = `SELECT * FROM tasks LEFT JOIN users_mappings um ON um.user_id = tasks.patient_id WHERE um.fk_physician_id = ${req.user.user_id}`;
        const [rows] = await connection.query(query);
        return res.status(200).json({
            success: true,
            message: "Patient tasks fetched successfully",
            data: rows,
        });
    } catch (error) {
        console.error("Error fetching patient tasks:", error);
        res.status(500).json({
            success: false,
            message: "Error in get patient tasks API",
        });
    }
}

const assignBedToPatient = async (req, res) => {
  const { patientId, bedNo, wardNo, roomType } = req.body;
  const assigned_by = req.user.user_id;

  try {
    // 1. Check if patient already has any active bed
    const [[existingAssignment]] = await connection.query(
      `SELECT id FROM bed_assignments WHERE patient_id = ? AND status = 1`,
      [patientId]
    );

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: "Patient already has a bed assigned.",
      });
    }

    // 2. Check if the bed is already assigned to any patient
    const [[bedInUse]] = await connection.query(
      `SELECT id FROM bed_assignments 
       WHERE bed_no = ? AND ward_no = ? AND room_type = ? AND status = 1`,
      [bedNo, wardNo, roomType]
    );

    if (bedInUse) {
      return res.status(400).json({
        success: false,
        message: "This bed is already assigned to another patient.",
      });
    }

    // 3. Assign the bed to the patient
    await connection.query(
      `INSERT INTO bed_assignments 
       (patient_id, bed_no, ward_no, room_type, assigned_by, status) 
       VALUES (?, ?, ?, ?, ?, 1)`,
      [patientId, bedNo, wardNo, roomType, assigned_by]
    );

    return res.json({
      success: true,
      message: "Bed assigned successfully.",
    });

  } catch (error) {
    console.error("Error assigning bed:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while assigning the bed.",
    });
  }
};
const unassignBedFromPatient = async (req, res) => {
  const { patientId } = req.body;
  const unassigned_by = req.user.user_id;

  try {
    // 1. Check if patient has a currently assigned bed
    const [[assignment]] = await connection.query(
      `SELECT * FROM bed_assignments 
       WHERE patient_id = ? AND status = 1 
       ORDER BY assigned_at DESC LIMIT 1`,
      [patientId]
    );

    if (!assignment) {
      return res.status(400).json({
        success: false,
        message: "No active bed assigned to this patient.",
      });
    }

    // 2. Unassign the bed
    await connection.query(
      `UPDATE bed_assignments 
       SET status = 2, unassigned_by = ?, unassigned_at = NOW()
       WHERE id = ?`,
      [unassigned_by, assignment.id]
    );

    res.json({
      success: true,
      message: "Bed unassigned successfully.",
    });

  } catch (error) {
    console.error("Error unassigning bed:", error);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
};
const getAllBeds = async (req, res) => {
  try {
    // console.log(req.user)
    const userId = req.user.user_id;
    const {patientId,status} = {...req.query, ...req.body};
    
    let sql = `SELECT 
  ba.id AS assignmentId,
  ba.patient_id AS patientId,
  CONCAT(up.firstname, ' ', up.middlename, ' ', up.lastname) AS patientName,
  up.gender,
  up.dob AS birthDate,
  up.phone,
  up.work_email AS email,
  ba.bed_no AS bedNo,
  ba.ward_no AS wardNo,
  ba.room_type AS roomType,
  ba.assigned_at AS assignedAt,
  up.address_line AS address,
  CASE ba.status
    WHEN 1 THEN 'Assigned'
    WHEN 2 THEN 'Unassigned'
    ELSE 'Available'
  END AS bedStatus
FROM bed_assignments ba
LEFT JOIN user_profiles up ON up.fk_userid = ba.patient_id
LEFT JOIN users_mappings um ON um.user_id = up.fk_userid 
WHERE um.fk_physician_id = ${userId}`;
    if(patientId){
      sql += ` AND ba.patient_id = ${patientId}`;
    }
    if(status){
      sql += ` AND ba.status = ${status}`;
    }
    const [rows] = await connection.query(sql);
    return res.json({
      success: true,
      message: "Beds fetched successfully.",
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching beds:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};

module.exports = {
  addPatient,
  getPatientDataById,
  editPatientDataById,
  getAllPatients,
  getPatientMonitoringData,
  getPatientByPhoneNumber,
  getPatientTaskDetails,
  addPatientTask,
  getAllPatientTasks,
  editPatientTask,
  getPcmByPatientId,
  getCcmByPatientId,
  addPatientDiagnosis,
  getPatientDiagnosis,
  addPatientNotes,
  getPatientNotes,
  getUpcomingAndOverdueTasks,
  addPatientAllergy,
  addPatientInsurance,
  addPatientMedication,
  getPatientTimings,
  addPatientVitals,
  fetchDataByPatientId,
  fetchDataByPatientIdForccm,
  searchPatient,
  getAllTasks,
  assignBedToPatient,
  unassignBedFromPatient,
  getAllBeds,
};

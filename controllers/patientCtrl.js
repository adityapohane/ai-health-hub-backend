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
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      zipCode,
      organizationId,
      practiceId,
      nurseId
    } = req.body;
    let password = `${firstName}@hub`;
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
  height, dry_weight, bmi, fk_userid, status, bp, heart_rate, temp,
  address_line,address_line_2, city, state, country, zip
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

    const values1 = [
      firstName,
      middleName,
      lastName,
      birthDate,
      email,
      phone, // 1–6 ✅
      gender,
      ethnicity,
      lastVisit,
      emergencyContact, // 7–10 ✅
      height,
      weight,
      bmi, // 11–13 ✅
      insertedId,
      status,
      bloodPressure,
      heartRate,
      temperature,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      zipCode, // 14–16 ✅
      // 17–19 ✅
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

    const sql3 = `INSERT INTO patient_insurances (
  insurance_policy_number,
  insurance_group_number,
  insurance_company,
  insurance_plan,
  insurance_expiry,
  insurance_type,
  effective_date,
  fk_userid
) VALUES (?, ?, ?, ?, ?, ?, ?,?);`;
    insurance?.map(async (insurance) => {
      const values3 = [
        insurance.policyNumber,
        insurance.groupNumber,
        insurance.company,
        insurance.plan,
        insurance.expirationDate,
        insurance.type,
        insurance.effectiveDate,
        insertedId,
      ];
      const [insuranceResult] = await connection.query(sql3, values3);
    });

    const sql4 = `INSERT INTO patient_medication (
  patient_id,
  name,
  dosage,
  frequency,
  prescribedBy,
  startDate,
  endDate,
  status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`;
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
  created_by
) VALUES (?, ?, ?);`;
    notes?.map(async (note) => {
      const values6 = [insertedId, note.note, user_id];
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
    const { patientId } = req.query;
    // console.log(patientId)
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
    END AS status
  FROM user_profiles 
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
      `SELECT date, icd10, diagnosis, status ,id,type
       FROM patient_diagnoses WHERE patient_id = ?`,
      [patientId]
    );

    // Get notes
    const [notes] = await connection.query(
      `SELECT note, created, created_by ,note_id FROM notes WHERE patient_id = ?`,
      [patientId]
    );
    const [tasks] = await connection.query(
      `SELECT * FROM tasks WHERE patient_id = ?`,
      [patientId]
    );

    // Compose full response
    if(profile){
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
      allergies,
      insurance: insurances,
      currentMedications,
      diagnosis,
      notes,
      tasks,
      createdBy: notes?.[0]?.created_by || null,
      patientId,
    };
    return res.status(200).json({
      success: true,
      message: "Patient data fetched successfully",
      data: response,
    });
  }else{
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
      height,
      weight,
      bmi,
      status,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      zipCode,
      bloodPressure,
      heartRate,
      temperature,
      patientId, // for WHERE clause
    ];
    await connection.query(profileQuery, profileValues);

    // 2. Update users table (username = email)
    await connection.query(`UPDATE users SET username = ? WHERE user_id = ?`, [
      email,
      patientId,
    ]);








    // 6. Update diagnosis
    if (diagnosis && diagnosis.length > 0) {
      console.log(`Deleting old diagnoses for patient_id = ${patientId}`);
      
      // Step 1: Delete old entries ONCE
      await connection.query(
        `DELETE FROM patient_diagnoses WHERE patient_id = ?`,
        [patientId]
      );
    
      for (const diag of diagnosis) {
        if (diag.id) {
          await connection.query(
            `INSERT INTO patient_diagnoses (id, date, icd10, diagnosis, status, patient_id, type)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [diag.id, diag.date, diag.icd10, diag.diagnosis, diag.status, patientId, diag.type]
          );
          console.log("Inserted with existing ID:", diag.id);
        } else {
          await connection.query(
            `INSERT INTO patient_diagnoses (date, icd10, diagnosis, status, patient_id, type)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [diag.date, diag.icd10, diag.diagnosis, diag.status, patientId, diag.type]
          );
          console.log("Inserted new diagnosis entry without ID");
        }
      }
    
      console.log("All new diagnosis entries inserted for patient:", patientId);
    } else {
      console.log("No diagnosis entries provided; skipping update.");
    }




    // 1. Allergies
    for (const allergy of allergies || []) {
      console.log("Processing allergy:", allergy);

      if (allergy.id) {
        const [result] = await connection.query(
          `UPDATE allergies SET category = ?, allergen = ?, reaction = ? WHERE id = ? AND patient_id = ?`,
          [allergy.category, allergy.allergen, allergy.reaction, allergy.id, patientId]
        );
        console.log("Updated allergy ID:", allergy.id, result);
      } else {
        const [result] = await connection.query(
          `INSERT INTO allergies (category, allergen, reaction, patient_id) VALUES (?, ?, ?, ?)`,
          [allergy.category, allergy.allergen, allergy.reaction, patientId]
        );
        console.log("Inserted new allergy:", result);
      }
    }

    // 2. Insurance
    for (const ins of insurance || []) {
      console.log("Processing insurance:", ins);

      if (ins.patient_insurance_id) {
        const [result] = await connection.query(
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
        console.log("Updated insurance ID:", ins.patient_insurance_id, result);
      } else {
        const [result] = await connection.query(
          `INSERT INTO patient_insurances (
        insurance_policy_number, insurance_group_number, insurance_company,
        insurance_plan, insurance_expiry, insurance_type, effective_date, fk_userid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ins.policyNumber, ins.groupNumber, ins.company,
            ins.plan, ins.expirationDate, ins.type, ins.effectiveDate,
            patientId
          ]
        );
        console.log("Inserted new insurance:", result);
      }
    }

    // 3. Medications
    for (const med of currentMedications || []) {
      console.log("Processing medication:", med);

      if (med.id) {
        const [result] = await connection.query(
          `UPDATE patient_medication SET
        name = ?, dosage = ?, frequency = ?, prescribedBy = ?, startDate = ?, endDate = ?, status = ?
       WHERE id = ? AND patient_id = ?`,
          [
            med.name, med.dosage, med.frequency, med.prescribedBy,
            med.startDate, med.endDate, med.status, med.id, patientId
          ]
        );
        console.log("Updated medication ID:", med.id, result);
      } else {
        const [result] = await connection.query(
          `INSERT INTO patient_medication (
        name, dosage, frequency, prescribedBy, startDate, endDate, status, patient_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            med.name, med.dosage, med.frequency, med.prescribedBy,
            med.startDate, med.endDate, med.status, patientId
          ]
        );
        console.log("Inserted new medication:", result);
      }
    }

    // 4. Notes
    for (const note of notes || []) {
      console.log("Processing note:", note);

      if (note.note_id) {
        const [result] = await connection.query(
          `UPDATE notes SET note = ? WHERE note_id = ? AND patient_id = ?`,
          [note.note, note.note_id, patientId]
        );
        console.log("Updated note ID:", note.note_id, result);
      } else {
        const [result] = await connection.query(
          `INSERT INTO notes (note, patient_id, created, created_by) VALUES (?, ?, ?, ?)`,
          [note.note, patientId, note.created, note.created_by || null]
        );
        console.log("Inserted new note:", result);
      }
    }



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
    let { page = 1, limit = 10, order = "DESC", orderBy = "last_visit" } = req.query;

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
    address_line AS address
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
           WHERE patient_id = ?`,
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
  END AS status
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
    status
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
        frequency_type  
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      title,
      user_id,
      frequency,
      patientId,
      status,
      description,
      priority,
      dueDate,
      type,
      duration,
      frequencyType
    ];

    const [result] = await connection.query(sql, values);

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
  const { note, type, patientId } = { ...req.body, ...req.query };
  const { user_id } = req.user;
  try {


    const [notes] = await connection.query(
      `INSERT INTO notes(
    patient_id,
    note,
    type,
    created_by
  ) VALUES(?, ?, ?, ?);`,
      [patientId, note, type, user_id]
    );

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
console.log(upcomingTasks,overdueTasks)
  res.json({
    patient_id: patientId,
    upcoming: upcomingTasks,
    overdue: overdueTasks
  });
};
const addPatientAllergy = async (req, res) => {
  const { category, allergen, reaction, patientId } = { ...req.body, ...req.query };

  if (!category || !allergen || !reaction || !patientId) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    const sql = `INSERT INTO allergies (category, allergen, reaction, patient_id) VALUES (?, ?, ?, ?)`;
    const [result] = await connection.execute(sql, [
      category,
      allergen,
      reaction,
      patientId,
    ]);
    res.status(201).json({ message: 'Allergy added', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'DB error', error: error.message });
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
    !plan || !expirationDate || !type || !effectiveDate || !fk_userid
  ) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

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


    res.status(201).json({
      message: 'Insurance record added successfully',
      patient_insurance_id: result.insertId,
    });

  } catch (error) {
    console.error('DB Error:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};
const addPatientMedication = async (req, res) => {
  const {
    patientId,
    name,
    dosage,
    frequency,
    prescribedBy,
    startDate,
    endDate,
    status,
  } = { ...req.body, ...req.query };

  // Basic validation
  if (
    !patientId || !name || !dosage || !frequency ||
    !prescribedBy || !startDate || !endDate || !status
  ) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const sql = `
      INSERT INTO patient_medication (
        patient_id,
        name,
        dosage,
        frequency,
        prescribedBy,
        startDate,
        endDate,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      patientId,
      name,
      dosage,
      frequency,
      prescribedBy,
      startDate,
      endDate,
      status,
    ];

    const [result] = await connection.execute(sql, values);

    res.status(201).json({
      message: 'Medication added successfully',
      medication_id: result.insertId,
    });
  } catch (error) {
    console.error('Error adding medication:', error.message);
    res.status(500).json({ message: 'Database error', error: error.message });
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
  addPatientMedication
};

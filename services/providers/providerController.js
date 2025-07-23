const bcrypt = require("bcryptjs");
const connection = require("../../config/db");
const logAudit = require("../../utils/logAudit");

// Create patient

const getAllOrganizations = async (req, res) => {
  try {
    const query =
      "SELECT organization_id, organization_name FROM organizations";
    const [rows] = await connection.query(query);

    res.status(200).json({
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
const getAllPractices = async (req, res) => {
  try {
    const query = "SELECT practice_id,practice_name FROM `practices`";
    const [rows] = await connection.query(query);

    res.status(200).json({
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
const updateUserMapping = async (req, res) => {
  const { providerId, organizationId, practiceId } = req.body;

  if (!providerId || !organizationId || !practiceId) {
    return res.status(400).json({
      success: false,
      message: "providerId, organizationId, and practiceId are required",
    });
  }

  try {
    // Check if a mapping already exists
    const checkQuery = `
        SELECT * FROM users_mappings 
        WHERE user_id = ? LIMIT 1
      `;
    const [existing] = await connection.query(checkQuery, [providerId]);

    if (existing.length > 0) {
      // Update existing mapping
      const updateQuery = `
          UPDATE users_mappings 
          SET organizations_id = ?, practice_id = ? ,fk_role_id=?
          WHERE user_id = ?
        `;
      await connection.query(updateQuery, [
        organizationId,
        practiceId,
        6,
        providerId,
      ]);
    } else {
      // Insert new mapping
      const insertQuery = `
          INSERT INTO users_mappings (user_id, organizations_id, practice_id,fk_role_id) 
          VALUES (?, ?, ?,?)
        `;
      await connection.query(insertQuery, [
        providerId,
        organizationId,
        practiceId,
        6,
      ]);
    }

    // Log audit for user mapping update
    try {
      await logAudit(req, 'UPDATE', 'USER_MAPPING', providerId, 'Updated user mapping for provider');
    } catch (auditError) {
      console.error('Audit logging error:', auditError);
    }

    res.status(200).json({
      success: true,
      message: "User mapping saved successfully",
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const getProviders = async (req, res) => {
  try {
    const query =
      "SELECT u.user_id,up.firstname,up.lastname,u.username as email FROM users u LEFT JOIN user_profiles up ON up.fk_userid = u.user_id WHERE u.fk_roleid= 6;";
    const [rows] = await connection.query(query);

    res.status(200).json({
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

const updateProviderInformation = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { npi, taxonomy, taxId, faxId,firstName,lastName } = req.body;

    if (!user_id) {
      return res.status(400).json({success:false, message: 'Missing userId in request params.' });
    }

    const sql = `
      UPDATE user_profiles
      SET npi = ?, taxonomy = ?, tax_id = ?, fax = ?,firstname=?,lastname=?
      WHERE fk_userid = ?
    `;

    const values = [
      npi || '',
      taxonomy || '',
      taxId || '',
      faxId || '',
      firstName,
      lastName,
      user_id
    ];

    const [result] = await connection.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success:false,message: 'User not found.' });
    }

    // Log audit for provider information update
    try {
      await logAudit(req, 'UPDATE', 'PROVIDER_INFO', user_id, 'Updated provider information');
    } catch (auditError) {
      console.error('Audit logging error:', auditError);
    }

    return res.status(200).json({ success:true,message: 'Provider information updated successfully.' });
  } catch (error) {
    console.error('Error updating provider information:', error);
    return res.status(500).json({ success:false,message: 'Internal server error.' });
  }
};
const getProviderInformation = async (req, res) => {
  try {

    const { user_id } = req.user;


    if (!user_id) {
      return res.status(400).json({ message: 'Missing userId in request params.' });
    }

    const sql = `
   SELECT
  IFNULL(npi, '') AS npi,
  IFNULL(taxonomy, '') AS taxonomy,
  IFNULL(tax_id, '') AS taxId,
  IFNULL(fax, '') AS faxId,
  IFNULL(firstname, '') AS firstname,
  IFNULL(lastname, '') AS lastname
FROM user_profiles
WHERE fk_userid = ?
LIMIT 1

  `;

    const [rows] = await connection.query(sql, [user_id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Return the provider information
    const providerInfo = rows[0];
    return res.status(200).json({
      success: true,
      data: {
        npi: providerInfo.npi,
        taxonomy: providerInfo.taxonomy,
        taxId: providerInfo.taxId,
        faxId: providerInfo.faxId,
        firstname: providerInfo.firstname,
        lastname:providerInfo.lastname
      }
    });
  } catch (error) {
    console.error('Error updating provider information:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
const addPatientBillingNote =  async (req, res) => {
  try {
    const {
      patientId,
      category,
      duration,
      note
    } = { ...req.body, ...req.query };
    const { user_id } = req.user;
    if (!patientId  || !category || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patient_id, timed_by, category, duration are required.'
      });
    }

    // Insert
    const sql = `
      INSERT INTO patient_billing_notes
      (patient_id, timed_by, category, duration, note)
      VALUES (?, ?, ?, ?, ?)
    `;

    const values = [
      patientId,
      user_id,
      category,
      duration,
      note || 'Note Not provided'
    ];
    const [result] = await connection.query(sql, values);

    // Log audit for billing note creation
    try {
      await logAudit(req, 'CREATE', 'BILLING_NOTE', patientId, `Added billing note for patient ID: ${patientId}`);
    } catch (auditError) {
      console.error('Audit logging error:', auditError);
    }

    res.status(201).json({
      success: true,
      message: 'Billing note added successfully.'
    });
  } catch (err) {
    console.error('Error adding billing note:', err);
    res.status(500).json({success:false, message: 'Internal server error.' });
  }
};
const providerDashboardCount = async (req, res) => {
  try {
    const { user_id } = req.user;
    if (!user_id) {
      return res.status(400).json({ message: 'Missing user_id in request.' });
    }
    const sql = `
      SELECT COUNT(*) as todays_appointments
      FROM appointment
      WHERE DATE(date) = CURDATE()
      AND provider_id = ?
    `;
    const [rows] = await connection.query(sql, [user_id]);
    let todays_appointments = rows[0]?.todays_appointments || 0

    const [data] = await connection.query(`
      SELECT COUNT(DISTINCT users.user_id) AS totalPatients FROM users_mappings JOIN users ON users.user_id = users_mappings.user_id WHERE fk_physician_id = ? AND fk_role_id = 7;
    `,[user_id])
    let total_patients = data[0]?.totalPatients || 0

    const [data2] = await connection.query(`
      SELECT count(*) as teleCount  FROM appointment WHERE type LIKE '%telehealth%' AND provider_id = ?
    `,[user_id])
    const [data3] = await connection.query(`
      SELECT count(*) as pendingCount  FROM appointment WHERE status LIKE '%pending%' AND provider_id = ?
    `,[user_id])
    let teleCount = data2[0]?.teleCount || 0;
    let pendingCount = data3[0]?.pendingCount;
    res.status(200).json({
      success: true,
      data: {
        todays_appointments,
        total_patients,
        teleCount,
        pendingCount
      }
    });
  } catch (err) {
    console.error('Error getting provider dashboard count:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const patientsMedications = async (req, res) => {
  try {
    const { user_id } = req.user;
    if (!user_id) {
      return res.status(400).json({ message: 'Missing user_id in request.' });
    }
    const sql = `SELECT pm.*,CONCAT(up.firstname," ",up.lastname) as patient_name FROM patient_medication pm LEFT JOIN users_mappings um ON um.user_id = pm.patient_id JOIN user_profiles up ON up.fk_userid = pm.patient_id WHERE um.fk_physician_id = ? ORDER BY pm.id DESC`;
    const [rows] = await connection.query(sql, [user_id]);

    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error('Error getting provider dashboard count:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  getAllOrganizations,
  getAllPractices,
  updateUserMapping,
  getProviders,
  updateProviderInformation,
  getProviderInformation,
  addPatientBillingNote,
  providerDashboardCount,
  patientsMedications
};

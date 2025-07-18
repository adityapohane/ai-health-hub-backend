const bcrypt = require("bcryptjs");
const connection = require("../config/db");

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
    await connection.query(sql, values);

    res.status(201).json({
      success: true,
      message: 'Billing note added successfully.'
    });
  } catch (err) {
    console.error('Error adding billing note:', err);
    res.status(500).json({success:false, message: 'Internal server error.' });
  }
};

module.exports = {
  getAllOrganizations,
  getAllPractices,
  updateUserMapping,
  getProviders,
  updateProviderInformation,
  getProviderInformation,
  addPatientBillingNote
};

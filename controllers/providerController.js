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

module.exports = {
  getAllOrganizations,
  getAllPractices,
  updateUserMapping,
};

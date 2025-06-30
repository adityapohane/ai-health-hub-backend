const connection = require("../config/db");
const AWS = require("aws-sdk");

const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");


AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION, // e.g. 'ap-south-1'
});

const s3 = new AWS.S3();

const updateModule = async (userId, moduleKey, value) => {
  try {
    const query = `
      UPDATE users
      SET modules = JSON_SET(modules, ?, ?)
      WHERE id = ?`;
    const path = `$.${moduleKey}`;
    const [result] = await connection.promise().query(query, [path, value, userId]);

    if (result.affectedRows === 0) throw new Error("User not found");

    const [user] = await connection
      .promise()
      .query(`SELECT id, email, modules FROM users WHERE id = ?`, [userId]);

    return user[0];
  } catch (error) {
    console.error(`Error updating module '${moduleKey}' for user ${userId}:`, error);
    throw new Error(`Failed to update module '${moduleKey}'`);
  }
};

const getAllModules = async (userId) => {
  try {
    const [rows] = await connection
      .promise()
      .query(`SELECT modules FROM users WHERE id = ?`, [userId]);

    if (rows.length === 0) throw new Error("User not found");

    return rows[0].modules;
  } catch (error) {
    console.error("Error fetching modules:", error);
    throw new Error("Failed to get all modules");
  }
};

// Define service factory
const createService = (key) => ({
  enable: (userId) => updateModule(userId, key, true),
  disable: (userId) => updateModule(userId, key, false),
});





const pdfHeaders = async (req, res) => {
  try {
    const { providerId, pdfHeaderConfig } = req.body;
    const config = JSON.parse(pdfHeaderConfig);
    const logoFile = req.files?.logo;

    // 1. Check if provider config already exists
    const [existing] = await connection.execute(
      `SELECT * FROM pdf_header_configs WHERE providerId = ?`,
      [providerId]
    );

    let logoUrl = existing.length > 0 ? existing[0].logo_url : null;

    // 2. Upload new logo only if file uploaded
    if (logoFile?.tempFilePath) {
      const fileExtension = path.extname(logoFile.name);
      const fileName = `logos/${uuidv4()}${fileExtension}`;
      const fileBuffer = fs.readFileSync(logoFile.tempFilePath);

      const s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key: fileName,
        Body: fileBuffer,
        ContentType: logoFile.mimetype,

      };

      const uploadResult = await s3.upload(s3Params).promise();
      logoUrl = uploadResult.Location;
    }

    const values = [
      config.logo?.enabled || false,
      logoUrl,
      config.organizationName?.enabled || false,
      config.organizationName?.value || null,
      config.address?.enabled || false,
      config.address?.value || null,
      config.phone?.enabled || false,
      config.phone?.value || null,
      config.email?.enabled || false,
      config.email?.value || null,
      config.website?.enabled || false,
      config.website?.value || null,
      config.fax?.enabled || false,
      config.fax?.value || null,
      config.licenseNumber?.enabled || false,
      config.licenseNumber?.value || null,
    ];

    if (existing.length > 0) {
      // ✅ UPDATE existing config
      const updateSql = `
        UPDATE pdf_header_configs SET
          logo_enabled = ?, logo_url = ?,
          organization_name_enabled = ?, organization_name_value = ?,
          address_enabled = ?, address_value = ?,
          phone_enabled = ?, phone_value = ?,
          email_enabled = ?, email_value = ?,
          website_enabled = ?, website_value = ?,
          fax_enabled = ?, fax_value = ?,
          license_number_enabled = ?, license_number_value = ?
        WHERE providerId = ?
      `;

      await connection.execute(updateSql, [...values, providerId]);
    } else {
      // ✅ INSERT new config
      const insertSql = `
        INSERT INTO pdf_header_configs (
          providerId,
          logo_enabled, logo_url,
          organization_name_enabled, organization_name_value,
          address_enabled, address_value,
          phone_enabled, phone_value,
          email_enabled, email_value,
          website_enabled, website_value,
          fax_enabled, fax_value,
          license_number_enabled, license_number_value
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.execute(insertSql, [providerId, ...values]);
    }

    res.status(200).json({
      success: true,
      message: "PDF header configuration saved successfully",
      logoUrl,
    });
  } catch (error) {
    console.error("❌ Internal error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};



const getPdfHeaderByProvider = async (req, res) => {
  try {
    const { providerId } = req.query;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Missing providerId",
      });
    }

    const [rows] = await connection.execute(
      `SELECT * FROM pdf_header_configs WHERE providerId = ?`,
      [providerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No configuration found for this provider",
      });
    }

    res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("❌ GET config error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};



// Export all services
module.exports = {
  rpmService: createService("rpm"),
  tcmService: createService("tcm"),
  ccmService: createService("ccm"),
  bhiService: createService("bhi"),
  pcmService: createService("pcm"),
  aiCarePlansService: createService("aiCarePlans"),
  aiPhoneSystemService: createService("aiPhoneSystem"),
  patientOverviewService: createService("patientOverview"),
  getAllModules,
  pdfHeaders,
  getPdfHeaderByProvider
};

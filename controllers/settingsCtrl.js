const connection = require("../config/db");

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
};

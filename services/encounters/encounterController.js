const connection = require("../../config/db");
const moment = require("moment");
const logAudit = require("../../utils/logAudit");

const createEncounterTemplate = async (req, res) => {
  const {
    template_name,
    encounter_type,
    default_reason,
    default_notes,
    default_diagnosis_codes,
    default_procedure_codes
  } = { ...req.body, ...req.query };
  const user_id = req.user.user_id;
  try {
    const [result] = await connection.query(
      `INSERT INTO encounter_templates (
          template_name, encounter_type,
          default_reason, default_notes,
          default_diagnosis_codes, default_procedure_codes,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        template_name, encounter_type,
        default_reason, default_notes,
        default_diagnosis_codes, default_procedure_codes,
        user_id
      ]
    );

    await logAudit(req, 'CREATE', 'ENCOUNTER_TEMPLATE', 0, `Encounter template created: ${template_name}`);
    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template_id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create template', details: error.message });
  }
};

const getEncounterTemplates = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const  {templateId} = { ...req.params, ...req.query };
    let sql = `SELECT * FROM encounter_templates WHERE created_by = ${userId}`;
    
    if(templateId){
      sql += ` AND template_id = ${templateId}`;
    }
    sql += ` order by created DESC`;
    const [templates] = await connection.query(
     sql,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error("Get Encounter Templates Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
const getProviderEncounterTemplates = async (req, res) => { 
  try {
    const userId = req.user.user_id;
    const  {templateId} = { ...req.params, ...req.query };
    let sql = `SELECT template_id,encounter_name, encounter_type, visit_type, is_default, is_active, soap_structure, billing_codes, created_by,created  FROM providers_encounter_template WHERE created_by = ${userId}`;
    
    if(templateId){
      sql += ` AND template_id = ${templateId}`;
    }
    sql += ` order by created DESC`;
    const [templates] = await connection.query(
     sql,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error("Get Encounter Templates Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

const getEncounterTemplateById = async (req, res) => {
  const { templateId } = { ...req.params, ...req.query };

  try {
    const [rows] = await connection.query(
      `SELECT * FROM encounter_templates WHERE template_id = ?`,
      [templateId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get template' });
  }
};
const deleteTemplateById = async (req, res) => {
  const { templateId } = { ...req.params, ...req.query };

  try {
    await connection.query(
      `DELETE FROM encounter_templates WHERE template_id = ?`,
      [templateId]
    );

    await logAudit(req, 'DELETE', 'ENCOUNTER_TEMPLATE', req.user.user_id, 'Encounter template deleted');
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
};    
const updateTemplateById = async (req, res) => {
  const { template_id } = { ...req.params, ...req.query };
  const {
    template_name,
    encounter_type,
    default_reason,
    default_notes,
    default_diagnosis_codes,
    default_procedure_codes
  } = req.body;

  try {
    await connection.query(
      `UPDATE encounter_templates SET
          template_name = ?, encounter_type = ?, default_reason = ?,
          default_notes = ?, default_diagnosis_codes = ?, default_procedure_codes = ?
        WHERE template_id = ?`,
      [
        template_name, encounter_type, default_reason,
        default_notes, default_diagnosis_codes, default_procedure_codes,
        template_id
      ]
    );

    await logAudit(req, 'UPDATE', 'ENCOUNTER_TEMPLATE', req.user.user_id, `Encounter template updated: ${template_name}`);
    res.json({ success: true, message: 'Template updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update template' });
  }
};

const createEncounter = async (req, res) => {
  const {
    patientId, templateId,
    encounterType, reasonForVisit, notes,
    diagnosisCodes, procedureCodes, followUpPlan,
    status = 'Draft'
  } = { ...req.body, ...req.query };
  const user_id = req.user.user_id;
  try {
    const [result] = await connection.query(
      `INSERT INTO encounters (
          patient_id, provider_id, template_id,
          encounter_type, reason_for_visit, notes,
          diagnosis_codes, procedure_codes, follow_up_plan, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId, user_id, templateId,
        encounterType, reasonForVisit, notes,
        diagnosisCodes, procedureCodes, followUpPlan, status
      ]
    );

    await logAudit(req, 'CREATE', 'ENCOUNTER', req.user.user_id, `Encounter created for patient ${patientId}`);
    res.status(201).json({
      success: true,
      message: 'Encounter created',
      encounter_id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create encounter', details: error.message });
  }
};
const getAllEncounters = async (req, res) => {
  const { patientId } = { ...req.params, ...req.query };
  try {
    let sql=  `SELECT * FROM encounters WHERE provider_id = ? ${patientId ? `AND patient_id = ${patientId}` : ''} ORDER BY created DESC`;
    // console.log(sql)
    const [rows] = await connection.query(
     sql,
      [req.user.user_id]
    );
    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch encounters' });
  }
};
const getEncounterById = async (req, res) => {
  const { encounterId } = { ...req.params, ...req.query };
  try {
    const [rows] = await connection.query(
      `SELECT * FROM encounters WHERE encounter_id = ?`,
      [encounterId]
    );
    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch encounter' });
  }
};
const updateEncounterById = async (req, res) => {
  const { encounterId } = { ...req.params, ...req.query };
  const {
    patientId, templateId,
    encounterType, reasonForVisit, notes,
    diagnosisCodes, procedureCodes, followUpPlan,
    status = 'Draft'
  } = { ...req.body, ...req.query };
  try {
    await connection.query(
      `UPDATE encounters SET
          patient_id = ?, template_id = ?,
          encounter_type = ?, reason_for_visit = ?, notes = ?,
          diagnosis_codes = ?, procedure_codes = ?, follow_up_plan = ?, status = ?
        WHERE encounter_id = ?`,
      [
        patientId, templateId,
        encounterType, reasonForVisit, notes,
        diagnosisCodes, procedureCodes, followUpPlan, status,
        encounterId
      ]
    );

    await logAudit(req, 'UPDATE', 'ENCOUNTER', req.user.user_id, `Encounter updated for patient ${patientId}`);
    res.json({ success: true, message: 'Encounter updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update encounter' });
  }
};
const deleteEncounterById = async (req, res) => {
  const { encounterId } = req.params; // or req.query

  if (!encounterId) {
    return res.status(400).json({ success: false, message: 'Missing encounterId' });
  }

  try {
    const [result] = await connection.query(
      `DELETE FROM encounters WHERE encounter_id = ?`,
      [encounterId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Encounter not found' });
    }

    await logAudit(req, 'DELETE', 'ENCOUNTER', encounterId, 'Encounter deleted');
    res.json({ success: true, message: 'Encounter deleted successfully' });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ success: false, error: 'Failed to delete encounter' });
  }
};
const addEncounterTemplate = async (req, res) => {
  try {
    const {
      name:encounter_name, specialty:encounter_type, visitType,
      isDefault, isActive,
      soapStructure, billingCodes
    } = req.body;
    const [result] = await connection.query(
      `INSERT INTO providers_encounter_template 
        (encounter_name, encounter_type, visit_type, is_default, is_active, soap_structure, billing_codes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        encounter_name,
        encounter_type,
        visitType,
        isDefault || false,
        isActive || true,
        JSON.stringify(soapStructure),
        JSON.stringify(billingCodes),
        req.user.user_id
      ]
    );

    res.status(200).json({
      success: true,
      message: "Template saved successfully",
      template_id: result.insertId
    });

  } catch (err) {
    console.error("Add Template Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to save template",
      error: err.message
    });
  }
};

module.exports = {
  createEncounterTemplate,
  getEncounterTemplates,
  getEncounterTemplateById,
  deleteTemplateById,
  updateTemplateById,
  createEncounter,
  getAllEncounters,
  getEncounterById,
  updateEncounterById,
  deleteEncounterById,
  addEncounterTemplate,
  getProviderEncounterTemplates
};

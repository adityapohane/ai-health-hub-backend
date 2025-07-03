const connection = require('../config/db');

// Get all tasks for a patient
const getAllPatientTasks = async (req, res) => {
  const { patientId } = req.query;
  try {
    const [tasks] = await connection.query(
      `SELECT * FROM patients_tasks WHERE patient_id = ?`, [patientId]
    );
    res.json({ success: true, data: tasks });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// Create a new task
const addTask = async (req, res) => {
  const {
    patientId, providerId, title, description, task_notes,  
    due_date, estimated_duration, condition_based,
    required_conditions, auto_generated, ai_confidence_score
  } = req.body;

  try {
    const [result] = await connection.query(
      `INSERT INTO patients_tasks
       (patient_id, provider_id, title, description, task_notes, due_date,
        estimated_duration, condition_based, required_conditions,
        auto_generated, ai_confidence_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patientId, providerId, title, description, task_notes,
       due_date, estimated_duration, condition_based,
       JSON.stringify(required_conditions),
       auto_generated, ai_confidence_score]
    );
    res.json({ success: true, insertId: result.insertId });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// Update an existing task
const updateTask = async (req, res) => {
  const { id } = req.params;
  const updates = req.body; // fields to update
  const setClauses = [];
  const params = [];

  for (let [k, v] of Object.entries(updates)) {
    setClauses.push(`${k} = ?`);
    params.push(k === 'required_conditions' ? JSON.stringify(v) : v);
  }
  params.push(id);

  try {
    await connection.query(
      `UPDATE patients_tasks SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );
    res.json({ success: true, message: 'Updated' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// Delete a task
const deleteTask = async (req, res) => {
  try {
    await connection.query(`DELETE FROM patients_tasks WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// ========== AI & Analytics ==========
async function getTaskAnalytics(req, res) {
  const { patientId } = req.query;
  try {
    const [analytics] = await db.query(`
      SELECT 
        COUNT(*) AS total_tasks,
        SUM(status = 'completed') AS completed_tasks,
        SUM(due_date < NOW() AND status != 'completed') AS overdue_tasks,
        AVG(actual_duration) AS avg_completion_time,
        (SUM(status = 'completed') / COUNT(*)) * 100 AS compliance_rate
      FROM patients_tasks 
      WHERE patient_id = ?
    `, [patientId]);
    res.json({ success: true, data: analytics[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getTaskRecommendations(req, res) {
  const { patientId } = req.query;
  try {
    const [recommendations] = await db.query(`
      SELECT * FROM ai_task_recommendations
      WHERE patient_id = ?
      ORDER BY confidence_score DESC
    `, [patientId]);
    res.json({ success: true, data: recommendations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function generateAutomatedTasks(req, res) {
  const { patientId, providerId, conditions } = req.body;
  try {
    const [templates] = await db.query(`SELECT * FROM workflow_templates`);
    const matchedTemplates = templates.filter(tpl => {
      const required = JSON.parse(tpl.conditions || '[]');
      return required.every(cond => conditions.includes(cond));
    });

    const inserts = [];
    for (let tpl of matchedTemplates) {
      const tasks = JSON.parse(tpl.tasks || '[]');
      for (let t of tasks) {
        inserts.push([
          patientId, providerId, t.title, t.description,
          t.task_notes || null, t.estimated_duration || 30,
          false, false, null, true, tpl.id, tpl.name, t.ai_confidence_score || 0.8
        ]);
      }
    }

    if (inserts.length > 0) {
      await db.query(`
        INSERT INTO patients_tasks
        (patient_id, provider_id, title, description, task_notes, estimated_duration,
         condition_based, auto_generated, required_conditions,
         status, workflow_template_id, source_workflow_name, ai_confidence_score)
        VALUES ?
      `, [inserts]);
    }

    res.json({ success: true, generatedTasks: inserts.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ========== Time Tracking ==========
async function startTaskTimer(req, res) {
  const { taskId, patientId, providerId, activity_type } = req.body;
  try {
    const [result] = await db.query(`
      INSERT INTO task_time_entries
      (task_id, patient_id, provider_id, activity_type, start_time)
      VALUES (?, ?, ?, ?, NOW())
    `, [taskId, patientId, providerId, activity_type]);
    res.json({ success: true, entryId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function stopTaskTimer(req, res) {
  const { entryId } = req.body;
  try {
    await db.query(`
      UPDATE task_time_entries
      SET end_time = NOW(),
          duration_minutes = TIMESTAMPDIFF(MINUTE, start_time, NOW())
      WHERE id = ?
    `, [entryId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getTaskTimeEntries(req, res) {
  const { patientId } = req.query;
  try {
    const [entries] = await db.query(`
      SELECT * FROM task_time_entries
      WHERE patient_id = ?
      ORDER BY start_time DESC
    `, [patientId]);
    res.json({ success: true, data: entries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ========== Workflow ==========
async function createWorkflowTemplate(req, res) {
  const { name, description, category, estimated_duration, tasks, conditions } = req.body;
  try {
    const [result] = await db.query(`
      INSERT INTO workflow_templates
      (name, description, category, estimated_duration, tasks, conditions)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      name, description, category, estimated_duration,
      JSON.stringify(tasks), JSON.stringify(conditions)
    ]);
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function applyWorkflow(req, res) {
  const { templateId, patientId, providerId } = req.body;
  try {
    const [[tpl]] = await db.query(`SELECT * FROM workflow_templates WHERE id = ?`, [templateId]);
    const tasks = JSON.parse(tpl.tasks || '[]');
    const inserts = tasks.map(t => [
      patientId, providerId, t.title, t.description, t.task_notes || null,
      t.estimated_duration || 30, true, true, JSON.stringify(t.required_conditions || []),
      'pending', templateId, tpl.name, t.ai_confidence_score || 0.85
    ]);
    await db.query(`
      INSERT INTO patients_tasks
      (patient_id, provider_id, title, description, task_notes, estimated_duration,
       condition_based, auto_generated, required_conditions,
       status, workflow_template_id, source_workflow_name, ai_confidence_score)
      VALUES ?
    `, [inserts]);
    res.json({ success: true, appliedTasks: inserts.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getWorkflowTemplates(req, res) {
  try {
    const [templates] = await db.query(`SELECT * FROM workflow_templates`);
    res.json({ success: true, data: templates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ========== Compliance ==========
async function getComplianceReport(req, res) {
  const { patientId } = req.query;
  try {
    const [report] = await db.query(`
      SELECT
        COUNT(*) AS total_tasks,
        SUM(status = 'completed') AS completed_tasks,
        SUM(due_date < NOW() AND status != 'completed') AS overdue_tasks,
        AVG(actual_duration) AS avg_completion_time,
        (SUM(status = 'completed') / COUNT(*)) * 100 AS compliance_rate
      FROM patients_tasks
      WHERE patient_id = ?
    `, [patientId]);
    res.json({ success: true, data: report[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getQualityMetrics(req, res) {
  const { patientId } = req.query;
  try {
    const [metrics] = await db.query(`
      SELECT
        AVG(estimated_duration) AS avg_estimated_time,
        AVG(actual_duration) AS avg_actual_time,
        SUM(CASE WHEN actual_duration > estimated_duration THEN 1 ELSE 0 END) AS over_time_tasks,
        SUM(CASE WHEN actual_duration < estimated_duration THEN 1 ELSE 0 END) AS under_time_tasks
      FROM patients_tasks
      WHERE patient_id = ?
    `, [patientId]);
    res.json({ success: true, data: metrics[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getTaskAnalytics,
  getTaskRecommendations,
  generateAutomatedTasks,
  startTaskTimer,
  stopTaskTimer,
  getTaskTimeEntries,
  createWorkflowTemplate,
  applyWorkflow,
  getWorkflowTemplates,
  getComplianceReport,
  getQualityMetrics,
  getAllPatientTasks,
  addTask,
  updateTask,
  deleteTask
};


 
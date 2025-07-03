const db = require('../config/db');


// CREATE template
exports.createWorkflow = async (req, res) => {
  const { id, name, description, category, estimated_duration, provider_id, created_at, tasks, conditions } = req.body;

  try {
    await db.query(
      `INSERT INTO work_flows_template (id, name, description, category, estimated_duration, provider_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description, category, estimated_duration, provider_id, created_at]
    );

    for (const task of tasks) {
      await db.query(
        `INSERT INTO template_tasks (template_id, title, description, estimated_duration, ai_confidence_score)
         VALUES (?, ?, ?, ?, ?)`,
        [id, task.title, task.description, task.estimated_duration, task.ai_confidence_score]
      );
    }

    for (const condition of conditions) {
      await db.query(
        `INSERT INTO template_conditions (template_id, condition_name)
         VALUES (?, ?)`,
        [id, condition]
      );
    }

    res.json({ success: true, message: 'Workflow template created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// GET by providerId
exports.getByProvider = async (req, res) => {
  const { providerId } = req.params;
  try {
    const [templates] = await db.query(
      `SELECT * FROM work_flows_template WHERE provider_id = ?`,
      [providerId]
    );

    for (const template of templates) {
      const [tasks] = await db.query(`SELECT * FROM template_tasks WHERE template_id = ?`, [template.id]);
      const [conditions] = await db.query(`SELECT condition_name FROM template_conditions WHERE template_id = ?`, [template.id]);

      template.tasks = tasks;
      template.conditions = conditions.map(c => c.condition_name);
    }

    console.log(templates);
    res.json({
      success: true,
      data: templates,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
    });
  }
};


// UPDATE
exports.updateWorkflow = async (req, res) => {
  const { id } = req.params;
  const { name, description, category, estimated_duration, provider_id, tasks, conditions } = req.body;

  try {
    await db.query(
      `UPDATE work_flows_template SET name=?, description=?, category=?, estimated_duration=?, provider_id=? WHERE id=?`,
      [name, description, category, estimated_duration, provider_id, id]
    );

    // Clear old tasks and conditions
    await db.query(`DELETE FROM template_tasks WHERE template_id = ?`, [id]);
    await db.query(`DELETE FROM template_conditions WHERE template_id = ?`, [id]);

    // Re-insert updated
    for (const task of tasks) {
      await db.query(
        `INSERT INTO template_tasks (template_id, title, description, estimated_duration, ai_confidence_score)
         VALUES (?, ?, ?, ?, ?)`,
        [id, task.title, task.description, task.estimated_duration, task.ai_confidence_score]
      );
    }

    for (const condition of conditions) {
      await db.query(`INSERT INTO template_conditions (template_id, condition_name) VALUES (?, ?)`, [id, condition]);
    }

    res.json({ success: true, message: 'Workflow template updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Update failed' });
  }
};

// DELETE
exports.deleteWorkflow = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query(`DELETE FROM work_flows_template WHERE id = ?`, [id]); // Cascade deletes tasks & conditions

    res.json({ success: true, message: 'Workflow deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Delete failed' });
  }
};

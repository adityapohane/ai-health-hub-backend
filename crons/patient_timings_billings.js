const dotenv = require('dotenv');
dotenv.config();
const cron = require('node-cron');
const connection = require('../config/db');

const now = new Date();
const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 19).replace('T', ' ');
const endDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

const isCptCodeBilled = async (patient_id, code_id, units = null) => {
  let sql = `SELECT 1 FROM cpt_billing WHERE patient_id = ? AND cpt_code_id = ? AND created BETWEEN '${startDate}' AND '${endDate}'`;
  const params = [patient_id, code_id];

  if (units !== null) {
    sql += ` AND code_units = ?`;
    params.push(units);
  }

  const [rows] = await connection.execute(sql, params);
  return rows.length > 0;
};

const handleRPM = async (patient_id, total_minutes, queries) => {
  if (total_minutes >= 20 && total_minutes < 40) {
    if (!await isCptCodeBilled(patient_id, 6)) {
      queries.push({ sql: `INSERT INTO cpt_billing (patient_id, cpt_code_id) VALUES (?, ?)`, params: [patient_id, 6] });
    }
  } else if (total_minutes >= 40 && total_minutes < 60) {
    // 99457 + 99458 (1 unit)
    if (!await isCptCodeBilled(patient_id, 6)) {
      queries.push({ sql: `INSERT INTO cpt_billing (patient_id, cpt_code_id) VALUES (?, ?)`, params: [patient_id, 6] });
    }
    if (!await isCptCodeBilled(patient_id, 7, 1)) {
      queries.push({ sql: `INSERT INTO cpt_billing (patient_id, cpt_code_id, code_units) VALUES (?, ?, ?)`, params: [patient_id, 7, 1] });
    }
  } else if (total_minutes >= 60) {
    // 99457 + 99458 (2 units)
    if (!await isCptCodeBilled(patient_id, 6)) {
      queries.push({ sql: `INSERT INTO cpt_billing (patient_id, cpt_code_id) VALUES (?, ?)`, params: [patient_id, 6] });
    }
    const update = await connection.execute(
      `UPDATE cpt_billing SET code_units = ? WHERE patient_id = ? AND cpt_code_id = 7 AND DATE(created) BETWEEN ? AND ?`,
      [2, patient_id, startDate, endDate]
    );
    if (update[0].affectedRows === 0) {
      queries.push({ sql: `INSERT INTO cpt_billing (patient_id, cpt_code_id, code_units) VALUES (?, ?, ?)`, params: [patient_id, 7, 2] });
    }
  }
};
const handleCCM = async (patient_id, total_minutes, queries) => {
  if (total_minutes >= 20 && total_minutes < 40) {
    if (!await isCptCodeBilled(patient_id, 10)) {
      queries.push({
        sql: `INSERT INTO cpt_billing (patient_id, cpt_code_id) VALUES (?, ?)`,
        params: [patient_id, 10]
      });
    }
  } else if (total_minutes >= 40 && total_minutes < 60) {
    if (!await isCptCodeBilled(patient_id, 10)) {
      queries.push({
        sql: `INSERT INTO cpt_billing (patient_id, cpt_code_id) VALUES (?, ?)`,
        params: [patient_id, 10]
      });
    }
    if (!await isCptCodeBilled(patient_id, 3, 1)) {
      queries.push({
        sql: `INSERT INTO cpt_billing (patient_id, cpt_code_id, code_units) VALUES (?, ?, ?)`,
        params: [patient_id, 3, 1]
      });
    }
  } else if (total_minutes >= 60) {
    if (!await isCptCodeBilled(patient_id, 10)) {
      queries.push({
        sql: `INSERT INTO cpt_billing (patient_id, cpt_code_id) VALUES (?, ?)`,
        params: [patient_id, 10]
      });
    }

    const update = await connection.execute(
      `UPDATE cpt_billing 
       SET code_units = ? 
       WHERE patient_id = ? 
       AND cpt_code_id = 3 
       AND DATE(created) BETWEEN ? AND ?`,
      [2, patient_id, startDate, endDate]
    );

    if (update[0].affectedRows === 0) {
      queries.push({
        sql: `INSERT INTO cpt_billing (patient_id, cpt_code_id, code_units) VALUES (?, ?, ?)`,
        params: [patient_id, 3, 2]
      });
    }
  }
};
const handlePCM = async (patient_id, total_minutes, queries) => {
  if (total_minutes >= 30 && total_minutes < 60) {
    if (!await isCptCodeBilled(patient_id, 1)) {
      queries.push({
        sql: `INSERT INTO cpt_billing (patient_id, cpt_code_id) VALUES (?, ?)`,
        params: [patient_id, 1]
      });
    }
  }

  if (total_minutes >= 60) {
    if (!await isCptCodeBilled(patient_id, 1)) {
      queries.push({
        sql: `INSERT INTO cpt_billing (patient_id, cpt_code_id) VALUES (?, ?)`,
        params: [patient_id, 1]
      });
    }
    if (!await isCptCodeBilled(patient_id, 2, 1)) {
      queries.push({
        sql: `INSERT INTO cpt_billing (patient_id, cpt_code_id, code_units) VALUES (?, ?, ?)`,
        params: [patient_id, 2, 1]
      });
    }
  }
};
const checkMinutesForPatient = async () => {
  try {
    const [rpmPatients] = await connection.execute(`
      SELECT um.user_id AS patient_id, up.service_type
      FROM users_mappings um
      LEFT JOIN user_profiles up ON up.fk_userid = um.user_id
      WHERE um.fk_role_id = 7
      GROUP BY um.user_id
    `);

    for (const patient of rpmPatients) {
      const { patient_id, service_type } = patient;
      const isRPM = service_type?.includes(1);
      const isCCM = service_type?.includes(2);
      const isPCM = service_type?.includes(3);

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
  patient_id, startDate, endDate, patient_id, startDate, endDate,  // RPM
  patient_id, startDate, endDate, patient_id, startDate, endDate,  // CCM
  patient_id, startDate, endDate, patient_id, startDate, endDate   // PCM
]);
        console.log(rows)
        const { rpm_minutes, ccm_minutes, pcm_minutes } = rows[0];
        console.log(`Patient: ${patient_id} | RPM: ${rpm_minutes} | CCM: ${ccm_minutes} | PCM: ${pcm_minutes}`);

    //   const total_minutes = rows[0].total_minutes;
      const queries = [];


      if (isRPM) {
        await handleRPM(patient_id, rpm_minutes, queries);
      }

      if (isCCM) {
        await handleCCM(patient_id, ccm_minutes, queries);
      }

      if (isPCM) {
        await handlePCM(patient_id, pcm_minutes, queries);
      }

      // Execute all queries after calculations
      for (const query of queries) {
        await connection.execute(query.sql, query.params);
      }

      // Remove duplicate CPT entries (keeping the earliest)
      const deleteQuery = `
        DELETE t1 FROM cpt_billing t1
        INNER JOIN cpt_billing t2 
          ON t1.id > t2.id
          AND t1.patient_id = t2.patient_id
          AND t1.cpt_code_id = t2.cpt_code_id
          AND IFNULL(t1.code_units, 0) = IFNULL(t2.code_units, 0)
          AND DATE(t1.created) = DATE(t2.created)
      `;
      await connection.execute(deleteQuery);
    }

  } catch (err) {
    console.error('Cron job failed:', err.message);
  }
};
checkMinutesForPatient();

// cron.schedule('*/5 * * * *',checkMinutesForPatient);
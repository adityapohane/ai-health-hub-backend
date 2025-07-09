const dotenv = require('dotenv');
dotenv.config();
const cron = require('node-cron');
const connection = require('../config/db');


const checkReadingsAndBill = async () => {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthStart = firstDay.toISOString().split('T')[0];
    const monthEnd = lastDay.toISOString().split('T')[0];
    const billedMonth = `${monthStart.slice(0, 7)}-01`;

    // Step 1: Get all patients with RPM (service_type includes 1)
    const [rpmPatients] = await connection.execute(`
      SELECT um.user_id AS patient_id
      FROM users_mappings um
      LEFT JOIN user_profiles up ON up.fk_userid = um.user_id
      WHERE um.fk_role_id = 7
        AND JSON_CONTAINS(up.service_type, '1', '$')
      GROUP BY um.user_id
    `);

    // Step 2: For each RPM patient, count total readings this month
    for (const patient of rpmPatients) {
      const { patient_id } = patient;

      const [readings] = await connection.execute(`
        SELECT
          (SELECT COUNT(*) FROM oximeter_readings WHERE patient_id = ? AND reading_date BETWEEN ? AND ?) +
          (SELECT COUNT(*) FROM weight_readings WHERE patient_id = ? AND reading_date BETWEEN ? AND ?) +
          (SELECT COUNT(*) FROM bpm_readings WHERE patient_id = ? AND reading_date BETWEEN ? AND ?) +
          (SELECT COUNT(*) FROM bp_readings WHERE patient_id = ? AND reading_date BETWEEN ? AND ?)
          AS total_readings
      `, [
        patient_id, monthStart, monthEnd,
        patient_id, monthStart, monthEnd,
        patient_id, monthStart, monthEnd,
        patient_id, monthStart, monthEnd,
      ]);

      const totalReadings = readings[0]?.total_readings || 0;
      console.log(totalReadings,"totalReadings",patient_id)
      if (totalReadings >= 16) {
        // Step 3: Check if already billed
        const [alreadyBilled] = await connection.execute(
          `SELECT id FROM cpt_billing WHERE patient_id = ?  AND cpt_code_id = 5 AND MONTH(created) = MONTH(CURRENT_DATE())
     AND YEAR(created) = YEAR(CURRENT_DATE())`,
          [patient_id]
        );

        if (alreadyBilled.length === 0) {
          await connection.execute(
            `INSERT INTO cpt_billing (patient_id, cpt_code_id) VALUES (?, ?)`,
            [patient_id, 5]
          );
          console.log(`✅ Billed CPT for patient with (${totalReadings} readings)`);
        } else {
          console.log(`ℹ️ Already billed CPT for patient ${patient_id} with (${totalReadings} readings)`);
        }
      } else {
        console.log(`❌ Patient ${patient_id} has only ${totalReadings} readings (needs 16)`);
      }
    }
  } catch (err) {
    console.error('❌ Cron error:', err.message);
  } finally {
    console.log("done")
  }
};

  // checkReadingsAndBill()
  // Run every day at 1 AM
  cron.schedule('0 1 * * *', checkReadingsAndBill);
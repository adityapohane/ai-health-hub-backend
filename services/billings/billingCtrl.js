const connection = require("../../config/db");
const moment = require("moment");

const getAllPatients = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 10,
            order = "DESC",
            orderBy = "last_visit",
        } = req.query;
        const {date} = req.body;
        const targetDate = date ? moment(date, moment.ISO_8601, true) : moment();
        const startDate = targetDate.clone().startOf('month').format('YYYY-MM-DD 00:00:00');
        const endDate = targetDate.clone().endOf('month').format('YYYY-MM-DD 23:59:59');
        page = parseInt(page);
        limit = parseInt(limit);
        const offset = (page - 1) * limit;
        const { roleid, user_id } = req?.user;
       

                    const sql = `SELECT 
                        GROUP_CONCAT(DISTINCT cb.id ORDER BY cb.id SEPARATOR ', ') AS billing_ids,
                        cb.patient_id,
                        up.phone,
                        up.dob,
                        '${endDate}' AS date_of_service,
                        GROUP_CONCAT(DISTINCT cc.code ORDER BY cc.code SEPARATOR ', ') AS cpt_codes,
                        GROUP_CONCAT(DISTINCT cb.cpt_code_id ORDER BY cb.cpt_code_id SEPARATOR ', ') AS cpt_code_ids,
                        GROUP_CONCAT(DISTINCT cb.code_units ORDER BY cb.code_units SEPARATOR ', ') AS code_units,
                        u.created AS enrolled_date,
                        CONCAT(up.firstname, " ", up.lastname) AS patient_name,
                        CONCAT(up2.firstname, " ", up2.lastname) AS provider_name,
                        cb.status AS billing_status,
                        um.fk_physician_id,
                        up.service_type
                    FROM cpt_billing cb
                    LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
                    LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
                    LEFT JOIN user_profiles up ON up.fk_userid = cb.patient_id
                    LEFT JOIN users u ON u.user_id = cb.patient_id
                    LEFT JOIN user_profiles up2 ON up2.fk_userid = um.fk_physician_id
                    WHERE cb.created BETWEEN '${startDate}' AND '${endDate}'
                    AND um.fk_physician_id = ${user_id}
                    GROUP BY cb.patient_id
                    ORDER BY cb.patient_id
            LIMIT ${limit} OFFSET ${offset};`;
        const [patients] = await connection.query(sql);
        const total = patients?.length ? patients.length : 0 ;

        for (const patient of patients) {
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
            patient.patient_id, startDate, endDate, patient.patient_id, startDate, endDate,  // RPM
            patient.patient_id, startDate, endDate, patient.patient_id, startDate, endDate,  // CCM
            patient.patient_id, startDate, endDate, patient.patient_id, startDate, endDate   // PCM
          ]);
        patient.total_minutes = rows[0]?.rpm_minutes+rows[0]?.ccm_minutes+rows[0]?.pcm_minutes;
        patient.rpm_minutes = rows[0]?.rpm_minutes;
        patient.ccm_minutes = rows[0]?.ccm_minutes;
        patient.pcm_minutes = rows[0]?.pcm_minutes;
        const idsArray = String(patient.billing_ids).split(',').map(id => id.trim());
        const sql2 = `SELECT cpt_code_id,cc.code,code_units,created,cc.price from cpt_billing LEFT JOIN cpt_codes cc ON cc.id = cpt_code_id WHERE cpt_billing.id IN (${idsArray.join(",")})`
        const [data] = await connection.query(sql2);
        patient.cpt_data = data;
     let total = data.reduce((sum, item) => {
  const price = parseFloat(item.price);
  const units = item.code_units && item.code_units > 0 ? item.code_units : 1;
  // console.log(sum+units*price,price,units)
  return sum + (price * units);
}, 0);
      total = parseFloat(total.toFixed(2));
      patient.totalPrice = total;

      // notes for reviewing
      const [notes] = await connection.query(
      `SELECT note, created,duration,type, created_by, note_id
       FROM notes
       WHERE patient_id = ?
         AND created BETWEEN ? AND ?`,
      [patient.patient_id, startDate, endDate]
    );
    patient.notes = notes
        }
        return res.status(200).json({
            success: true,
            message: "Patients fetched successfully",
            data: patients,
            pagination: {
                total: total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching patients:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching patients",
        });
    }
};

const updateBillingStatus = async (req, res) => {
    try {
      const { billing_ids, status } = req.body;
  
      if (!billing_ids || typeof billing_ids !== 'string') {
        return res.status(400).json({ error: 'billing_ids must be a comma-separated string' });
      }
  
      const idsArray = billing_ids
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(Boolean);
  
      if (idsArray.length === 0) {
        return res.status(400).json({ error: 'No valid billing IDs provided.' });
      }
  
      const placeholders = idsArray.map(() => '?').join(', ');
      let sql = `UPDATE cpt_billing SET status = ?`;
      const values = [status];

      if (status == 2) {
        sql += `, billed_date = ?`;
        values.push(new Date()); // current timestamp
        }

      sql += ` WHERE id IN (${placeholders})`;
      values.push(...idsArray);
  
      await connection.execute(sql, values);
  
      return res.status(200).json({
        message: 'Billing status updated successfully',
        updated_ids: idsArray,
        new_status: status || 0
      });
    } catch (err) {
      console.error('Error updating billing statuses:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
};
module.exports = {
    getAllPatients,
    updateBillingStatus
}
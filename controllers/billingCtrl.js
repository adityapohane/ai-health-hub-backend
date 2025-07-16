const connection = require("../config/db");
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
                        um.fk_physician_id
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
        const [rows] = await connection.query(
          `
          SELECT
                CEIL((
                    (
                    SELECT IFNULL(SUM(duration), 0)
                    FROM (
                        SELECT DISTINCT patient_id, timed_by, duration, DATE(created)
                        FROM patient_billing_notes
                        WHERE patient_id = ? 
                        AND created BETWEEN '${startDate}' AND '${endDate}'
                    ) AS unique_billing
                    ) +
                    (
                    SELECT IFNULL(SUM(duration), 0)
                    FROM (
                        SELECT DISTINCT patient_id, created_by, duration, DATE(created)
                        FROM tasks
                        WHERE patient_id = ?
                        AND created BETWEEN '${startDate}' AND '${endDate}'
                    ) AS unique_tasks
                    )
                ) / 60) AS total_minutes
          `,
          [patient.patient_id, patient.patient_id]
        );
        patient.total_minutes = rows[0].total_minutes;
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
      const updateSql = `UPDATE cpt_billing SET status = ? WHERE id IN (${placeholders})`;
  
      await connection.execute(updateSql, [status ? status : 0, ...idsArray]);
  
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
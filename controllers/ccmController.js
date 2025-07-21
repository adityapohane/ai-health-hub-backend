const connection = require("../config/db");
const moment = require("moment");

const createCarePlan = async (req, res) => {
  const data = {...req.body, ...req.query};

  try {
    const [result] = await connection.query(`
      INSERT INTO care_plans (
        patient_id, patient_name, email, phone, gender,
        height, weight, bmi,
        address_line1, address_line2, city, state, country, zip_code,
        last_visit, emergency_contact,
        diagnosis, medications, care_goals, vital_signs,
        treatment_plan, follow_up_instructions, next_appointment,
        risk_level
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.patientInfo.patientId,
      data.patientInfo.patientName,
      data.patientInfo.email,
      data.patientInfo.phone,
      data.patientInfo.gender,
      data.patientInfo.height,
      data.patientInfo.weight,
      data.patientInfo.bmi,
      data.patientInfo.address.line1,
      data.patientInfo.address.line2,
      data.patientInfo.address.city,
      data.patientInfo.address.state,
      data.patientInfo.address.country,
      data.patientInfo.address.zipCode,
      data.patientInfo.lastVisit,
      data.patientInfo.emergencyContact,
      JSON.stringify(data.diagnosis),
      JSON.stringify(data.medications),
      JSON.stringify(data.careGoals),
      JSON.stringify(data.vitalSigns),
      data.treatmentPlan,
      data.followUpInstructions,
      data.nextAppointment,
      data.riskLevel
    ]);

    res.status(201).json({success: true, message: 'Care plan saved successfully', id: result.insertId });
  } catch (error) {
    console.error('Insert error:', error);
    res.status(500).json({success:false, error: 'Failed to save care plan' });
  }
};

const getCarePlanByPatientId = async (req, res) => {
  const { patientId } = {...req.params, ...req.query};

  try {
    const [rows] = await connection.query(`
      SELECT * FROM care_plans
      WHERE patient_id = ?
      ORDER BY created DESC
      LIMIT 1
    `, [patientId]);

    if (rows.length === 0) {
      return res.status(404).json({success:false, message: 'Care plan not found' });
    }

    const carePlan = rows[0];

    // Helper function to safely parse JSON fields
    const safeJsonParse = (value, defaultValue) => {
      if (value === null || value === undefined) return defaultValue;
      if (typeof value === 'object') return value; // Already parsed
      try {
        return JSON.parse(value || JSON.stringify(defaultValue));
      } catch (e) {
        console.error('Error parsing JSON:', e);
        return defaultValue;
      }
    };

    // Parse JSON fields safely
    carePlan.diagnosis = safeJsonParse(carePlan.diagnosis, []);
    carePlan.medications = safeJsonParse(carePlan.medications, []);
    carePlan.care_goals = safeJsonParse(carePlan.care_goals, []);
    carePlan.vital_signs = safeJsonParse(carePlan.vital_signs, {});

    res.json({success: true, data: carePlan});
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({success:false, error: 'Failed to fetch care plan' });
  }
};

module.exports = {
  createCarePlan,
  getCarePlanByPatientId
};
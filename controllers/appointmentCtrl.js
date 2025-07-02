const connection = require('../config/db');  
const { v4: uuidv4 } = require('uuid');  


function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}


function parseDurationMinutes(duration) {
  if (!duration) return NaN;
  const match = duration.match(/\d+/);
  return match ? parseInt(match[0]) : NaN;
}


const createAppointment = async (req, res) => {
  try {
    const {
      patient,
      date,
      duration,
      type,
      status,
      hasBilling,
      providerId,
      locationId,
      reason
    } = req.body;

    
    if (!patient || !patient.id || !date || !providerId || !duration) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    
    const startDate = new Date(date);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format.' });
    }

    
    const durationMinutes = parseDurationMinutes(duration);
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      return res.status(400).json({ error: 'Invalid duration format. Must include minutes.' });
    }

    
    const endDate = addMinutes(startDate, durationMinutes);

    
    const [existing] = await connection.query(
      `
        SELECT * FROM scheduled_appointments
        WHERE provider_id = ?
          AND (? < end_date) AND (date < ?)
      `,
      [providerId, startDate, endDate]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'appointment is already booked' });
    }

    
    const appointmentId = uuidv4();

    await connection.query(
      `
        INSERT INTO scheduled_appointments (
          appointment_id, patient_id, patient_name, patient_phone, patient_email,
          date, end_date, duration, type, status, has_billing,
          provider_id, location_id, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        appointmentId,
        patient.id,
        patient.name,
        patient.phone,
        patient.email,
        startDate,
        endDate,
        duration,
        type,
        status,
        hasBilling,
        providerId,
        locationId,
        reason
      ]
    );

    return res.status(201).json({
      message: 'appointment scheduled successfully',
      appointmentId
    });

  } catch (err) {
    console.error('Error scheduling appointment:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
    createAppointment
};

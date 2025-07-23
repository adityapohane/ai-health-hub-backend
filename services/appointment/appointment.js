const db = require("../../config/db");
const logAudit = require("../../utils/logAudit");

exports.createAppointment = async (req, res) => {
  try {
    const {
      id,
      patient,
      date,          // ISO string with timezone, e.g., "2025-07-03T09:00:00+05:30"
      duration,      // e.g., "30 minutes"
      type,
      status,
      hasBilling,
      providerId,
      locationId,
      reason,
    } = req.body;

    console.log(req.body)
    if (!providerId || !patient?.id || !date || !duration) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const durationMinutes = parseInt(duration); // e.g., "30" from "30 minutes"
    if (isNaN(durationMinutes)) {
      return res.status(400).json({ success: false, message: "Invalid duration format" });
    }

    // Extract raw date-time (in IST) from frontend without UTC conversion
    const [datePart, timePart] = date.split('T');
    const [hour, minute, secondWithTZ] = timePart.split(':');
    const second = secondWithTZ.split('+')[0]; // remove +05:30 if exists (safe fallback)

    // Format for MySQL
    const startTimeStr = `${datePart} ${hour}:${minute}:${second}`;

    // Calculate end time using Date object for duration calculation
    const startDateLocal = new Date(`${startTimeStr}`);
    const endDate = new Date(startDateLocal.getTime() + durationMinutes * 60000);
    const endTimeStr = endDate.toISOString().slice(0, 19).replace("T", " ");

    // Check for overlapping appointments
    const [existing] = await db.execute(
      `
      SELECT * FROM appointment 
      WHERE provider_id = ?
      AND (
        (date < ? AND DATE_ADD(date, INTERVAL duration MINUTE) > ?)
      )
    `,
      [providerId, endTimeStr, startTimeStr]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Time slot already booked for this provider",
      });
    }

    // Insert appointment
    const insertQuery = `
      INSERT INTO appointment (
        id, patient_id, patient_name, patient_phone, patient_email,
        date, duration, type, status, has_billing,
        provider_id, location_id, reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      id,
      patient.id,
      patient.name,
      patient.phone,
      patient.email,
      startTimeStr,
      durationMinutes,
      type,
      status,
      hasBilling || false,
      providerId,
      locationId,
      reason,
    ];

    await db.execute(insertQuery, values);
    logAudit(req, 'CREATE', 'APPOINTMENT', req.user.user_id, 'Appointment created successfully');

    return res.status(201).json({ success: true, message: "Appointment created successfully" });
  } catch (err) {
    console.error("Error creating appointment:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};



exports.getAppointmentsByProviderId = async (req, res) => {
  try {
    const { providerId } = req.params;

    if (!providerId) {
      return res.status(400).json({ message: "Provider ID is required" });
    }

    const [appointments] = await db.execute(
      "SELECT * FROM appointment WHERE provider_id = ? ORDER BY date DESC",
      [providerId]
    );

    const transformed = appointments.map((row) => {
      const utcDate = new Date(row.date); // Date from MySQL (in UTC)

      // ✅ Manually convert to IST by adding 5 hours 30 minutes
      const istOffset = 5.5 * 60 * 60 * 1000; // 19800000 milliseconds
      const istDate = new Date(utcDate.getTime() + istOffset);

      // ✅ Format as ISO string with +05:30 manually
      const pad = (n) => n.toString().padStart(2, '0');

      const yyyy = istDate.getFullYear();
      const mm = pad(istDate.getMonth() + 1);
      const dd = pad(istDate.getDate());
      const hh = pad(istDate.getHours());
      const min = pad(istDate.getMinutes());
      const ss = pad(istDate.getSeconds());

      const formattedIST = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}+05:30`;

      return {
        id: row.id,
        patient: {
          id: row.patient_id,
          name: row.patient_name,
          phone: row.patient_phone,
          email: row.patient_email,
        },
        date: formattedIST, // ✅ Correctly formatted IST string
        duration: row.duration,
        type: row.type,
        status: row.status,
        hasBilling: !!row.has_billing,
        providerId: row.provider_id,
        locationId: row.location_id,
        reason: row.reason,
      };
    });

    res.status(200).json({ success: true, data: transformed });
  } catch (err) {
    console.error("Fetch by provider error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.upcomingAppointments = async (req, res) => {
  try {
    const { providerId } = req.params;

    if (!providerId) {
      return res.status(400).json({ message: "Provider ID is required" });
    }

    const [appointments] = await db.execute(
      "SELECT * FROM appointment WHERE provider_id = ? AND date > current_timestamp ORDER BY date ASC",
      [providerId]
    );

    const transformed = appointments.map((row) => {
      const utcDate = new Date(row.date); // Date from MySQL (in UTC)

      // ✅ Manually convert to IST by adding 5 hours 30 minutes
      const istOffset = 5.5 * 60 * 60 * 1000; // 19800000 milliseconds
      const istDate = new Date(utcDate.getTime() + istOffset);

      // ✅ Format as ISO string with +05:30 manually
      const pad = (n) => n.toString().padStart(2, '0');

      const yyyy = istDate.getFullYear();
      const mm = pad(istDate.getMonth() + 1);
      const dd = pad(istDate.getDate());
      const hh = pad(istDate.getHours());
      const min = pad(istDate.getMinutes());
      const ss = pad(istDate.getSeconds());

      const formattedIST = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}+05:30`;

      return {
        id: row.id,
        patient: {
          id: row.patient_id,
          name: row.patient_name,
          phone: row.patient_phone,
          email: row.patient_email,
        },
        date: formattedIST, // ✅ Correctly formatted IST string
        duration: row.duration,
        type: row.type,
        status: row.status,
        hasBilling: !!row.has_billing,
        providerId: row.provider_id,
        locationId: row.location_id,
        reason: row.reason,
      };
    });

    res.status(200).json({ success: true, data: transformed });
  } catch (err) {
    console.error("Fetch by provider error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId, status } = {...req.body,...req.params};

    if (!appointmentId || !status) {
      return res.status(400).json({ success: false, message: "Appointment ID and status are required" });
    }

    const [result] = await db.execute(
      "UPDATE appointment SET status = ? WHERE id = ?",
      [status, appointmentId]
    );  

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    logAudit(req, 'UPDATE', 'APPOINTMENT', req.user.user_id, `Appointment status updated to ${status}`);
    res.status(200).json({ success: true, message: "Appointment status updated successfully" });
  } catch (err) {
    console.error("Update appointment status error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
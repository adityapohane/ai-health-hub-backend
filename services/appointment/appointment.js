const db = require("../../config/db");
const logAudit = require("../../utils/logAudit");

exports.createAppointment = async (req, res) => {
  try {
    const {
      id,
      patient,
      date,            // raw ISO date: "2025-08-06T10:00:00"
      duration,        // e.g., "30 minutes"
      type,
      status,
      hasBilling,
      providerId,
      locationId,
      template_id,
      reason,
    } = req.body;

    if (!providerId || !patient?.id || !date || !duration || !template_id) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const durationMinutes = parseInt(duration);
    if (isNaN(durationMinutes)) {
      return res.status(400).json({ success: false, message: "Invalid duration format" });
    }

    // ✅ Use the raw date string, don't parse it
    const startTime = date.replace("T", " ") + ":00"; // e.g., "2025-08-06 10:00:00"

    // ✅ For end time calculation only (duration), use JS Date (optional)
    const startDate = new Date(date);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    const endTime = endDate.toISOString().replace("T", " ").slice(0, 19); // "2025-08-06 10:30:00"

    // Check for overlap using raw local time (startTime is assumed local)
    const [existing] = await db.execute(
      `
      SELECT * FROM appointment 
      WHERE provider_id = ?
      AND (
        (date < ? AND DATE_ADD(date, INTERVAL duration MINUTE) > ?)
      )
      `,
      [providerId, endTime, startTime]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Time slot already booked for this provider",
      });
    }
const rawDateTime = date.replace("T", " ") + ":00"; // "2025-08-28 13:30:00"

    // Store appointment with exact time from frontend
    const insertQuery = `
      INSERT INTO appointment (
        id, patient_id, patient_name, patient_phone, patient_email,
        date, duration, type, status, has_billing,
        provider_id, location_id, reason, template_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      id || null,
      patient.id,
      patient.name,
      patient.phone,
      patient.email,
      rawDateTime,               // Store exactly what frontend sent (formatted)
      durationMinutes,
      type,
      status,
      hasBilling || false,
      providerId,
      locationId,
      reason,
      template_id,
    ];

    await db.execute(insertQuery, values);

    await logAudit(req, 'CREATE', 'APPOINTMENT', patient.id, 'Appointment created successfully');

    return res.status(201).json({ success: true, message: "Appointment created successfully" });
  } catch (err) {
    console.error("Error creating appointment:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};






exports.getAppointmentsByProviderId = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { date } = req.query;
    console.log(date);
    if (!providerId) {
      return res.status(400).json({ message: "Provider ID is required" });
    }
    let query = `
    SELECT * FROM appointment
    WHERE provider_id = ?
    ${date ? 'AND LEFT(date, 10) = ?' : ''}
    ORDER BY date DESC
  `;
  let values = [providerId];
if (date) values.push(date);

const [appointments] = await db.query(query, values);


    const transformed = await Promise.all(appointments.map(async (row) => {
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
      if(row.template_id){
        const [template] = await db.execute(
          "SELECT template_id,encounter_name, encounter_type, visit_type, is_default, is_active, soap_structure, billing_codes, created_by,created  FROM providers_encounter_template WHERE template_id = ?",
          [row.template_id]
        );
        row.template = template.length > 0 ? template[0] : null;
      }
      return {
        id: row.id,
        patient: {
          id: row.patient_id,
          name: row.patient_name,
          phone: row.patient_phone,
          email: row.patient_email,
        },
        date: row.date, // ✅ Correctly formatted IST string
        duration: row.duration,
        type: row.type,
        status: row.status,
        hasBilling: !!row.has_billing,
        providerId: row.provider_id,
        locationId: row.location_id,
        reason: row.reason,
        template: row.template || null,
      };
    }));

    res.status(200).json({ success: true, data: transformed });
  } catch (err) {
    console.error("Fetch by provider error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.upcomingAppointments = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { date } = req.query;
    if (!providerId) {
      return res.status(400).json({ message: "Provider ID is required" });
    }
    let query = `
    SELECT * FROM appointment
    WHERE provider_id = ?
      AND date > ?
      ${date ? 'AND LEFT(date, 10) = ?' : ''}
    ORDER BY date ASC
  `;
  
  const now = new Date().toISOString(); // e.g., "2025-08-06T08:30:00.000Z"
  const values = [providerId, now];
  
  if (date) {
    values.push(date); // date should be in 'YYYY-MM-DD'
  }
  
  const [appointments] = await db.query(query, values);


    const transformed = await Promise.all(appointments.map(async (row) => {
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
      if(row.template_id){
        const [template] = await db.execute(
          "SELECT template_id,encounter_name, encounter_type, visit_type, is_default, is_active, soap_structure, billing_codes, created_by,created  FROM providers_encounter_template WHERE template_id = ?",
          [row.template_id]
        );
        row.template = template.length > 0 ? template[0] : null;
      }
      return {
        id: row.id,
        patient: {
          id: row.patient_id,
          name: row.patient_name,
          phone: row.patient_phone,
          email: row.patient_email,
        },
        date: row.date, // ✅ Correctly formatted IST string
        duration: row.duration,
        type: row.type,
        status: row.status,
        hasBilling: !!row.has_billing,
        providerId: row.provider_id,
        locationId: row.location_id,
        reason: row.reason,
        template: row.template || null,
      };
    }));

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

    await logAudit(req, 'UPDATE', 'APPOINTMENT', appointmentId, `Appointment status updated to ${status}`);
    res.status(200).json({ success: true, message: "Appointment status updated successfully" });
  } catch (err) {
    console.error("Update appointment status error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
const express = require("express");
const {
  createAppointment,
  getAppointmentsByProviderId,
  upcomingAppointments,
  updateAppointmentStatus,
  getApppointmentsByPatientId,
  saveAppointmentQA
} = require("./appointment");

const router = express.Router();

router.post("/create", createAppointment);
router.get("/provider/:providerId", getAppointmentsByProviderId);
router.get("/upcoming/:providerId", upcomingAppointments);
router.post("/update-status/:providerId", updateAppointmentStatus);
router.get("/patient/:patientId", getApppointmentsByPatientId);
router.post("/save-appointment-qa",saveAppointmentQA)

module.exports = router;

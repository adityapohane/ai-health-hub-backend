const express = require("express");
const {
  createAppointment,
  getAppointmentsByProviderId,
  upcomingAppointments,
  updateAppointmentStatus
} = require("./appointment");

const router = express.Router();

router.post("/create", createAppointment);
router.get("/provider/:providerId", getAppointmentsByProviderId);
router.get("/upcoming/:providerId", upcomingAppointments);
router.post("/update-status/:providerId", updateAppointmentStatus);


module.exports = router;

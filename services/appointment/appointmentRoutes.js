const express = require("express");
const {
  createAppointment,
  getAppointmentsByProviderId,
  upcomingAppointments
} = require("./appointment");

const router = express.Router();

router.post("/create", createAppointment);
router.get("/provider/:providerId", getAppointmentsByProviderId);
router.get("/upcoming/:providerId", upcomingAppointments);


module.exports = router;

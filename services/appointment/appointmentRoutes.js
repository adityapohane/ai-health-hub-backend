const express = require("express");
const {
  createAppointment,
  getAppointmentsByProviderId
} = require("./appointment");

const router = express.Router();

router.post("/create", createAppointment);
router.get("/provider/:providerId", getAppointmentsByProviderId);

module.exports = router;

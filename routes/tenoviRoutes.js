const express = require("express");
const router = express.Router();
const {
    getDevices,
    assignDevice,
    getReadingsByPatient,
} = require("../controllers/tenoviController");

// Optional: Get list of devices from Tenovi
router.get("/devices", getDevices);

// Assign device to patient (with check)
router.post("/assign-device", assignDevice);

// Get readings using patientId
router.get("/readings/:patientId", getReadingsByPatient);

module.exports = router;

const express = require("express");
const router = express.Router();
const {sendIntake,registerPatient} = require("./intakeForm"); // adjust path as needed
router.post("/send", sendIntake);
router.post("/register/patient", registerPatient);

module.exports = router;

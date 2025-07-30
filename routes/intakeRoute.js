const express = require("express");
const router = express.Router();
const sendIntake = require("../controllers/intakeForm"); // adjust path as needed

router.post("/send", sendIntake);

module.exports = router;

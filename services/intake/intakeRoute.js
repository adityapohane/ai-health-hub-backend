const express = require("express");
const router = express.Router();
const sendIntake = require("./intakeForm"); // adjust path as needed

router.post("/send", sendIntake);

module.exports = router;

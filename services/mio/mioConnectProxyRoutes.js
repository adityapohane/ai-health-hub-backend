const express = require("express");
const router = express.Router();
const {
  listDevices,
  getDeviceById,
  listTelemetryWithRange ,
} = require("./mioController");

router.get("/devices", listDevices);
router.get("/devices/:deviceId", getDeviceById);
router.get("/devices/:deviceId/telemetry", listTelemetryWithRange );

module.exports = router;

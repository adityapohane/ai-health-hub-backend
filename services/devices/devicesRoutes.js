const express = require('express');
const router = express.Router();

const { getDevices, assignDevice, getPatientDevices,listTelemetryWithRange2 } = require('./devices');

router.get('/getDevices', getDevices);
router.post('/assignDevice', assignDevice);
router.get('/getPatientDevices', getPatientDevices);
router.get('/:patientId/telemetry', listTelemetryWithRange2);
module.exports = router;

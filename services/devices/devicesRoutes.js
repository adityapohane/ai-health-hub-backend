const express = require('express');
const router = express.Router();

const { getDevices, assignDevice, getPatientDevices,listTelemetryWithRange } = require('./devices');

router.get('/getDevices', getDevices);
router.post('/assignDevice', assignDevice);
router.get('/getPatientDevices', getPatientDevices);
router.get('/:patientId/telemetry', listTelemetryWithRange);
module.exports = router;

const express = require('express');
const router = express.Router();

const { getDevices, assignDevice, getPatientDevices } = require('./devices');

router.get('/getDevices', getDevices);
router.post('/assignDevice', assignDevice);
router.get('/getPatientDevices', getPatientDevices);
module.exports = router;

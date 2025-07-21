const express = require('express');
const router = express.Router();
const { createCarePlan, getCarePlanByPatientId } = require('./ccmController');


router.post('/create', createCarePlan);
router.get('/get', getCarePlanByPatientId);

module.exports = router;

const express = require('express');
const router = express.Router();

const { getAllPatients, updateBillingStatus } = require('./billingCtrl');

router.get('/patients', getAllPatients);
router.post('/update-billing-status', updateBillingStatus);

module.exports = router;

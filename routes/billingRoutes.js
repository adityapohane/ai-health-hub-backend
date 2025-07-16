const express = require('express');
const router = express.Router();

const { getAllPatients } = require('../controllers/billingCtrl');

router.get('/patients', getAllPatients);

module.exports = router;

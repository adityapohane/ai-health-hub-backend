const express = require('express');
const router = express.Router();
const twilioController = require('../controllers/twilioController');

// router.post('/send-sms', twilioController.sendSMS);
router.post('/make-call', twilioController.makeCall);
router.get('/twiml', twilioController.twiml);

module.exports = router;

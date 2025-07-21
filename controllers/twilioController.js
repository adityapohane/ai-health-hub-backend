const TwilioService = require('../utils/twilioService');

exports.sendSMS = async (req, res) => {
    try {
        const { to, body } = req.body;
        
        if (!to || !body) {
            return res.status(400).json({ message: 'Phone number and message body are required' });
        }

        const message = await TwilioService.sendSMS(to, body);
        res.json({ message: 'SMS sent successfully', data: message });
    } catch (error) {
        console.error('Error in sendSMS:', error);
        res.status(500).json({ message: 'Error sending SMS', error: error.message });
    }
};

exports.makeCall = async (req, res) => {
    try {
        const { to } = req.body;
        
        if (!to) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        // Generate TwiML for the call
        const twimlUrl = `${process.env.BASE_URL}/twilio/twiml`;
        const call = await TwilioService.makeCall(to, twimlUrl);
        res.json({ message: 'Call initiated successfully', data: call });
    } catch (error) {
        console.error('Error in makeCall:', error);
        res.status(500).json({ message: 'Error making call', error: error.message });
    }
};

exports.twiml = (req, res) => {
    try {
        const twiml = TwilioService.generateTwiML();
        res.set('Content-Type', 'text/xml');
        res.send(twiml);
    } catch (error) {
        console.error('Error in twiml:', error);
        res.status(500).send(error.message);
    }
};

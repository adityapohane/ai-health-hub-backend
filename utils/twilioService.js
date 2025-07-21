const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

const TwilioService = {
    // Send SMS
    async sendSMS(to, body) {
        try {
            const message = await twilioClient.messages.create({
                body: body,
                to: to,
                from: process.env.TWILIO_PHONE_NUMBER
            });
            return message;
        } catch (error) {
            console.error('Error sending SMS:', error);
            throw error;
        }
    },

    // Make a phone call
    async makeCall(to, twimlUrl) {
        try {
            const call = await twilioClient.calls.create({
                url: twimlUrl,
                to: to,
                from: process.env.TWILIO_PHONE_NUMBER
            });
            return call;
        } catch (error) {
            console.error('Error making call:', error);
            throw error;
        }
    },

    // Generate TwiML for voice calls
    generateTwiML() {
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('Hello, this is a test call from your application.');
        return twiml.toString();
    }
};

module.exports = TwilioService;

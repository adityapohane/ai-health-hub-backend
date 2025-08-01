const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { default: axios } = require("axios")
// Import all route files
const authRoutes = require('./auth/authRoute');
const patientRoutes = require('./patients/patientRoute');
const settingsRoutes = require('./settings/settingsRoutes');
const providerRoutes = require('./providers/providerRoutes');
const ringCentralRoute = require('./ring-central/ringCentralRoute');
const appointmentRoutes = require('./appointment/appointmentRoutes');
const awsRoute = require('./aws/awsUpload');
const workFlowRoutes = require('./workflow-templates/workFlowRoutes');
const mioRoutes = require('./mio/mioConnectProxyRoutes');
const locationRoute = require('./locations/location');
const twilioRoutes = require("./twilio/twilioRoutes");
const documentRoutes = require("./documents/documentRoute");
const billingRoutes = require("./billings/billingRoutes");
const ccmRoutes = require("./ccm/ccmRoutes");
const encountersRoutes = require("./encounters/encounterRoutes");
const devicesRoutes = require("./devices/devicesRoutes");
const { getConsentForm, submitConsentForm } = require("./patients/patientCtrl2");
const thirdPartyApiRoutes = require("./third-party-apis/api-routes");
const generalRoutes = require("./general-apis/generalRoutes");




// Public routes (no auth required)
router.use('/auth', authRoutes);
router.use('/ring-central', ringCentralRoute);
router.use('/aws', awsRoute);

// Protected routes (require auth)
router.use('/patient', verifyToken, patientRoutes);
router.use('/intake', require("./intake/intakeRoute"));
router.use('/settings', verifyToken, settingsRoutes);
router.use('/physician', verifyToken, providerRoutes);
router.use('/appointment', verifyToken, appointmentRoutes);
router.use('/location', verifyToken, locationRoute);
router.use('/work-flow', verifyToken, workFlowRoutes);
router.use('/mio', mioRoutes);
router.use("/twilio",verifyToken, twilioRoutes);
router.use("/documents",verifyToken, documentRoutes);
router.use("/billing",verifyToken, billingRoutes);
router.use("/ccm",verifyToken, ccmRoutes);
router.use("/encounters",verifyToken, encountersRoutes);
router.use("/devices",verifyToken, devicesRoutes);
router.get("/ehr/consent-form", getConsentForm);
router.post('/ehr/consent-form', submitConsentForm);
//for third Party APIs !IMPORTANT
router.use("/client",thirdPartyApiRoutes);
//for Testing
router.use("/general",generalRoutes);



router.get('/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) {
        return res.status(400).send('Image URL is required');
    }
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        res.set('Content-Type', response.headers['content-type']);
        res.send(response.data);
    } catch (error) {
        console.error('Proxy image error:', error);
        res.status(500).send('Failed to fetch image');
    }
});



// Export the combined router
module.exports = router;

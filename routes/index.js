const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { default: axios } = require("axios")

// Import all route files
const authRoutes = require('./authRoute');
const patientRoutes = require('./patientRoute');
const settingsRoutes = require('./settingsRoutes');
const providerRoutes = require('./providerRoutes');
const ringCentralRoute = require('./ringCentralRoute');
const awsRoute = require('./awsUpload');

// Public routes (no auth required)
router.use('/auth', authRoutes);
router.use('/ring-central', ringCentralRoute);
router.use('/aws', awsRoute);

// Protected routes (require auth)
router.use('/patient', verifyToken, patientRoutes);
router.use('/settings', verifyToken, settingsRoutes);
router.use('/physician', verifyToken, providerRoutes);
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        message: 'Server is running and responding'
    });
});



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

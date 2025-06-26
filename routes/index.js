const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Import all route files
const authRoutes = require('./authRoute');
const patientRoutes = require('./patientRoute');
const settingsRoutes = require('./settingsRoutes');

// Public routes (no auth required)
router.use('/auth', authRoutes);

// Protected routes (require auth)
router.use('/patient', patientRoutes);
router.use('/settings', settingsRoutes);
router.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            message: 'Server is running and responding'
        });
    });


// Export the combined router
module.exports = router;

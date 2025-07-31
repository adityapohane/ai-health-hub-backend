const express = require("express")
const router = express.Router();

const { registerUser,generateAccessToken } = require("./api-handlers");
const { verifyClient } = require("../../middleware/verifyClient");


router.post("/register", registerUser);
router.post("/get-token", generateAccessToken);
router.post("/health", verifyClient, (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        message: 'Server is running and responding'
    });
});


module.exports = router

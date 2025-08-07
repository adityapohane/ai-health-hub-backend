const express = require("express")
const router = express.Router();
const connection = require("../../config/db");  
const { registerUser,generateAccessToken } = require("./api-handlers");
const { verifyClient } = require("../../middleware/verifyClient");
const { getpatientDemographics } = require("./api-handlers");
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and health check APIs
 */

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 example: mySecurePass123
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Missing or invalid input
 */

router.post("/register", registerUser);

/**
 * @swagger
 * /get-token:
 *   post:
 *     summary: Generate access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 example: mySecurePass123
 *     responses:
 *       200:
 *         description: Token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */

router.post("/get-token", generateAccessToken);

/**
 * @swagger
 * /health:
 *   post:
 *     summary: Health check with authentication
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Server health and status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   example: 123.456
 *                 environment:
 *                   type: string
 *                   example: development
 *                 message:
 *                   type: string
 *                   example: Server is running and responding
 *       401:
 *         description: Invalid or missing token
 */
router.post("/health", verifyClient, async (req, res) => {
    console.log(req.client);
    if(!req.client.user_id){
        return res.status(401).json({ message: 'Invalid token' });
    }else{
        const selectUser = `SELECT * FROM users WHERE user_id = ${req.client.user_id} AND roleid = 20 LIMIT 1`;
        const [user] = await connection.query(selectUser);
        if(user.length === 0){
            return res.status(401).json({ message: 'Invalid token' });
        }
    }
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        message: 'Server is running and responding'
    });
});

router.post("/patient/demographics", verifyClient, getpatientDemographics);


module.exports = router

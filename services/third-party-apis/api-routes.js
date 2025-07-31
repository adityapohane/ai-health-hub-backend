const express = require("express")
const router = express.Router();
const connection = require("../../config/db");  
const { registerUser,generateAccessToken } = require("./api-handlers");
const { verifyClient } = require("../../middleware/verifyClient");


router.post("/register", registerUser);
router.post("/get-token", generateAccessToken);
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


module.exports = router

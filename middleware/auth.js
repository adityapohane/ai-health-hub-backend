const jwt = require('jsonwebtoken');
const connection = require('../config/db');

exports.verifyToken = async (req, res, next) => {
  try {
    // Get the token from Authorization header
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authorization token missing or invalid" });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    // console.log(token)
    // Fetch token from DB (optional check for logout/invalidation)
    const [rows] = await connection.query(
      "SELECT * FROM users WHERE user_token = ?",
      [token]
    );

    // if (rows.length === 0) {
    //   return res.status(401).json({ success: false, message: "Invalid token" });
    // }

    // Verify token and check expiration
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(403).json({ success: false, message: "Token expired" });
        }
        return res.status(403).json({ success: false, message: "Token verification failed" });
      }

      req.user = decoded;
      next();
    });
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

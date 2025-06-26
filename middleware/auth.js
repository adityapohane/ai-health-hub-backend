const jwt = require("jsonwebtoken");

exports.verifyToken = (req, res, next) => {
  try {
    // Get the token from Authorization header (format: Bearer <token>)
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authorization token missing or invalid" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ success: false, message: "Token verification failed" });
      }

      // Attach decoded data to request (e.g., user ID or role)
      req.user = decoded;
      next();
    });
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

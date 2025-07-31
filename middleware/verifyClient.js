const jwt = require('jsonwebtoken');

/**
 * Middleware to verify Bearer token from Authorization header.
 * - Checks for token presence
 * - Validates JWT signature and expiration
 * - Attaches `req.client` with decoded payload
 */
exports.verifyClient = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Check header exists
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }

  // 2. Extract token
  const token = authHeader.split(' ')[1];

  // 3. Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.client = decoded; // e.g., { client_id: "...", ... }

    // Optional: log the client making the request
    // console.log(`✔️ Authenticated client: ${decoded.client_id}`);

    next();
  } catch (err) {
    // 4. Handle token errors clearly
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    return res.status(403).json({ message: 'Token verification failed' });
  }
};



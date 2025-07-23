const connection = require("./../config/db"); 

const logAudit = async (req, actionType, entityType, entityId, description = '') => {
  try {
    const userId = req.user?.id || null;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || '';

    if (!userId) return; // Don't log unauthenticated actions

    await connection.query(
      `INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, description, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, actionType, entityType, entityId, description, ipAddress, userAgent]
    );
  } catch (err) {
    console.error('Audit log failed:', err);
  }
};

module.exports = logAudit;

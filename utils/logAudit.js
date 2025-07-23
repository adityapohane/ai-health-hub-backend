const connection = require("../config/db");

const logAudit = async (req, actionType, entityType, entityId, description = '') => {
  // Ensure entityId is a valid number or string
  const entityIdToLog = entityId !== undefined && entityId !== null ? entityId : 0;
  
  try {
    const userId = req.user?.user_id || null;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || '';

    if (!userId) {
      return;
    }

    // Log the values we're about to insert for debugging
    // console.log('Audit log values:', {
    //   userId,
    //   actionType,
    //   entityType,
    //   entityId: entityIdToLog,
    //   description,
    //   ipAddress,
    //   userAgent: userAgent?.substring(0, 100) 
    // });

    // Execute the query with proper error handling
    await connection.execute(
      `INSERT INTO audit_logs 
       (user_id, action_type, entity_type, entity_id, description, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, actionType, entityType, entityIdToLog, description, ipAddress, userAgent]
    );
    
  } catch (err) {
    console.log('Audit log failed:', {
      error: err.message,
      actionType,
      entityType,
      entityId: entityIdToLog,
      description
    });
    // Don't throw the error to prevent breaking the main operation
  }
};

module.exports = logAudit;

const db = require('../db');

/**
 * Log audit events to the append-only audit_logs table
 */
function logAudit(req, { action, targetType = null, targetId = null, targetName = null, oldValue = null, newValue = null }) {
  try {
    const actorId = req && req.user ? req.user.id : null;
    const actorUsername = req && req.user ? req.user.username : 'SYSTEM';
    const actorRole = req && req.user ? req.user.role : 'SYSTEM';
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';
    const userAgent = req ? req.headers['user-agent'] : 'N/A';

    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        actor_id, actor_username, actor_role, action, target_type,
        target_id, target_name, old_value, new_value, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      actorId,
      actorUsername,
      actorRole,
      action,
      targetType,
      targetId,
      targetName,
      typeof oldValue === 'object' ? JSON.stringify(oldValue) : oldValue,
      typeof newValue === 'object' ? JSON.stringify(newValue) : newValue,
      ipAddress,
      userAgent
    );
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
}

/**
 * Send notification to a specific user
 */
function sendNotification(userId, title, message, type = 'INFO') {
  try {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).run(userId, title, message, type);
  } catch (err) {
    console.error('Send Notification Error:', err);
  }
}

module.exports = {
  logAudit,
  sendNotification
};

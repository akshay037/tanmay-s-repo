const express = require('express');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Audit logs are append-only and strictly accessible ONLY by Super Admin
router.use(authenticateToken, requireRole('SUPER_ADMIN'));

router.get('/', (req, res) => {
  const { actorUsername, action, targetType, startDate, endDate, limit = 100, offset = 0 } = req.query;

  let query = `SELECT * FROM audit_logs WHERE 1=1`;
  const params = [];

  if (actorUsername) {
    query += ` AND actor_username LIKE ?`;
    params.push(`%${actorUsername.trim()}%`);
  }

  if (action) {
    query += ` AND action LIKE ?`;
    params.push(`%${action.trim()}%`);
  }

  if (targetType) {
    query += ` AND target_type = ?`;
    params.push(targetType);
  }

  if (startDate) {
    query += ` AND created_at >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND created_at <= ?`;
    params.push(endDate + ' 23:59:59');
  }

  const total = db.prepare(`SELECT COUNT(*) as total FROM (${query})`).get(...params).total;

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const logs = db.prepare(query).all(...params);

  return res.json({
    total,
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    logs
  });
});

module.exports = router;

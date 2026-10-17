const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// GET USER NOTIFICATIONS
router.get('/', (req, res) => {
  const notifications = db.prepare(`
    SELECT id, title, message, type, is_read as isRead, created_at as createdAt
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.id);

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
  `).get(req.user.id).count;

  return res.json({ unreadCount, notifications });
});

// MARK SINGLE READ
router.patch('/:id/read', (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, req.user.id);
  return res.json({ message: 'Notification marked as read.' });
});

// MARK ALL READ
router.patch('/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  return res.json({ message: 'All notifications marked as read.' });
});

module.exports = router;

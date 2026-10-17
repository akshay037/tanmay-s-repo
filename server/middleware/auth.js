const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'antigravity_super_secret_jwt_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session. Please log in again.' });
    }

    // Fetch fresh user state from database to catch instant deactivations/locks
    const user = db.prepare('SELECT id, username, role, status, must_change_password FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Your account has been deactivated. Access denied.' });
    }

    req.user = user;

    // If user must change password, allow access ONLY to /api/auth/change-password and /api/auth/logout
    if (user.must_change_password && !req.path.includes('/change-password') && !req.path.includes('/logout') && !req.path.includes('/me')) {
      return res.status(428).json({
        error: 'Password change required before proceeding.',
        mustChangePassword: true
      });
    }

    next();
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized access. Insufficient permissions.' });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireRole
};

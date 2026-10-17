const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const { logAudit } = require('../utils/logger');
const { getOrCreatePointAccount } = require('../utils/ledger');

const router = express.Router();

// LOGIN
router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());

  if (!user) {
    logAudit(req, { action: 'FAILED_LOGIN', targetName: username, newValue: 'Invalid username' });
    return res.status(401).json({ error: 'Invalid credentials. Please check your username and password.' });
  }

  // Account Status Check
  if (user.status !== 'ACTIVE') {
    logAudit(req, { action: 'FAILED_LOGIN_DEACTIVATED', targetId: user.id, targetName: user.username });
    return res.status(403).json({ error: 'Your account has been deactivated. Please contact your Administrator.' });
  }

  // Lockout check
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    return res.status(429).json({ error: `Account locked due to multiple failed login attempts. Try again in ${minutesLeft} minutes.` });
  }

  // Password verification
  const isMatch = bcrypt.compareSync(password, user.password_hash);

  if (!isMatch) {
    const failedAttempts = user.failed_login_attempts + 1;
    let lockedUntil = null;

    if (failedAttempts >= 5) {
      // Lock for 15 minutes after 5 failed attempts
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }

    db.prepare(`
      UPDATE users
      SET failed_login_attempts = ?, locked_until = ?
      WHERE id = ?
    `).run(failedAttempts, lockedUntil, user.id);

    logAudit(req, {
      action: 'FAILED_LOGIN_PASSWORD',
      targetId: user.id,
      targetName: user.username,
      newValue: `Failed attempt ${failedAttempts}`
    });

    return res.status(401).json({ error: 'Invalid credentials. Please check your username and password.' });
  }

  // Reset failed attempts on successful login
  db.prepare(`
    UPDATE users
    SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(user.id);

  // Fetch profile details
  let profile = null;
  let adminId = null;

  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    profile = db.prepare('SELECT * FROM admin_profiles WHERE user_id = ?').get(user.id);
  } else if (user.role === 'USER') {
    profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(user.id);
    if (profile) adminId = profile.admin_id;
  }

  // Ensure point account exists
  const pointAccount = getOrCreatePointAccount(user.id, user.role);

  // Generate JWT Token
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  logAudit(req, {
    action: 'USER_LOGIN',
    targetId: user.id,
    targetName: user.username,
    newValue: `Logged in as ${user.role}`
  });

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
      mustChangePassword: Boolean(user.must_change_password),
      name: profile ? profile.name : user.username,
      email: profile ? profile.email : null,
      phone: profile ? profile.phone : null,
      adminId: adminId,
      balance: pointAccount.balance
    }
  });
});

// GET CURRENT USER PROFILE & BALANCE
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, role, status, must_change_password, created_at, last_login_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let profile = null;
  let owningAdmin = null;

  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    profile = db.prepare('SELECT * FROM admin_profiles WHERE user_id = ?').get(user.id);
  } else if (user.role === 'USER') {
    profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(user.id);
    if (profile && profile.admin_id) {
      owningAdmin = db.prepare(`
        SELECT u.id, u.username, ap.name
        FROM users u
        LEFT JOIN admin_profiles ap ON ap.user_id = u.id
        WHERE u.id = ?
      `).get(profile.admin_id);
    }
  }

  const pointAccount = getOrCreatePointAccount(user.id, user.role);

  return res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    mustChangePassword: Boolean(user.must_change_password),
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
    name: profile ? profile.name : user.username,
    email: profile ? profile.email : null,
    phone: profile ? profile.phone : null,
    balance: pointAccount.balance,
    owningAdmin: owningAdmin,
    pointAccount: {
      balance: pointAccount.balance,
      totalReceived: pointAccount.total_received,
      totalDistributed: pointAccount.total_distributed
    }
  });
});

// CHANGE PASSWORD
router.post('/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  // If not forced to change password, require currentPassword validation
  if (!user.must_change_password) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required.' });
    }
    const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect current password.' });
    }
  }

  const salt = bcrypt.genSaltSync(10);
  const newPasswordHash = bcrypt.hashSync(newPassword, salt);

  db.prepare(`
    UPDATE users
    SET password_hash = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newPasswordHash, user.id);

  logAudit(req, {
    action: 'PASSWORD_CHANGED',
    targetId: user.id,
    targetName: user.username
  });

  return res.json({ message: 'Password updated successfully. You can now use your new password.' });
});

// LOGOUT
router.post('/logout', authenticateToken, (req, res) => {
  logAudit(req, { action: 'USER_LOGOUT', targetId: req.user.id, targetName: req.user.username });
  return res.json({ message: 'Logged out successfully.' });
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit, sendNotification } = require('../utils/logger');
const { getOrCreatePointAccount, mintSuperAdminPoints } = require('../utils/ledger');

const router = express.Router();

// All routes here require Super Admin role
router.use(authenticateToken, requireRole('SUPER_ADMIN'));

// GET ALL ADMINS WITH POINT STATS
router.get('/', (req, res) => {
  const admins = db.prepare(`
    SELECT
      u.id,
      u.username,
      u.status,
      u.must_change_password as mustChangePassword,
      u.created_at as createdAt,
      u.last_login_at as lastLoginAt,
      ap.name,
      ap.email,
      ap.phone,
      ap.notes,
      COALESCE(pa.balance, 0) as balance,
      COALESCE(pa.total_received, 0) as totalReceived,
      COALESCE(pa.total_distributed, 0) as totalDistributed,
      (
        SELECT COUNT(*) FROM user_profiles up
        JOIN users u_usr ON u_usr.id = up.user_id
        WHERE up.admin_id = u.id
      ) as userCount,
      (
        SELECT COUNT(*) FROM user_profiles up
        JOIN users u_usr ON u_usr.id = up.user_id
        WHERE up.admin_id = u.id AND u_usr.status = 'ACTIVE'
      ) as activeUserCount
    FROM users u
    JOIN admin_profiles ap ON ap.user_id = u.id
    LEFT JOIN point_accounts pa ON pa.owner_id = u.id AND pa.owner_type = 'ADMIN'
    WHERE u.role = 'ADMIN'
    ORDER BY u.created_at DESC
  `).all();

  return res.json(admins);
});

// GET SINGLE ADMIN DETAILS
router.get('/:id', (req, res) => {
  const adminId = parseInt(req.params.id, 10);
  const admin = db.prepare(`
    SELECT
      u.id,
      u.username,
      u.status,
      u.must_change_password as mustChangePassword,
      u.created_at as createdAt,
      u.last_login_at as lastLoginAt,
      ap.name,
      ap.email,
      ap.phone,
      ap.notes,
      COALESCE(pa.balance, 0) as balance,
      COALESCE(pa.total_received, 0) as totalReceived,
      COALESCE(pa.total_distributed, 0) as totalDistributed
    FROM users u
    JOIN admin_profiles ap ON ap.user_id = u.id
    LEFT JOIN point_accounts pa ON pa.owner_id = u.id AND pa.owner_type = 'ADMIN'
    WHERE u.id = ? AND u.role = 'ADMIN'
  `).get(adminId);

  if (!admin) {
    return res.status(404).json({ error: 'Admin account not found.' });
  }

  // Get Users under this Admin
  const users = db.prepare(`
    SELECT
      u.id, u.username, u.status, u.created_at as createdAt,
      up.name, up.email, up.phone,
      COALESCE(pa.balance, 0) as balance
    FROM user_profiles up
    JOIN users u ON u.id = up.user_id
    LEFT JOIN point_accounts pa ON pa.owner_id = u.id AND pa.owner_type = 'USER'
    WHERE up.admin_id = ?
    ORDER BY u.created_at DESC
  `).all(adminId);

  return res.json({ ...admin, users });
});

// CREATE ADMIN
router.post('/', (req, res) => {
  const { username, password, name, email, phone, notes } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Username, password, and full name are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) {
    return res.status(400).json({ error: `Username '${username.trim()}' is already taken.` });
  }

  const createAdminTxn = db.transaction(() => {
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    // Create user record
    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, role, status, must_change_password)
      VALUES (?, ?, 'ADMIN', 'ACTIVE', 1)
    `);
    const userRes = insertUser.run(username.trim(), password_hash);
    const adminId = userRes.lastInsertRowid;

    // Create profile
    db.prepare(`
      INSERT INTO admin_profiles (user_id, name, email, phone, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(adminId, name.trim(), email ? email.trim() : null, phone ? phone.trim() : null, notes ? notes.trim() : null);

    // Create point account initialized at 0 points balance
    getOrCreatePointAccount(adminId, 'ADMIN');

    logAudit(req, {
      action: 'CREATE_ADMIN',
      targetType: 'ADMIN',
      targetId: adminId,
      targetName: username.trim(),
      newValue: { name, email, role: 'ADMIN' }
    });

    return adminId;
  });

  try {
    const newAdminId = createAdminTxn();
    return res.status(201).json({
      message: 'Admin account created successfully.',
      admin: {
        id: newAdminId,
        username: username.trim(),
        name: name.trim(),
        mustChangePassword: true
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create Admin account.' });
  }
});

// EDIT ADMIN
router.put('/:id', (req, res) => {
  const adminId = parseInt(req.params.id, 10);
  const { name, email, phone, notes } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  const admin = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'ADMIN'").get(adminId);
  if (!admin) {
    return res.status(404).json({ error: 'Admin account not found.' });
  }

  const oldProfile = db.prepare('SELECT * FROM admin_profiles WHERE user_id = ?').get(adminId);

  db.prepare(`
    UPDATE admin_profiles
    SET name = ?, email = ?, phone = ?, notes = ?
    WHERE user_id = ?
  `).run(name.trim(), email ? email.trim() : null, phone ? phone.trim() : null, notes ? notes.trim() : null, adminId);

  logAudit(req, {
    action: 'EDIT_ADMIN',
    targetType: 'ADMIN',
    targetId: adminId,
    targetName: admin.username,
    oldValue: oldProfile,
    newValue: { name, email, phone, notes }
  });

  return res.json({ message: 'Admin details updated successfully.' });
});

// ENABLE / DISABLE ADMIN (Soft Deactivation)
router.patch('/:id/status', (req, res) => {
  const adminId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    return res.status(400).json({ error: "Status must be either 'ACTIVE' or 'INACTIVE'." });
  }

  const admin = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'ADMIN'").get(adminId);
  if (!admin) {
    return res.status(404).json({ error: 'Admin account not found.' });
  }

  db.prepare(`
    UPDATE users
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, adminId);

  logAudit(req, {
    action: status === 'ACTIVE' ? 'ACTIVATE_ADMIN' : 'DEACTIVATE_ADMIN',
    targetType: 'ADMIN',
    targetId: adminId,
    targetName: admin.username,
    oldValue: admin.status,
    newValue: status
  });

  sendNotification(
    adminId,
    `Account ${status === 'ACTIVE' ? 'Activated' : 'Deactivated'}`,
    `Your Admin account has been marked as ${status} by the Super Admin.`,
    status === 'ACTIVE' ? 'SUCCESS' : 'WARNING'
  );

  return res.json({ message: `Admin account has been ${status === 'ACTIVE' ? 'enabled' : 'deactivated'}.` });
});

// RESET ADMIN PASSWORD
router.post('/:id/reset-password', (req, res) => {
  const adminId = parseInt(req.params.id, 10);
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New temporary password must be at least 6 characters long.' });
  }

  const admin = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'ADMIN'").get(adminId);
  if (!admin) {
    return res.status(404).json({ error: 'Admin account not found.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(newPassword, salt);

  db.prepare(`
    UPDATE users
    SET password_hash = ?, must_change_password = 1, failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(password_hash, adminId);

  logAudit(req, {
    action: 'RESET_ADMIN_PASSWORD',
    targetType: 'ADMIN',
    targetId: adminId,
    targetName: admin.username
  });

  sendNotification(adminId, 'Password Reset', 'Your Admin account password was reset by Super Admin. You will be prompted to set a new password upon login.', 'INFO');

  return res.json({ message: 'Admin password reset successfully. The Admin must change their password on next login.' });
});

// MINT MORE POINTS INTO SUPER ADMIN POOL
router.post('/mint', (req, res) => {
  const { amount, reason } = req.body;
  const parsedAmount = parseInt(amount, 10);

  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive integer.' });
  }

  try {
    const result = mintSuperAdminPoints(req, req.user.id, parsedAmount, reason || 'Super Admin Refill');
    return res.json({
      message: `Successfully minted ${parsedAmount.toLocaleString()} points into Super Admin pool.`,
      newBalance: result.newBalance,
      txnId: result.txnId
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

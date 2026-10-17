const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit, sendNotification } = require('../utils/logger');
const { getOrCreatePointAccount } = require('../utils/ledger');

const router = express.Router();

router.use(authenticateToken);

// GET ALL USERS (Super Admin sees all; Admin sees only their own)
router.get('/', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
  let query = `
    SELECT
      u.id,
      u.username,
      u.status,
      u.must_change_password as mustChangePassword,
      u.created_at as createdAt,
      u.last_login_at as lastLoginAt,
      up.name,
      up.email,
      up.phone,
      up.notes,
      up.admin_id as adminId,
      adm_usr.username as adminUsername,
      adm_prof.name as adminName,
      COALESCE(pa.balance, 0) as balance,
      COALESCE(pa.total_received, 0) as totalReceived
    FROM users u
    JOIN user_profiles up ON up.user_id = u.id
    JOIN users adm_usr ON adm_usr.id = up.admin_id
    JOIN admin_profiles adm_prof ON adm_prof.user_id = up.admin_id
    LEFT JOIN point_accounts pa ON pa.owner_id = u.id AND pa.owner_type = 'USER'
    WHERE u.role = 'USER'
  `;

  const params = [];

  // Data Isolation: Admin sees only their own users
  if (req.user.role === 'ADMIN') {
    query += ` AND up.admin_id = ?`;
    params.push(req.user.id);
  }

  query += ` ORDER BY u.created_at DESC`;

  const users = db.prepare(query).all(...params);
  return res.json(users);
});

// GET SINGLE USER
router.get('/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'USER'), (req, res) => {
  const targetUserId = parseInt(req.params.id, 10);

  // Security authorization check
  if (req.user.role === 'USER' && req.user.id !== targetUserId) {
    return res.status(403).json({ error: 'Access denied. You cannot view another user profile.' });
  }

  const query = `
    SELECT
      u.id,
      u.username,
      u.status,
      u.must_change_password as mustChangePassword,
      u.created_at as createdAt,
      u.last_login_at as lastLoginAt,
      up.name,
      up.email,
      up.phone,
      up.notes,
      up.admin_id as adminId,
      adm_usr.username as adminUsername,
      adm_prof.name as adminName,
      COALESCE(pa.balance, 0) as balance,
      COALESCE(pa.total_received, 0) as totalReceived
    FROM users u
    JOIN user_profiles up ON up.user_id = u.id
    JOIN users adm_usr ON adm_usr.id = up.admin_id
    JOIN admin_profiles adm_prof ON adm_prof.user_id = up.admin_id
    LEFT JOIN point_accounts pa ON pa.owner_id = u.id AND pa.owner_type = 'USER'
    WHERE u.id = ? AND u.role = 'USER'
  `;

  const user = db.prepare(query).get(targetUserId);

  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  // Admin hierarchy ownership check
  if (req.user.role === 'ADMIN' && user.adminId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. This user does not belong to your Admin account.' });
  }

  return res.json(user);
});

// CREATE USER (Admin only, or Super Admin on behalf of Admin)
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
  const { username, password, name, email, phone, notes, adminId } = req.body;

  let assignedAdminId = req.user.id;
  if (req.user.role === 'SUPER_ADMIN') {
    if (!adminId) {
      return res.status(400).json({ error: 'Super Admin must specify an Admin ID to assign the User to.' });
    }
    assignedAdminId = parseInt(adminId, 10);
  }

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Username, password, and full name are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  // Verify Admin exists and is active
  const ownerAdmin = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'ADMIN'").get(assignedAdminId);
  if (!ownerAdmin || ownerAdmin.status !== 'ACTIVE') {
    return res.status(400).json({ error: 'The specified Admin account is not active or does not exist.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) {
    return res.status(400).json({ error: `Username '${username.trim()}' is already taken.` });
  }

  const createUserTxn = db.transaction(() => {
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, role, status, must_change_password)
      VALUES (?, ?, 'USER', 'ACTIVE', 1)
    `);
    const userRes = insertUser.run(username.trim(), password_hash);
    const newUserId = userRes.lastInsertRowid;

    db.prepare(`
      INSERT INTO user_profiles (user_id, admin_id, name, email, phone, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(newUserId, assignedAdminId, name.trim(), email ? email.trim() : null, phone ? phone.trim() : null, notes ? notes.trim() : null);

    // Initialize User point account
    getOrCreatePointAccount(newUserId, 'USER');

    logAudit(req, {
      action: 'CREATE_USER',
      targetType: 'USER',
      targetId: newUserId,
      targetName: username.trim(),
      newValue: { name, email, adminId: assignedAdminId }
    });

    return newUserId;
  });

  try {
    const newUserId = createUserTxn();
    return res.status(201).json({
      message: 'User account created successfully.',
      user: {
        id: newUserId,
        username: username.trim(),
        name: name.trim(),
        adminId: assignedAdminId,
        mustChangePassword: true
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create User account.' });
  }
});

// EDIT USER
router.put('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  const { name, email, phone, notes } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  const profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(targetUserId);
  if (!profile) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  // Admin data isolation check
  if (req.user.role === 'ADMIN' && profile.admin_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. You can only edit users belonging to your Admin account.' });
  }

  db.prepare(`
    UPDATE user_profiles
    SET name = ?, email = ?, phone = ?, notes = ?
    WHERE user_id = ?
  `).run(name.trim(), email ? email.trim() : null, phone ? phone.trim() : null, notes ? notes.trim() : null, targetUserId);

  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(targetUserId);

  logAudit(req, {
    action: 'EDIT_USER',
    targetType: 'USER',
    targetId: targetUserId,
    targetName: user ? user.username : 'USER',
    oldValue: profile,
    newValue: { name, email, phone, notes }
  });

  return res.json({ message: 'User details updated successfully.' });
});

// ENABLE / DISABLE USER
router.patch('/:id/status', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    return res.status(400).json({ error: "Status must be either 'ACTIVE' or 'INACTIVE'." });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'USER'").get(targetUserId);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const profile = db.prepare('SELECT admin_id FROM user_profiles WHERE user_id = ?').get(targetUserId);
  if (req.user.role === 'ADMIN' && profile.admin_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. You can only modify users belonging to your Admin account.' });
  }

  db.prepare(`
    UPDATE users
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, targetUserId);

  logAudit(req, {
    action: status === 'ACTIVE' ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
    targetType: 'USER',
    targetId: targetUserId,
    targetName: user.username,
    oldValue: user.status,
    newValue: status
  });

  sendNotification(
    targetUserId,
    `Account ${status === 'ACTIVE' ? 'Activated' : 'Deactivated'}`,
    `Your User account status has been changed to ${status}.`,
    status === 'ACTIVE' ? 'SUCCESS' : 'WARNING'
  );

  return res.json({ message: `User account has been ${status === 'ACTIVE' ? 'enabled' : 'deactivated'}.` });
});

// RESET USER PASSWORD
router.post('/:id/reset-password', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New temporary password must be at least 6 characters long.' });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'USER'").get(targetUserId);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const profile = db.prepare('SELECT admin_id FROM user_profiles WHERE user_id = ?').get(targetUserId);
  if (req.user.role === 'ADMIN' && profile.admin_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. You can only reset passwords for users belonging to your Admin account.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(newPassword, salt);

  db.prepare(`
    UPDATE users
    SET password_hash = ?, must_change_password = 1, failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(password_hash, targetUserId);

  logAudit(req, {
    action: 'RESET_USER_PASSWORD',
    targetType: 'USER',
    targetId: targetUserId,
    targetName: user.username
  });

  sendNotification(targetUserId, 'Password Reset', 'Your password was reset by your Admin. You must change your password on next login.', 'INFO');

  return res.json({ message: 'User password reset successfully. User must change password on next login.' });
});

// TRANSFER USER TO ANOTHER ADMIN (SUPER ADMIN ONLY)
router.post('/:id/transfer', requireRole('SUPER_ADMIN'), (req, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  const { newAdminId, reason } = req.body;

  if (!newAdminId) {
    return res.status(400).json({ error: 'Destination Admin ID (newAdminId) is required.' });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'USER'").get(targetUserId);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const currentProfile = db.prepare('SELECT admin_id FROM user_profiles WHERE user_id = ?').get(targetUserId);
  const previousAdminId = currentProfile.admin_id;

  if (previousAdminId === parseInt(newAdminId, 10)) {
    return res.status(400).json({ error: 'User already belongs to this Admin.' });
  }

  const targetAdmin = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'ADMIN'").get(newAdminId);
  if (!targetAdmin || targetAdmin.status !== 'ACTIVE') {
    return res.status(400).json({ error: 'Destination Admin is not active or does not exist.' });
  }

  const executeTransfer = db.transaction(() => {
    // Update profile owner
    db.prepare('UPDATE user_profiles SET admin_id = ? WHERE user_id = ?').run(newAdminId, targetUserId);

    // Record transfer log
    db.prepare(`
      INSERT INTO admin_user_transfers (user_id, previous_admin_id, new_admin_id, reason, transferred_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(targetUserId, previousAdminId, newAdminId, reason || 'Super Admin reassignment', req.user.id);

    logAudit(req, {
      action: 'TRANSFER_USER_ADMIN',
      targetType: 'USER',
      targetId: targetUserId,
      targetName: user.username,
      oldValue: { previousAdminId },
      newValue: { newAdminId, reason }
    });

    sendNotification(targetUserId, 'Admin Reassigned', `You have been reassigned to Admin ${targetAdmin.username}. Your existing point balance remains intact.`, 'INFO');
    sendNotification(newAdminId, 'New User Assigned', `User ${user.username} has been transferred to your management by Super Admin.`, 'INFO');

    return true;
  });

  try {
    executeTransfer();
    return res.json({ message: `User ${user.username} transferred successfully to Admin ID ${newAdminId}. Point balance retained.` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

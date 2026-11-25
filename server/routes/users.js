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
      u.must_change_transfer_password as mustChangeTransferPassword,
      u.created_at as createdAt,
      u.last_login_at as lastLoginAt,
      up.name,
      up.email,
      up.phone,
      up.notes,
      up.usdt_address as usdtAddress,
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
      u.must_change_transfer_password as mustChangeTransferPassword,
      u.created_at as createdAt,
      u.last_login_at as lastLoginAt,
      up.name,
      up.email,
      up.phone,
      up.notes,
      up.usdt_address as usdtAddress,
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
  const { username, password, transferPassword, name, email, phone, notes, adminId } = req.body;

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

  const initialTransferPassword = transferPassword && transferPassword.trim() ? transferPassword.trim() : password;
  if (initialTransferPassword.length < 6) {
    return res.status(400).json({ error: 'Transfer password must be at least 6 characters long.' });
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
    const transfer_salt = bcrypt.genSaltSync(10);
    const transfer_password_hash = bcrypt.hashSync(initialTransferPassword, transfer_salt);

    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, transfer_password_hash, role, status, must_change_password, must_change_transfer_password)
      VALUES (?, ?, ?, 'USER', 'ACTIVE', 1, 1)
    `);
    const userRes = insertUser.run(username.trim(), password_hash, transfer_password_hash);
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
        mustChangePassword: true,
        mustChangeTransferPassword: true
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create User account.' });
  }
});

// EDIT USER
router.put('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  const { name, email, phone, notes, usdtAddress } = req.body;

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

    const newUsdtAddress = usdtAddress !== undefined ? (usdtAddress ? usdtAddress.trim() : null) : profile.usdt_address;
  db.prepare(`
    UPDATE user_profiles
    SET name = ?, email = ?, phone = ?, notes = ?, usdt_address = ?
    WHERE user_id = ?
  `).run(name.trim(), email ? email.trim() : null, phone ? phone.trim() : null, notes ? notes.trim() : null, newUsdtAddress, targetUserId);

  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(targetUserId);

  logAudit(req, {
    action: 'EDIT_USER',
    targetType: 'USER',
    targetId: targetUserId,
    targetName: user ? user.username : 'USER',
    oldValue: profile,
    newValue: { name, email, phone, notes, usdtAddress: newUsdtAddress }
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

// RESET USER PASSWORD (LOGIN OR TRANSFER OR BOTH)
router.post('/:id/reset-password', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  const { newPassword, newTransferPassword, resetType = 'LOGIN' } = req.body;

  const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'USER'").get(targetUserId);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const profile = db.prepare('SELECT admin_id FROM user_profiles WHERE user_id = ?').get(targetUserId);
  if (req.user.role === 'ADMIN' && profile.admin_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. You can only reset passwords for users belonging to your Admin account.' });
  }

  let resetLogin = resetType === 'LOGIN' || resetType === 'BOTH' || (newPassword && !newTransferPassword);
  let resetTransfer = resetType === 'TRANSFER' || resetType === 'BOTH' || (newTransferPassword && !newPassword);

  if (!resetLogin && !resetTransfer) {
    resetLogin = true;
  }

  if (resetLogin && (!newPassword || newPassword.length < 6)) {
    return res.status(400).json({ error: 'New temporary login password must be at least 6 characters long.' });
  }
  if (resetTransfer && (!newTransferPassword || newTransferPassword.length < 6)) {
    return res.status(400).json({ error: 'New temporary transfer password must be at least 6 characters long.' });
  }

  const updates = [];
  const params = [];

  if (resetLogin) {
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(newPassword, salt);
    updates.push('password_hash = ?, must_change_password = 1, failed_login_attempts = 0, locked_until = NULL');
    params.push(password_hash);
  }

  if (resetTransfer) {
    const transferSalt = bcrypt.genSaltSync(10);
    const transfer_password_hash = bcrypt.hashSync(newTransferPassword, transferSalt);
    updates.push('transfer_password_hash = ?, must_change_transfer_password = 1');
    params.push(transfer_password_hash);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(targetUserId);

  db.prepare(`
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = ?
  `).run(...params);

  logAudit(req, {
    action: resetLogin && resetTransfer ? 'RESET_USER_PASSWORDS' : (resetTransfer ? 'RESET_USER_TRANSFER_PASSWORD' : 'RESET_USER_PASSWORD'),
    targetType: 'USER',
    targetId: targetUserId,
    targetName: user.username,
    newValue: { resetLogin, resetTransfer }
  });

  const msgParts = [];
  if (resetLogin) msgParts.push('login password (required on next login)');
  if (resetTransfer) msgParts.push('transfer password (required on next transfer)');
  sendNotification(targetUserId, 'Password Reset', `Your ${msgParts.join(' and ')} was reset by your Admin.`, 'INFO');

  return res.json({ message: `User ${msgParts.join(' and ')} reset successfully.` });
});

// RESET USER TRANSFER PASSWORD SPECIFICALLY
router.post('/:id/reset-transfer-password', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  const { newTransferPassword } = req.body;

  if (!newTransferPassword || newTransferPassword.length < 6) {
    return res.status(400).json({ error: 'New temporary transfer password must be at least 6 characters long.' });
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
  const transfer_password_hash = bcrypt.hashSync(newTransferPassword, salt);

  db.prepare(`
    UPDATE users
    SET transfer_password_hash = ?, must_change_transfer_password = 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(transfer_password_hash, targetUserId);

  logAudit(req, {
    action: 'RESET_USER_TRANSFER_PASSWORD',
    targetType: 'USER',
    targetId: targetUserId,
    targetName: user.username
  });

  sendNotification(targetUserId, 'Transfer Password Reset', 'Your transfer password was reset by your Admin. You must change your transfer password before making user-to-user transfers.', 'INFO');

  return res.json({ message: 'User transfer password reset successfully. User must change transfer password before next transfer.' });
});

// DELETE USER ACCOUNT (ADMIN & SUPER ADMIN)
const handleDeleteUser = (req, res) => {
  const targetUserId = parseInt(req.params.id, 10);

  const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'USER'").get(targetUserId);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(targetUserId);
  if (!profile) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  if (req.user.role === 'ADMIN' && profile.admin_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. You can only delete users belonging to your Admin account.' });
  }

  const deleteTxn = db.transaction(() => {
    // 1. Check user point account balance
    const userPointAccount = db.prepare("SELECT * FROM point_accounts WHERE owner_id = ? AND owner_type = 'USER'").get(targetUserId);
    const userBalance = userPointAccount ? userPointAccount.balance : 0;

    // Refund remaining user points directly to their Admin's point account
    let refunded = 0;
    if (userBalance > 0) {
      refunded = userBalance;
      db.prepare(`
        UPDATE point_accounts
        SET balance = balance + ?, total_received = total_received + ?, updated_at = CURRENT_TIMESTAMP
        WHERE owner_id = ? AND owner_type = 'ADMIN'
      `).run(userBalance, userBalance, profile.admin_id);
    }

    // 2. Cascade delete all linked records to avoid FK violations
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(targetUserId);
    db.prepare('DELETE FROM casino_bets WHERE user_id = ?').run(targetUserId);
    db.prepare('DELETE FROM lotto_bets WHERE user_id = ?').run(targetUserId);
    db.prepare('DELETE FROM user_withdrawal_requests WHERE user_id = ?').run(targetUserId);
    db.prepare('DELETE FROM user_transfers WHERE sender_id = ? OR receiver_id = ?').run(targetUserId, targetUserId);
    if (userPointAccount) {
      db.prepare('DELETE FROM point_transactions WHERE created_by = ? OR from_account_id = ? OR to_account_id = ?')
        .run(targetUserId, userPointAccount.id, userPointAccount.id);
      db.prepare('DELETE FROM point_accounts WHERE id = ?').run(userPointAccount.id);
    }
    db.prepare('DELETE FROM admin_user_transfers WHERE user_id = ?').run(targetUserId);
    db.prepare('DELETE FROM user_profiles WHERE user_id = ?').run(targetUserId);
    db.prepare('DELETE FROM users WHERE id = ?').run(targetUserId);

    logAudit(req, {
      action: 'DELETE_USER',
      targetType: 'USER',
      targetId: targetUserId,
      targetName: user.username,
      oldValue: {
        username: user.username,
        name: profile.name,
        adminId: profile.admin_id,
        refundedBalance: refunded
      }
    });

    return refunded;
  });

  try {
    const refundedBalance = deleteTxn();
    return res.json({
      message: `User account @${user.username} has been permanently deleted.${refundedBalance > 0 ? ` ${refundedBalance.toLocaleString()} points were refunded back to Admin.` : ''}`,
      refundedBalance
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to delete user account.' });
  }
};

router.delete('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), handleDeleteUser);
router.post('/:id/delete', requireRole('SUPER_ADMIN', 'ADMIN'), handleDeleteUser);
router.delete('/delete/:id', requireRole('SUPER_ADMIN', 'ADMIN'), handleDeleteUser);
router.post('/delete/:id', requireRole('SUPER_ADMIN', 'ADMIN'), handleDeleteUser);

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


// USER SETS OR LOCKS USDT ADDRESS
router.post('/me/usdt-address', (req, res) => {
  const { usdtAddress } = req.body;
  if (!usdtAddress || !String(usdtAddress).trim()) {
    return res.status(400).json({ error: 'USDT Address is required.' });
  }
  const profile = db.prepare('SELECT usdt_address FROM user_profiles WHERE user_id = ?').get(req.user.id);
  if (profile && profile.usdt_address && profile.usdt_address.trim()) {
    return res.status(400).json({ error: 'USDT Address is already set and locked for this account. Please contact your Admin to update it.' });
  }
  const cleanAddress = String(usdtAddress).trim();
  db.prepare('UPDATE user_profiles SET usdt_address = ? WHERE user_id = ?').run(cleanAddress, req.user.id);
  logAudit(req, {
    action: 'SET_USER_USDT_ADDRESS',
    targetType: 'USER',
    targetId: req.user.id,
    targetName: req.user.username,
    newValue: { usdtAddress: cleanAddress }
  });
  return res.json({ message: 'USDT Address saved and locked successfully.', usdtAddress: cleanAddress });
});

router.handleDeleteUser = handleDeleteUser;

module.exports = router;

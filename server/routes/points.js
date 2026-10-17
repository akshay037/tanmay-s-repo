const express = require('express');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { transferPoints, reverseTransaction, mintSuperAdminPoints } = require('../utils/ledger');
const { logAudit, sendNotification } = require('../utils/logger');

const router = express.Router();

router.use(authenticateToken);

/**
 * 1. SUPER ADMIN ALLOCATES POINTS TO AN ADMIN (OR MINTS TO SELF)
 */
router.post('/allocate-admin', requireRole('SUPER_ADMIN'), (req, res) => {
  const { adminId, amount, reference, description, idempotencyKey } = req.body;

  if (!adminId || !amount) {
    return res.status(400).json({ error: 'Admin ID and amount are required.' });
  }

  const parsedAmount = parseInt(amount, 10);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Point allocation amount must be a positive integer.' });
  }

  // Handle Super Admin allocating points to self (Master Refill)
  if (adminId === 'SELF' || adminId === 'self' || String(adminId) === String(req.user.id)) {
    try {
      const result = mintSuperAdminPoints(req, req.user.id, parsedAmount, description || reference || 'Super Admin Self Mint');
      return res.json({
        message: `Successfully added ${parsedAmount.toLocaleString()} points to Super Admin Master Pool.`,
        newBalance: result.newBalance,
        txnId: result.txnId,
        isSelfMint: true
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  const admin = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'ADMIN'").get(adminId);
  if (!admin) {
    return res.status(404).json({ error: 'Target Admin account not found.' });
  }

  if (admin.status !== 'ACTIVE') {
    return res.status(400).json({ error: 'Cannot allocate points to a deactivated Admin account.' });
  }

  try {
    const result = transferPoints({
      req,
      fromOwnerId: req.user.id,
      fromOwnerType: 'SUPER_ADMIN',
      toOwnerId: admin.id,
      toOwnerType: 'ADMIN',
      amount: parsedAmount,
      transactionType: 'ADMIN_ALLOCATION',
      reference: reference || 'SUPER_ADMIN_DIRECT_ALLOCATION',
      description: description || `Points allocated by Super Admin to Admin ${admin.username}`,
      idempotencyKey
    });

    return res.json({
      message: `Successfully allocated ${parsedAmount.toLocaleString()} points to Admin ${admin.username}.`,
      transaction: result.transaction,
      isDuplicate: result.duplicate
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * 2. ADMIN DISTRIBUTES POINTS TO A USER
 */
router.post('/distribute-user', requireRole('ADMIN'), (req, res) => {
  const { userId, amount, reference, description, idempotencyKey } = req.body;

  if (!userId || !amount) {
    return res.status(400).json({ error: 'User ID and amount are required.' });
  }

  const parsedAmount = parseInt(amount, 10);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Point distribution amount must be a positive integer.' });
  }

  // Check user exists and belongs to this Admin
  const profile = db.prepare('SELECT admin_id FROM user_profiles WHERE user_id = ?').get(userId);
  if (!profile) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  if (profile.admin_id !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized. You can only distribute points to your own users.' });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'USER'").get(userId);
  if (!user || user.status !== 'ACTIVE') {
    return res.status(400).json({ error: 'Target User account is inactive or does not exist.' });
  }

  try {
    const result = transferPoints({
      req,
      fromOwnerId: req.user.id,
      fromOwnerType: 'ADMIN',
      toOwnerId: user.id,
      toOwnerType: 'USER',
      amount: parsedAmount,
      transactionType: 'USER_ALLOCATION',
      reference: reference || 'ADMIN_USER_DISTRIBUTION',
      description: description || `Points distributed by Admin ${req.user.username} to User ${user.username}`,
      idempotencyKey
    });

    return res.json({
      message: `Successfully distributed ${parsedAmount.toLocaleString()} points to User ${user.username}.`,
      transaction: result.transaction,
      isDuplicate: result.duplicate
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * 3. ADMIN SUBMITS POINT REQUEST
 */
router.post('/request', requireRole('ADMIN'), (req, res) => {
  const { requestedAmount, reason, note } = req.body;

  if (!requestedAmount || !reason) {
    return res.status(400).json({ error: 'Requested amount and reason are required.' });
  }

  const parsedAmount = parseInt(requestedAmount, 10);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Requested amount must be a positive integer.' });
  }

  // Prevent spamming identical pending requests
  const pendingCount = db.prepare("SELECT COUNT(*) as count FROM point_requests WHERE admin_id = ? AND status = 'PENDING'").get(req.user.id);
  if (pendingCount.count >= 5) {
    return res.status(429).json({ error: 'You already have 5 pending point requests. Please wait for Super Admin review.' });
  }

  const requestCode = `REQ-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  const resDb = db.prepare(`
    INSERT INTO point_requests (request_code, admin_id, requested_amount, reason, note, status)
    VALUES (?, ?, ?, ?, ?, 'PENDING')
  `).run(requestCode, req.user.id, parsedAmount, reason.trim(), note ? note.trim() : null);

  logAudit(req, {
    action: 'CREATE_POINT_REQUEST',
    targetType: 'POINT_REQUEST',
    targetId: resDb.lastInsertRowid,
    targetName: requestCode,
    newValue: { requestedAmount: parsedAmount, reason }
  });

  // Notify Super Admins
  const superAdmins = db.prepare("SELECT id FROM users WHERE role = 'SUPER_ADMIN'").all();
  superAdmins.forEach(sa => {
    sendNotification(sa.id, 'New Point Request', `Admin ${req.user.username} requested ${parsedAmount.toLocaleString()} points. Reason: ${reason}`, 'INFO');
  });

  return res.status(201).json({
    message: 'Point request submitted successfully to Super Admin.',
    requestCode
  });
});

/**
 * 4. GET POINT REQUESTS (Super Admin views all; Admin views their own)
 */
router.get('/requests', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
  let query = `
    SELECT
      pr.id,
      pr.request_code as requestCode,
      pr.admin_id as adminId,
      adm_usr.username as adminUsername,
      adm_prof.name as adminName,
      pr.requested_amount as requestedAmount,
      pr.approved_amount as approvedAmount,
      pr.reason,
      pr.note,
      pr.status,
      pr.reviewer_comment as reviewerComment,
      pr.created_at as createdAt,
      pr.reviewed_at as reviewedAt
    FROM point_requests pr
    JOIN users adm_usr ON adm_usr.id = pr.admin_id
    JOIN admin_profiles adm_prof ON adm_prof.user_id = pr.admin_id
  `;

  const params = [];
  if (req.user.role === 'ADMIN') {
    query += ` WHERE pr.admin_id = ?`;
    params.push(req.user.id);
  }

  query += ` ORDER BY pr.created_at DESC`;

  const requests = db.prepare(query).all(...params);
  return res.json(requests);
});

/**
 * 5. SUPER ADMIN REVIEWS POINT REQUEST (Approve / Partial Approve / Reject)
 */
router.post('/requests/:id/review', requireRole('SUPER_ADMIN'), (req, res) => {
  const requestId = parseInt(req.params.id, 10);
  const { status, approvedAmount, reviewerComment } = req.body;

  if (!['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: "Status must be 'APPROVED', 'PARTIALLY_APPROVED', or 'REJECTED'." });
  }

  const pointReq = db.prepare('SELECT * FROM point_requests WHERE id = ?').get(requestId);
  if (!pointReq) {
    return res.status(404).json({ error: 'Point request not found.' });
  }

  if (pointReq.status !== 'PENDING') {
    return res.status(400).json({ error: `This request has already been reviewed (Current status: ${pointReq.status}).` });
  }

  let finalApprovedAmount = 0;
  if (status === 'APPROVED') {
    finalApprovedAmount = pointReq.requested_amount;
  } else if (status === 'PARTIALLY_APPROVED') {
    finalApprovedAmount = parseInt(approvedAmount, 10);
    if (isNaN(finalApprovedAmount) || finalApprovedAmount <= 0 || finalApprovedAmount >= pointReq.requested_amount) {
      return res.status(400).json({ error: `Partially approved amount must be greater than 0 and less than requested amount (${pointReq.requested_amount}).` });
    }
  }

  const reviewTxn = db.transaction(() => {
    // Update Request status
    db.prepare(`
      UPDATE point_requests
      SET status = ?, approved_amount = ?, reviewer_comment = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, finalApprovedAmount, reviewerComment ? reviewerComment.trim() : null, req.user.id, requestId);

    // If approved or partially approved, execute actual point transfer from Super Admin to Admin
    let transferRes = null;
    if (finalApprovedAmount > 0) {
      transferRes = transferPoints({
        req,
        fromOwnerId: req.user.id,
        fromOwnerType: 'SUPER_ADMIN',
        toOwnerId: pointReq.admin_id,
        toOwnerType: 'ADMIN',
        amount: finalApprovedAmount,
        transactionType: 'ADMIN_ALLOCATION',
        reference: pointReq.request_code,
        description: `Approved Point Request ${pointReq.request_code} (${status})`
      });
    }

    logAudit(req, {
      action: `POINT_REQUEST_${status}`,
      targetType: 'POINT_REQUEST',
      targetId: requestId,
      targetName: pointReq.request_code,
      oldValue: { status: 'PENDING' },
      newValue: { status, approvedAmount: finalApprovedAmount, comment: reviewerComment }
    });

    sendNotification(
      pointReq.admin_id,
      `Point Request ${status}`,
      `Your request (${pointReq.request_code}) for ${pointReq.requested_amount.toLocaleString()} points was ${status.replace('_', ' ')}: ${finalApprovedAmount.toLocaleString()} points credited.`,
      status === 'REJECTED' ? 'ALERT' : 'SUCCESS'
    );

    return transferRes;
  });

  try {
    reviewTxn();
    return res.json({ message: `Point request ${pointReq.request_code} has been marked as ${status}.` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 6. REVERSE TRANSACTION (SUPER ADMIN ONLY)
 */
router.post('/transactions/:id/reverse', requireRole('SUPER_ADMIN'), (req, res) => {
  const originalTxnId = req.params.id;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: 'Reason for transaction reversal is required.' });
  }

  try {
    const result = reverseTransaction(req, originalTxnId, reason);
    return res.json({
      message: `Transaction ${originalTxnId} reversed successfully. Reversal transaction ID: ${result.reversalTxnId}`,
      result
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;

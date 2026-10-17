const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// GET TRANSACTIONS LIST WITH SEARCH & FILTERS
router.get('/', (req, res) => {
  const {
    adminId,
    userId,
    transactionType,
    status,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    search,
    limit = 50,
    offset = 0
  } = req.query;

  let baseQuery = `
    SELECT
      pt.id,
      pt.transaction_id as transactionId,
      pt.amount,
      pt.transaction_type as transactionType,
      pt.status,
      pt.from_balance_before as fromBalanceBefore,
      pt.from_balance_after as fromBalanceAfter,
      pt.to_balance_before as toBalanceBefore,
      pt.to_balance_after as toBalanceAfter,
      pt.reference,
      pt.description,
      pt.created_at as createdAt,
      fa.owner_id as fromOwnerId,
      fa.owner_type as fromOwnerType,
      from_u.username as fromUsername,
      from_u.role as fromRole,
      COALESCE(from_ap.name, from_up.name, from_u.username) as fromName,
      ta.owner_id as toOwnerId,
      ta.owner_type as toOwnerType,
      to_u.username as toUsername,
      to_u.role as toRole,
      COALESCE(to_ap.name, to_up.name, to_u.username) as toName,
      creator.username as createdByUsername
    FROM point_transactions pt
    JOIN point_accounts fa ON fa.id = pt.from_account_id
    JOIN point_accounts ta ON ta.id = pt.to_account_id
    JOIN users from_u ON from_u.id = fa.owner_id
    LEFT JOIN admin_profiles from_ap ON from_ap.user_id = from_u.id
    LEFT JOIN user_profiles from_up ON from_up.user_id = from_u.id
    JOIN users to_u ON to_u.id = ta.owner_id
    LEFT JOIN admin_profiles to_ap ON to_ap.user_id = to_u.id
    LEFT JOIN user_profiles to_up ON to_up.user_id = to_u.id
    JOIN users creator ON creator.id = pt.created_by
    WHERE 1=1
  `;

  const params = [];

  // DATA ISOLATION ACCORDING TO ROLE
  if (req.user.role === 'ADMIN') {
    // Admin sees transactions where from/to is this Admin OR from/to is one of their Users
    baseQuery += ` AND (
      fa.owner_id = ? OR ta.owner_id = ? OR
      fa.owner_id IN (SELECT user_id FROM user_profiles WHERE admin_id = ?) OR
      ta.owner_id IN (SELECT user_id FROM user_profiles WHERE admin_id = ?)
    )`;
    params.push(req.user.id, req.user.id, req.user.id, req.user.id);
  } else if (req.user.role === 'USER') {
    // User sees transactions where they are sender or recipient
    baseQuery += ` AND (fa.owner_id = ? OR ta.owner_id = ?)`;
    params.push(req.user.id, req.user.id);
  }

  // OPTIONAL FILTERS
  if (adminId) {
    baseQuery += ` AND (fa.owner_id = ? OR ta.owner_id = ?)`;
    params.push(adminId, adminId);
  }

  if (userId) {
    baseQuery += ` AND (fa.owner_id = ? OR ta.owner_id = ?)`;
    params.push(userId, userId);
  }

  if (transactionType) {
    baseQuery += ` AND pt.transaction_type = ?`;
    params.push(transactionType);
  }

  if (status) {
    baseQuery += ` AND pt.status = ?`;
    params.push(status);
  }

  if (startDate) {
    baseQuery += ` AND pt.created_at >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    baseQuery += ` AND pt.created_at <= ?`;
    params.push(endDate + ' 23:59:59');
  }

  if (minAmount) {
    baseQuery += ` AND pt.amount >= ?`;
    params.push(parseInt(minAmount, 10));
  }

  if (maxAmount) {
    baseQuery += ` AND pt.amount <= ?`;
    params.push(parseInt(maxAmount, 10));
  }

  if (search) {
    const searchPattern = `%${search.trim()}%`;
    baseQuery += ` AND (
      pt.transaction_id LIKE ? OR
      from_u.username LIKE ? OR
      to_u.username LIKE ? OR
      pt.reference LIKE ? OR
      pt.description LIKE ?
    )`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
  }

  // Count total matching records for pagination
  const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery})`;
  const totalCount = db.prepare(countQuery).get(...params).total;

  baseQuery += ` ORDER BY pt.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const transactions = db.prepare(baseQuery).all(...params);

  return res.json({
    total: totalCount,
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    transactions
  });
});

// GET INDIVIDUAL TRANSACTION DETAILS
router.get('/:id', (req, res) => {
  const txnIdOrCode = req.params.id;

  const txn = db.prepare(`
    SELECT
      pt.id,
      pt.transaction_id as transactionId,
      pt.amount,
      pt.transaction_type as transactionType,
      pt.status,
      pt.from_balance_before as fromBalanceBefore,
      pt.from_balance_after as fromBalanceAfter,
      pt.to_balance_before as toBalanceBefore,
      pt.to_balance_after as toBalanceAfter,
      pt.idempotency_key as idempotencyKey,
      pt.reference,
      pt.description,
      pt.created_at as createdAt,
      fa.owner_id as fromOwnerId,
      fa.owner_type as fromOwnerType,
      from_u.username as fromUsername,
      from_u.role as fromRole,
      COALESCE(from_ap.name, from_up.name, from_u.username) as fromName,
      ta.owner_id as toOwnerId,
      ta.owner_type as toOwnerType,
      to_u.username as toUsername,
      to_u.role as toRole,
      COALESCE(to_ap.name, to_up.name, to_u.username) as toName,
      creator.username as createdByUsername
    FROM point_transactions pt
    JOIN point_accounts fa ON fa.id = pt.from_account_id
    JOIN point_accounts ta ON ta.id = pt.to_account_id
    JOIN users from_u ON from_u.id = fa.owner_id
    LEFT JOIN admin_profiles from_ap ON from_ap.user_id = from_u.id
    LEFT JOIN user_profiles from_up ON from_up.user_id = from_u.id
    JOIN users to_u ON to_u.id = ta.owner_id
    LEFT JOIN admin_profiles to_ap ON to_ap.user_id = to_u.id
    LEFT JOIN user_profiles to_up ON to_up.user_id = to_u.id
    JOIN users creator ON creator.id = pt.created_by
    WHERE pt.transaction_id = ? OR pt.id = ?
  `).get(txnIdOrCode, txnIdOrCode);

  if (!txn) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }

  // Authorization Check
  if (req.user.role === 'USER') {
    if (txn.fromOwnerId !== req.user.id && txn.toOwnerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this transaction record.' });
    }
  } else if (req.user.role === 'ADMIN') {
    const isOwner = txn.fromOwnerId === req.user.id || txn.toOwnerId === req.user.id;
    const isUserOwnedByAdmin = db.prepare('SELECT admin_id FROM user_profiles WHERE user_id IN (?, ?) AND admin_id = ?').get(txn.fromOwnerId, txn.toOwnerId, req.user.id);
    if (!isOwner && !isUserOwnedByAdmin) {
      return res.status(403).json({ error: 'Access denied to this transaction record.' });
    }
  }

  return res.json(txn);
});

module.exports = router;

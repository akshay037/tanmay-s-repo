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

// GET USER BALANCE HISTORY & SUMMARY (Deposits, Withdrawals & Game Activity)
router.get('/balance-history', (req, res) => {
  let targetUserId = req.user.id;

  if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
    if (req.query.userId) {
      targetUserId = parseInt(req.query.userId, 10);
      if (req.user.role === 'ADMIN') {
        const owned = db.prepare('SELECT admin_id FROM user_profiles WHERE user_id = ? AND admin_id = ?').get(targetUserId, req.user.id);
        if (!owned) {
          return res.status(403).json({ error: 'Access denied. User does not belong to your admin account.' });
        }
      }
    }
  }

  const user = db.prepare(`
    SELECT u.id, u.username, up.name, adm_u.username as adminUsername, COALESCE(adm_p.name, adm_u.username) as adminName
    FROM users u
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN users adm_u ON adm_u.id = up.admin_id
    LEFT JOIN admin_profiles adm_p ON adm_p.user_id = up.admin_id
    WHERE u.id = ?
  `).get(targetUserId);

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const account = db.prepare("SELECT id, balance, total_received, total_distributed FROM point_accounts WHERE owner_id = ?").get(targetUserId) || {
    id: 0,
    balance: 0,
    total_received: 0,
    total_distributed: 0
  };

  const accountId = account.id;

  // Summary Metrics
  const depositsSummary = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM point_transactions
    WHERE to_account_id = ? AND transaction_type = 'USER_ALLOCATION' AND status = 'COMPLETED'
  `).get(accountId);

  const withdrawalsSummary = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM point_transactions
    WHERE from_account_id = ? AND transaction_type IN ('USER_WITHDRAWAL', 'USER_REVERSAL') AND status = 'COMPLETED'
  `).get(accountId);

  const casinoSummary = db.prepare(`
    SELECT
      COALESCE(SUM(bet_amount), 0) as totalWagered,
      COALESCE(SUM(payout), 0) as totalWon,
      COALESCE(SUM(net_profit), 0) as netProfit,
      COUNT(*) as count
    FROM casino_bets
    WHERE user_id = ?
  `).get(targetUserId);

  const lottoSummary = db.prepare(`
    SELECT
      COALESCE(SUM(stake), 0) as totalWagered,
      COALESCE(SUM(payout), 0) as totalWon,
      COALESCE(SUM(net_profit), 0) as netProfit,
      COUNT(*) as count
    FROM lotto_bets
    WHERE user_id = ?
  `).get(targetUserId);

  const totalGameWagered = (casinoSummary?.totalWagered || 0) + (lottoSummary?.totalWagered || 0);
  const totalGameWon = (casinoSummary?.totalWon || 0) + (lottoSummary?.totalWon || 0);
  const netGameProfit = (casinoSummary?.netProfit || 0) + (lottoSummary?.netProfit || 0);

  const {
    type = 'ALL',
    search = '',
    startDate = '',
    endDate = '',
    limit = 50,
    offset = 0
  } = req.query;

  // Unified Query Building
  const queries = [];
  const queryParams = [];

  // 1. Point Transactions (Deposits & Withdrawals)
  if (type === 'ALL' || type === 'DEPOSITS' || type === 'WITHDRAWALS') {
    let ptFilter = '';
    if (type === 'DEPOSITS') {
      ptFilter = ` AND pt.to_account_id = ${accountId} AND pt.transaction_type = 'USER_ALLOCATION'`;
    } else if (type === 'WITHDRAWALS') {
      ptFilter = ` AND pt.from_account_id = ${accountId} AND pt.transaction_type IN ('USER_WITHDRAWAL', 'USER_REVERSAL')`;
    } else {
      ptFilter = ` AND (pt.to_account_id = ${accountId} OR pt.from_account_id = ${accountId})`;
    }

    queries.push(`
      SELECT
        pt.transaction_id as id,
        CASE
          WHEN pt.to_account_id = ${accountId} THEN 'DEPOSIT'
          ELSE 'WITHDRAWAL'
        END as category,
        CASE
          WHEN pt.to_account_id = ${accountId} THEN 'Deposit (Points Credited)'
          ELSE 'Withdrawal (Points Deducted)'
        END as title,
        pt.amount,
        CASE
          WHEN pt.to_account_id = ${accountId} THEN '+'
          ELSE '-'
        END as direction,
        CASE
          WHEN pt.to_account_id = ${accountId} THEN pt.to_balance_before
          ELSE pt.from_balance_before
        END as balanceBefore,
        CASE
          WHEN pt.to_account_id = ${accountId} THEN pt.to_balance_after
          ELSE pt.from_balance_after
        END as balanceAfter,
        pt.status,
        COALESCE(pt.reference, pt.transaction_type) as reference,
        COALESCE(pt.description, '') as description,
        from_u.username as fromUsername,
        to_u.username as toUsername,
        pt.created_at as createdAt
      FROM point_transactions pt
      JOIN point_accounts fa ON fa.id = pt.from_account_id
      JOIN point_accounts ta ON ta.id = pt.to_account_id
      JOIN users from_u ON from_u.id = fa.owner_id
      JOIN users to_u ON to_u.id = ta.owner_id
      WHERE 1=1 ${ptFilter}
    `);
  }

  // 2. Casino Bets
  if (type === 'ALL' || type === 'GAMES') {
    queries.push(`
      SELECT
        'CASINO-' || cb.id as id,
        'GAME' as category,
        CASE
          WHEN cb.game_type = 'SLOTS' THEN '777 Slots'
          WHEN cb.game_type = 'ROULETTE' THEN 'Vegas Roulette'
          WHEN cb.game_type = 'CRASH' THEN 'Crash Rocket'
          WHEN cb.game_type = 'BLACKJACK' THEN 'Blackjack 21'
          WHEN cb.game_type = 'DICE' THEN 'Crypto Dice'
          ELSE cb.game_type
        END as title,
        CASE
          WHEN cb.net_profit != 0 THEN ABS(cb.net_profit)
          ELSE cb.bet_amount
        END as amount,
        CASE
          WHEN cb.net_profit > 0 THEN '+'
          WHEN cb.net_profit < 0 THEN '-'
          ELSE '='
        END as direction,
        NULL as balanceBefore,
        NULL as balanceAfter,
        cb.result as status,
        cb.game_type as reference,
        'Wager: $' || cb.bet_amount || ' • Payout: $' || cb.payout || (CASE WHEN cb.multiplier > 0 THEN ' (' || cb.multiplier || 'x)' ELSE '' END) as description,
        NULL as fromUsername,
        NULL as toUsername,
        cb.created_at as createdAt
      FROM casino_bets cb
      WHERE cb.user_id = ${targetUserId}
    `);

    // 3. Lotto Bets
    queries.push(`
      SELECT
        'LOTTO-' || lb.id as id,
        'GAME' as category,
        'Lotto 99 (' || lb.market || ')' as title,
        CASE
          WHEN lb.net_profit != 0 THEN ABS(lb.net_profit)
          ELSE lb.stake
        END as amount,
        CASE
          WHEN lb.net_profit > 0 THEN '+'
          WHEN lb.net_profit < 0 THEN '-'
          ELSE '='
        END as direction,
        NULL as balanceBefore,
        NULL as balanceAfter,
        lb.status as status,
        'Round #' || lb.round_number as reference,
        'Stake: $' || lb.stake || ' • Odds: ' || lb.odds || 'x • Pick: ' || lb.selection as description,
        NULL as fromUsername,
        NULL as toUsername,
        lb.created_at as createdAt
      FROM lotto_bets lb
      WHERE lb.user_id = ${targetUserId}
    `);
  }

  let combinedQuery = queries.join(' UNION ALL ');

  // Wrap in subquery for global filtering and pagination
  let finalQuery = `SELECT * FROM (${combinedQuery}) as history WHERE 1=1`;
  const filterParams = [];

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    finalQuery += ` AND (id LIKE ? OR title LIKE ? OR reference LIKE ? OR description LIKE ? OR fromUsername LIKE ? OR toUsername LIKE ?)`;
    filterParams.push(s, s, s, s, s, s);
  }

  if (startDate) {
    finalQuery += ` AND createdAt >= ?`;
    filterParams.push(startDate);
  }

  if (endDate) {
    finalQuery += ` AND createdAt <= ?`;
    filterParams.push(endDate + ' 23:59:59');
  }

  const countQuery = `SELECT COUNT(*) as total FROM (${finalQuery})`;
  const totalCount = db.prepare(countQuery).get(...filterParams)?.total || 0;

  finalQuery += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
  filterParams.push(parseInt(limit, 10), parseInt(offset, 10));

  const historyItems = db.prepare(finalQuery).all(...filterParams);

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      adminUsername: user.adminUsername,
      adminName: user.adminName
    },
    summary: {
      currentBalance: account.balance,
      totalDeposits: depositsSummary.total,
      depositCount: depositsSummary.count,
      totalWithdrawals: withdrawalsSummary.total,
      withdrawalCount: withdrawalsSummary.count,
      totalGameWagered,
      totalGameWon,
      netGameProfit,
      totalEvents: totalCount
    },
    total: totalCount,
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    history: historyItems
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

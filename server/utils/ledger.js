const db = require('../db');
const { logAudit, sendNotification } = require('./logger');

/**
 * Generate Next Transaction ID (TXN-000001, TXN-000002, etc.)
 */
function generateTxnId() {
  const row = db.prepare("SELECT MAX(id) as max_id FROM point_transactions").get();
  const nextId = (row && row.max_id ? row.max_id : 0) + 1;
  return `TXN-${String(nextId).padStart(6, '0')}`;
}

/**
 * Ensures point_accounts record exists for a user/admin
 */
function getOrCreatePointAccount(ownerId, ownerType) {
  let account = db.prepare("SELECT * FROM point_accounts WHERE owner_id = ? AND owner_type = ?").get(ownerId, ownerType);
  if (!account) {
    const res = db.prepare(`
      INSERT INTO point_accounts (owner_id, owner_type, balance, total_received, total_distributed)
      VALUES (?, ?, 0, 0, 0)
    `).run(ownerId, ownerType);
    account = db.prepare("SELECT * FROM point_accounts WHERE id = ?").get(res.lastInsertRowid);
  }
  return account;
}

/**
 * Perform Atomic Double-Entry Ledger Transfer
 */
function transferPoints({
  req,
  fromOwnerId,
  fromOwnerType,
  toOwnerId,
  toOwnerType,
  amount,
  transactionType,
  reference = null,
  description = null,
  idempotencyKey = null
}) {
  // 1. Validation: Integer & > 0
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Invalid point amount. Amount must be a positive integer.');
  }

  // 2. Check Idempotency Key if provided
  if (idempotencyKey) {
    const existingTxn = db.prepare("SELECT * FROM point_transactions WHERE idempotency_key = ?").get(idempotencyKey);
    if (existingTxn) {
      return { duplicate: true, transaction: existingTxn };
    }
  }

  // Execute database transaction atomically using better-sqlite3
  const executeTransfer = db.transaction(() => {
    // Verify Sender status
    const senderUser = db.prepare("SELECT * FROM users WHERE id = ?").get(fromOwnerId);
    if (!senderUser || senderUser.status !== 'ACTIVE') {
      throw new Error(`Sender account (ID: ${fromOwnerId}) is not active or does not exist.`);
    }

    // Verify Receiver status
    const recipientUser = db.prepare("SELECT * FROM users WHERE id = ?").get(toOwnerId);
    if (!recipientUser || recipientUser.status !== 'ACTIVE') {
      throw new Error(`Recipient account (ID: ${toOwnerId}) is not active or does not exist.`);
    }

    // Get accounts
    const fromAccount = getOrCreatePointAccount(fromOwnerId, fromOwnerType);
    const toAccount = getOrCreatePointAccount(toOwnerId, toOwnerType);

    // Super Admin has infinite points - auto-replenish master balance if needed
    if (fromOwnerType === 'SUPER_ADMIN' && fromAccount.balance < amount) {
      const needed = amount - fromAccount.balance;
      db.prepare(`
        UPDATE point_accounts
        SET balance = balance + ?, total_received = total_received + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(needed, needed, fromAccount.id);
      fromAccount.balance += needed;
    }

    // Verify Sufficient Balance
    if (fromAccount.balance < amount) {
      throw new Error(`Insufficient point balance. Available: ${fromAccount.balance.toLocaleString()} points, Requested: ${amount.toLocaleString()} points.`);
    }

    const fromBalanceBefore = fromAccount.balance;
    const fromBalanceAfter = fromBalanceBefore - amount;

    const toBalanceBefore = toAccount.balance;
    const toBalanceAfter = toBalanceBefore + amount;

    // Update Sender Account
    db.prepare(`
      UPDATE point_accounts
      SET balance = ?, total_distributed = total_distributed + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(fromBalanceAfter, amount, fromAccount.id);

    // Update Recipient Account
    db.prepare(`
      UPDATE point_accounts
      SET balance = ?, total_received = total_received + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(toBalanceAfter, amount, toAccount.id);

    // Create Transaction Record
    const txnId = generateTxnId();
    const createdBy = req && req.user ? req.user.id : fromOwnerId;

    const insertTxn = db.prepare(`
      INSERT INTO point_transactions (
        transaction_id, from_account_id, to_account_id, amount,
        transaction_type, status, from_balance_before, from_balance_after,
        to_balance_before, to_balance_after, idempotency_key, reference,
        description, created_by
      ) VALUES (
        ?, ?, ?, ?,
        ?, 'COMPLETED', ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )
    `);

    insertTxn.run(
      txnId, fromAccount.id, toAccount.id, amount,
      transactionType, fromBalanceBefore, fromBalanceAfter,
      toBalanceBefore, toBalanceAfter, idempotencyKey, reference,
      description, createdBy
    );

    const transactionRecord = db.prepare("SELECT * FROM point_transactions WHERE transaction_id = ?").get(txnId);

    // Audit Logging
    logAudit(req, {
      action: `POINT_TRANSFER_${transactionType}`,
      targetType: toOwnerType,
      targetId: toOwnerId,
      targetName: recipientUser.username,
      oldValue: { fromBalance: fromBalanceBefore, toBalance: toBalanceBefore },
      newValue: { fromBalance: fromBalanceAfter, toBalance: toBalanceAfter, amount, txnId }
    });

    // Notify Recipient
    sendNotification(
      toOwnerId,
      'Points Received',
      `You received ${amount.toLocaleString()} points from ${senderUser.username} (${fromOwnerType}). Transaction ID: ${txnId}`,
      'SUCCESS'
    );

    return transactionRecord;
  });

  return { duplicate: false, transaction: executeTransfer() };
}

/**
 * Super Admin Mints New Points into Super Admin Master Pool
 */
function mintSuperAdminPoints(req, superAdminId, amount, reason = 'Super Admin Master Refill') {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Mint amount must be a positive integer.');
  }

  const executeMint = db.transaction(() => {
    const account = getOrCreatePointAccount(superAdminId, 'SUPER_ADMIN');
    const balanceBefore = account.balance;
    const balanceAfter = balanceBefore + amount;

    db.prepare(`
      UPDATE point_accounts
      SET balance = ?, total_received = total_received + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(balanceAfter, amount, account.id);

    const txnId = generateTxnId();
    db.prepare(`
      INSERT INTO point_transactions (
        transaction_id, from_account_id, to_account_id, amount,
        transaction_type, status, from_balance_before, from_balance_after,
        to_balance_before, to_balance_after, reference, description, created_by
      ) VALUES (
        ?, ?, ?, ?,
        'SUPER_ADMIN_MINT', 'COMPLETED', ?, ?,
        ?, ?, ?, ?, ?
      )
    `).run(
      txnId, account.id, account.id, amount,
      balanceBefore, balanceAfter, balanceBefore, balanceAfter,
      'MASTER_MINT', reason, superAdminId
    );

    logAudit(req, {
      action: 'SUPER_ADMIN_MINT_POINTS',
      targetType: 'SUPER_ADMIN',
      targetId: superAdminId,
      targetName: req.user ? req.user.username : 'superadmin',
      oldValue: { balance: balanceBefore },
      newValue: { balance: balanceAfter, mintedAmount: amount, txnId }
    });

    return { txnId, newBalance: balanceAfter };
  });

  return executeMint();
}

/**
 * Point Reversal Transaction
 * Creates an offsetting transaction that returns points to original sender
 */
function reverseTransaction(req, originalTxnId, reason) {
  const originalTxn = db.prepare("SELECT * FROM point_transactions WHERE transaction_id = ?").get(originalTxnId);
  if (!originalTxn) {
    throw new Error(`Transaction ${originalTxnId} not found.`);
  }

  if (originalTxn.status === 'REVERSED') {
    throw new Error(`Transaction ${originalTxnId} has already been reversed.`);
  }

  const executeReversal = db.transaction(() => {
    const fromAccount = db.prepare("SELECT * FROM point_accounts WHERE id = ?").get(originalTxn.from_account_id);
    const toAccount = db.prepare("SELECT * FROM point_accounts WHERE id = ?").get(originalTxn.to_account_id);

    // Current receiver of the original txn must return the points
    if (toAccount.balance < originalTxn.amount) {
      throw new Error(`Cannot reverse transaction: Recipient account (ID: ${toAccount.owner_id}) currently has insufficient balance (${toAccount.balance}) to perform a reversal of ${originalTxn.amount} points.`);
    }

    const reversalType = originalTxn.transaction_type === 'USER_ALLOCATION' ? 'USER_REVERSAL' : 'ADMIN_REVERSAL';

    const toBalBefore = toAccount.balance;
    const toBalAfter = toBalBefore - originalTxn.amount;

    const fromBalBefore = fromAccount.balance;
    const fromBalAfter = fromBalBefore + originalTxn.amount;

    // Deduct points from original recipient
    db.prepare(`
      UPDATE point_accounts
      SET balance = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(toBalAfter, toAccount.id);

    // Refund points back to original sender
    db.prepare(`
      UPDATE point_accounts
      SET balance = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(fromBalAfter, fromAccount.id);

    // Mark original transaction status as REVERSED
    db.prepare("UPDATE point_transactions SET status = 'REVERSED' WHERE id = ?").run(originalTxn.id);

    // Create Reversal Transaction
    const reversalTxnId = generateTxnId();
    db.prepare(`
      INSERT INTO point_transactions (
        transaction_id, from_account_id, to_account_id, amount,
        transaction_type, status, from_balance_before, from_balance_after,
        to_balance_before, to_balance_after, reference, description, created_by
      ) VALUES (
        ?, ?, ?, ?,
        ?, 'COMPLETED', ?, ?,
        ?, ?, ?, ?, ?
      )
    `).run(
      reversalTxnId, toAccount.id, fromAccount.id, originalTxn.amount,
      reversalType, toBalBefore, toBalAfter,
      fromBalBefore, fromBalAfter, originalTxn.transaction_id,
      `Reversal of ${originalTxn.transaction_id}. Reason: ${reason}`, req.user.id
    );

    logAudit(req, {
      action: 'TRANSACTION_REVERSED',
      targetType: 'TRANSACTION',
      targetId: originalTxn.id,
      targetName: originalTxn.transaction_id,
      oldValue: { status: 'COMPLETED' },
      newValue: { status: 'REVERSED', reversalTxnId, reason }
    });

    sendNotification(
      fromAccount.owner_id,
      'Transaction Reversal Credit',
      `Points (${originalTxn.amount}) refunded from transaction reversal ${originalTxn.transaction_id}.`,
      'INFO'
    );

    return { reversalTxnId, originalTxnId };
  });

  return executeReversal();
}

module.exports = {
  getOrCreatePointAccount,
  transferPoints,
  mintSuperAdminPoints,
  reverseTransaction
};

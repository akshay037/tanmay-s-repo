const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for high concurrency performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'ADMIN', 'USER')),
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
      must_change_password INTEGER DEFAULT 1,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TEXT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login_at TEXT NULL
    );
  `);

  // Admin profiles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NULL,
      phone TEXT NULL,
      notes TEXT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // User profiles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      admin_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      email TEXT NULL,
      phone TEXT NULL,
      notes TEXT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Point accounts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS point_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER UNIQUE NOT NULL,
      owner_type TEXT NOT NULL CHECK(owner_type IN ('SUPER_ADMIN', 'ADMIN', 'USER')),
      balance INTEGER NOT NULL DEFAULT 0 CHECK(balance >= 0),
      total_received INTEGER NOT NULL DEFAULT 0,
      total_distributed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Point transactions ledger table
  db.exec(`
    CREATE TABLE IF NOT EXISTS point_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT UNIQUE NOT NULL,
      from_account_id INTEGER NOT NULL REFERENCES point_accounts(id),
      to_account_id INTEGER NOT NULL REFERENCES point_accounts(id),
      amount INTEGER NOT NULL CHECK(amount > 0),
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('SUPER_ADMIN_MINT', 'ADMIN_ALLOCATION', 'USER_ALLOCATION', 'ADMIN_REVERSAL', 'USER_REVERSAL', 'USER_WITHDRAWAL', 'ADMIN_WITHDRAWAL', 'USER_TRANSFER')),
      status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED', 'FAILED', 'REVERSED')),
      from_balance_before INTEGER NOT NULL,
      from_balance_after INTEGER NOT NULL,
      to_balance_before INTEGER NOT NULL,
      to_balance_after INTEGER NOT NULL,
      idempotency_key TEXT UNIQUE NULL,
      reference TEXT NULL,
      description TEXT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrate point_transactions if USER_TRANSFER is not in existing CHECK constraint
  try {
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='point_transactions'").get();
    if (tableInfo && tableInfo.sql && !tableInfo.sql.includes('USER_TRANSFER')) {
      db.pragma('foreign_keys = OFF');
      db.transaction(() => {
        db.exec(`
          CREATE TABLE point_transactions_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id TEXT UNIQUE NOT NULL,
            from_account_id INTEGER NOT NULL REFERENCES point_accounts(id),
            to_account_id INTEGER NOT NULL REFERENCES point_accounts(id),
            amount INTEGER NOT NULL CHECK(amount > 0),
            transaction_type TEXT NOT NULL CHECK(transaction_type IN ('SUPER_ADMIN_MINT', 'ADMIN_ALLOCATION', 'USER_ALLOCATION', 'ADMIN_REVERSAL', 'USER_REVERSAL', 'USER_WITHDRAWAL', 'ADMIN_WITHDRAWAL', 'USER_TRANSFER')),
            status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED', 'FAILED', 'REVERSED')),
            from_balance_before INTEGER NOT NULL,
            from_balance_after INTEGER NOT NULL,
            to_balance_before INTEGER NOT NULL,
            to_balance_after INTEGER NOT NULL,
            idempotency_key TEXT UNIQUE NULL,
            reference TEXT NULL,
            description TEXT NULL,
            created_by INTEGER NOT NULL REFERENCES users(id),
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
          INSERT INTO point_transactions_new SELECT * FROM point_transactions;
          DROP TABLE point_transactions;
          ALTER TABLE point_transactions_new RENAME TO point_transactions;
          CREATE INDEX IF NOT EXISTS idx_point_txn_id ON point_transactions(transaction_id);
          CREATE INDEX IF NOT EXISTS idx_point_txn_from ON point_transactions(from_account_id);
          CREATE INDEX IF NOT EXISTS idx_point_txn_to ON point_transactions(to_account_id);
          CREATE INDEX IF NOT EXISTS idx_point_txn_created_at ON point_transactions(created_at);
        `);
      })();
      db.pragma('foreign_keys = ON');
    }
  } catch (migErr) {
    console.error('Migration error on point_transactions table:', migErr);
  }

  // User P2P Transfers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_code TEXT UNIQUE NOT NULL,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      receiver_id INTEGER NOT NULL REFERENCES users(id),
      amount INTEGER NOT NULL CHECK(amount > 0),
      note TEXT NULL,
      transaction_id TEXT NOT NULL REFERENCES point_transactions(transaction_id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_user_transfers_sender ON user_transfers(sender_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_user_transfers_receiver ON user_transfers(receiver_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_user_transfers_code ON user_transfers(transfer_code);
  `);


  // Point requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS point_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_code TEXT UNIQUE NOT NULL,
      admin_id INTEGER NOT NULL REFERENCES users(id),
      requested_amount INTEGER NOT NULL CHECK(requested_amount > 0),
      approved_amount INTEGER NULL DEFAULT 0,
      reason TEXT NOT NULL,
      note TEXT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED')),
      reviewed_by INTEGER NULL REFERENCES users(id),
      reviewer_comment TEXT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TEXT NULL
    );
  `);

  // User withdrawal requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_withdrawal_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_code TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
      admin_id INTEGER NOT NULL REFERENCES users(id),
      amount INTEGER NOT NULL CHECK(amount > 0),
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
      user_note TEXT NULL,
      admin_note TEXT NULL,
      reviewed_by INTEGER NULL REFERENCES users(id),
      reviewed_at TEXT NULL,
      transaction_id TEXT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Audit logs table (Append-only)
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER NULL,
      actor_username TEXT NULL,
      actor_role TEXT NULL,
      action TEXT NOT NULL,
      target_type TEXT NULL,
      target_id INTEGER NULL,
      target_name TEXT NULL,
      old_value TEXT NULL,
      new_value TEXT NULL,
      ip_address TEXT NULL,
      user_agent TEXT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Admin user transfers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_user_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      previous_admin_id INTEGER NOT NULL REFERENCES users(id),
      new_admin_id INTEGER NOT NULL REFERENCES users(id),
      reason TEXT NULL,
      transferred_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'INFO' CHECK(type IN ('INFO', 'SUCCESS', 'WARNING', 'ALERT')),
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS casino_bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      game_type TEXT NOT NULL,
      bet_amount INTEGER NOT NULL CHECK(bet_amount > 0),
      multiplier REAL NOT NULL DEFAULT 0,
      payout INTEGER NOT NULL DEFAULT 0,
      net_profit INTEGER NOT NULL DEFAULT 0,
      result TEXT NOT NULL CHECK(result IN ('WIN', 'LOSS', 'PUSH')),
      details TEXT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lotto_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_number TEXT UNIQUE NOT NULL,
      duration_seconds INTEGER DEFAULT 60,
      start_time INTEGER NOT NULL,
      bet_end_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('OPEN', 'CLOSED', 'DRAWING', 'COMPLETED')),
      drawn_numbers TEXT NULL,
      top1 INTEGER NULL,
      top2 INTEGER NULL,
      sum_top1_2 INTEGER NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lotto_bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      round_id INTEGER NOT NULL REFERENCES lotto_rounds(id),
      round_number TEXT NOT NULL,
      market TEXT NOT NULL,
      selection TEXT NOT NULL,
      stake INTEGER NOT NULL CHECK(stake > 0),
      odds REAL NOT NULL,
      potential_payout REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'WON', 'LOST', 'REFUNDED')),
      payout INTEGER NOT NULL DEFAULT 0,
      net_profit INTEGER NOT NULL DEFAULT 0,
      idempotency_key TEXT UNIQUE NULL,
      settled_at TEXT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Indexes for optimized query speeds across large transaction histories
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_lotto_rounds_status ON lotto_rounds(status);
    CREATE INDEX IF NOT EXISTS idx_lotto_rounds_round_num ON lotto_rounds(round_number);
    CREATE INDEX IF NOT EXISTS idx_lotto_bets_user ON lotto_bets(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_lotto_bets_round ON lotto_bets(round_id, status);
    CREATE INDEX IF NOT EXISTS idx_casino_bets_user ON casino_bets(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_admin_id ON user_profiles(admin_id);
    CREATE INDEX IF NOT EXISTS idx_point_accounts_owner ON point_accounts(owner_id, owner_type);
    CREATE INDEX IF NOT EXISTS idx_point_txn_id ON point_transactions(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_point_txn_from ON point_transactions(from_account_id);
    CREATE INDEX IF NOT EXISTS idx_point_txn_to ON point_transactions(to_account_id);
    CREATE INDEX IF NOT EXISTS idx_point_txn_created_at ON point_transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_point_requests_admin ON point_requests(admin_id);
    CREATE INDEX IF NOT EXISTS idx_point_requests_status ON point_requests(status);
    CREATE INDEX IF NOT EXISTS idx_user_withdrawal_user ON user_withdrawal_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_withdrawal_admin ON user_withdrawal_requests(admin_id);
    CREATE INDEX IF NOT EXISTS idx_user_withdrawal_status ON user_withdrawal_requests(status);
    CREATE INDEX IF NOT EXISTS idx_user_withdrawal_code ON user_withdrawal_requests(request_code);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
  `);

  seedDefaultSuperAdmin();
}

function seedDefaultSuperAdmin() {
  const existingSuperAdmin = db.prepare("SELECT * FROM users WHERE role = 'SUPER_ADMIN'").get();
  if (!existingSuperAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync('SuperAdmin@123', salt);

    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, role, status, must_change_password)
      VALUES (?, ?, 'SUPER_ADMIN', 'ACTIVE', 0)
    `);
    const result = insertUser.run('superadmin', password_hash);
    const superAdminId = result.lastInsertRowid;

    // Create admin profile for superadmin
    db.prepare(`
      INSERT INTO admin_profiles (user_id, name, email, phone, notes)
      VALUES (?, 'Master Super Admin', 'superadmin@system.local', '1000000000', 'Default Master Account')
    `).run(superAdminId);

    // Create point account for Super Admin with 1,000,000 initial points
    const insertAccount = db.prepare(`
      INSERT INTO point_accounts (owner_id, owner_type, balance, total_received, total_distributed)
      VALUES (?, 'SUPER_ADMIN', 1000000, 1000000, 0)
    `);
    const accountResult = insertAccount.run(superAdminId);
    const superAdminAccountId = accountResult.lastInsertRowid;

    // Initial Minting Transaction Record
    db.prepare(`
      INSERT INTO point_transactions (
        transaction_id, from_account_id, to_account_id, amount,
        transaction_type, status, from_balance_before, from_balance_after,
        to_balance_before, to_balance_after, reference, description, created_by
      ) VALUES (
        'TXN-000001', ?, ?, 1000000,
        'SUPER_ADMIN_MINT', 'COMPLETED', 0, 1000000, 0, 1000000,
        'SYSTEM_INIT', 'Initial Super Admin Master Point Supply', ?
      )
    `).run(superAdminAccountId, superAdminAccountId, superAdminId);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (actor_id, actor_username, actor_role, action, target_type, target_id, target_name, new_value, ip_address)
      VALUES (?, 'superadmin', 'SUPER_ADMIN', 'SYSTEM_INITIALIZATION', 'USER', ?, 'superadmin', 'Super Admin Account Created with 1,000,000 points', '127.0.0.1')
    `).run(superAdminId, superAdminId);

    console.log('Seed: Created default Super Admin user (superadmin / SuperAdmin@123) with 1,000,000 points balance.');
  }
}

initDb();

module.exports = db;

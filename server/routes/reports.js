const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/dashboard', (req, res) => {
  const role = req.user.role;

  if (role === 'SUPER_ADMIN') {
    // Super Admin Stats
    const totalAdmins = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN'").get().count;
    const activeAdmins = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE'").get().count;
    const inactiveAdmins = totalAdmins - activeAdmins;

    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'USER'").get().count;
    const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'USER' AND status = 'ACTIVE'").get().count;

    const superAdminAccount = db.prepare("SELECT balance, total_received, total_distributed FROM point_accounts WHERE owner_id = ? AND owner_type = 'SUPER_ADMIN'").get(req.user.id);
    const superAdminBalance = superAdminAccount ? superAdminAccount.balance : 0;

    const totalAllocatedToAdmins = db.prepare("SELECT COALESCE(SUM(total_received), 0) as total FROM point_accounts WHERE owner_type = 'ADMIN'").get().total;
    const totalAdminRemainingBalance = db.prepare("SELECT COALESCE(SUM(balance), 0) as total FROM point_accounts WHERE owner_type = 'ADMIN'").get().total;

    const totalDistributedToUsers = db.prepare("SELECT COALESCE(SUM(total_received), 0) as total FROM point_accounts WHERE owner_type = 'USER'").get().total;
    const totalUserBalance = db.prepare("SELECT COALESCE(SUM(balance), 0) as total FROM point_accounts WHERE owner_type = 'USER'").get().total;

    const pendingRequestsCount = db.prepare("SELECT COUNT(*) as count FROM point_requests WHERE status = 'PENDING'").get().count;

    // Charts Data: Points per Admin
    const adminPointBreakdown = db.prepare(`
      SELECT
        u.id as adminId,
        u.username,
        ap.name,
        COALESCE(pa.balance, 0) as availableBalance,
        COALESCE(pa.total_received, 0) as totalReceived,
        COALESCE(pa.total_distributed, 0) as totalDistributed,
        (
          SELECT COUNT(*) FROM user_profiles up WHERE up.admin_id = u.id
        ) as userCount
      FROM users u
      JOIN admin_profiles ap ON ap.user_id = u.id
      LEFT JOIN point_accounts pa ON pa.owner_id = u.id AND pa.owner_type = 'ADMIN'
      WHERE u.role = 'ADMIN'
      ORDER BY totalReceived DESC
    `).all();

    // Chart: Daily transactions over last 14 days
    const dailyTxns = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as volume
      FROM point_transactions
      WHERE created_at >= DATE('now', '-14 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all();

    return res.json({
      role,
      summary: {
        totalAdmins,
        activeAdmins,
        inactiveAdmins,
        totalUsers,
        activeUsers,
        superAdminBalance,
        totalAllocatedToAdmins,
        totalAdminRemainingBalance,
        totalDistributedToUsers,
        totalUserBalance,
        pendingRequestsCount
      },
      adminPointBreakdown,
      dailyTxns
    });
  }

  if (role === 'ADMIN') {
    // Admin Stats
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM user_profiles WHERE admin_id = ?").get(req.user.id).count;
    const activeUsers = db.prepare(`
      SELECT COUNT(*) as count FROM user_profiles up
      JOIN users u ON u.id = up.user_id
      WHERE up.admin_id = ? AND u.status = 'ACTIVE'
    `).get(req.user.id).count;

    const adminAccount = db.prepare("SELECT balance, total_received, total_distributed FROM point_accounts WHERE owner_id = ? AND owner_type = 'ADMIN'").get(req.user.id);
    const availablePoints = adminAccount ? adminAccount.balance : 0;
    const totalReceived = adminAccount ? adminAccount.total_received : 0;
    const totalDistributed = adminAccount ? adminAccount.total_distributed : 0;

    const pendingRequestsCount = db.prepare("SELECT COUNT(*) as count FROM point_requests WHERE admin_id = ? AND status = 'PENDING'").get(req.user.id).count;

    // Charts Data: User balances under this admin
    const userPointBreakdown = db.prepare(`
      SELECT
        u.id as userId,
        u.username,
        up.name,
        COALESCE(pa.balance, 0) as balance,
        COALESCE(pa.total_received, 0) as totalReceived
      FROM user_profiles up
      JOIN users u ON u.id = up.user_id
      LEFT JOIN point_accounts pa ON pa.owner_id = u.id AND pa.owner_type = 'USER'
      WHERE up.admin_id = ?
      ORDER BY totalReceived DESC
    `).all(req.user.id);

    // Chart: Admin's distributions over last 14 days
    const dailyTxns = db.prepare(`
      SELECT
        DATE(pt.created_at) as date,
        COUNT(*) as count,
        COALESCE(SUM(pt.amount), 0) as volume
      FROM point_transactions pt
      JOIN point_accounts fa ON fa.id = pt.from_account_id
      WHERE fa.owner_id = ? AND pt.created_at >= DATE('now', '-14 days')
      GROUP BY DATE(pt.created_at)
      ORDER BY date ASC
    `).all(req.user.id);

    return res.json({
      role,
      summary: {
        totalUsers,
        activeUsers,
        availablePoints,
        totalReceived,
        totalDistributed,
        pendingRequestsCount
      },
      userPointBreakdown,
      dailyTxns
    });
  }

  if (role === 'USER') {
    // User Stats
    const userAccount = db.prepare("SELECT balance, total_received FROM point_accounts WHERE owner_id = ?").get(req.user.id);

    const profile = db.prepare("SELECT admin_id FROM user_profiles WHERE user_id = ?").get(req.user.id);
    let ownerAdmin = null;

    if (profile && profile.admin_id) {
      ownerAdmin = db.prepare(`
        SELECT u.username, ap.name, ap.email
        FROM users u
        JOIN admin_profiles ap ON ap.user_id = u.id
        WHERE u.id = ?
      `).get(profile.admin_id);
    }

    const recentTxns = db.prepare(`
      SELECT
        pt.transaction_id as transactionId,
        pt.amount,
        pt.created_at as createdAt,
        pt.description,
        from_u.username as fromUsername,
        COALESCE(from_ap.name, from_u.username) as fromName
      FROM point_transactions pt
      JOIN point_accounts ta ON ta.id = pt.to_account_id
      JOIN point_accounts fa ON fa.id = pt.from_account_id
      JOIN users from_u ON from_u.id = fa.owner_id
      LEFT JOIN admin_profiles from_ap ON from_ap.user_id = from_u.id
      WHERE ta.owner_id = ?
      ORDER BY pt.created_at DESC
      LIMIT 10
    `).all(req.user.id);

    return res.json({
      role,
      summary: {
        balance: userAccount ? userAccount.balance : 0,
        totalReceived: userAccount ? userAccount.total_received : 0,
        adminName: ownerAdmin ? ownerAdmin.name : 'N/A',
        adminUsername: ownerAdmin ? ownerAdmin.username : 'N/A'
      },
      recentTxns
    });
  }
});

module.exports = router;

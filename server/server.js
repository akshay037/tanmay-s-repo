const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env') });

const db = require('./db');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import Route Handlers
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admins');
const userRoutes = require('./routes/users');
const pointRoutes = require('./routes/points');
const transactionRoutes = require('./routes/transactions');
const reportRoutes = require('./routes/reports');
const auditRoutes = require('./routes/audit');
const notificationRoutes = require('./routes/notifications');
const casinoRoutes = require('./routes/casino');
const lottoRoutes = require('./routes/lotto');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger for all incoming API calls
app.use('/api', (req, res, next) => {
  console.log(`[API REQUEST] ${req.method} ${req.originalUrl}`);
  next();
});

// Apply Rate Limiter to all API routes
app.use('/api', apiLimiter);

// Health check endpoint (accessible without token)
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', message: 'Hierarchical Point Management API is running cleanly.' });
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/points', pointRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/casino', casinoRoutes);
app.use('/api/lotto', lottoRoutes);

// Direct explicit endpoints at top level for transfer and withdrawal
const { authenticateToken, requireRole } = require('./middleware/auth');
if (pointRoutes.handleVerifyRecipient) {
  app.post('/api/points/verify-recipient', authenticateToken, requireRole('USER', 'ADMIN', 'SUPER_ADMIN'), pointRoutes.handleVerifyRecipient);
  app.post('/api/verify-recipient', authenticateToken, requireRole('USER', 'ADMIN', 'SUPER_ADMIN'), pointRoutes.handleVerifyRecipient);
}
if (pointRoutes.handleUserTransfer) {
  app.post('/api/points/user-transfer', authenticateToken, requireRole('USER', 'ADMIN', 'SUPER_ADMIN'), pointRoutes.handleUserTransfer);
  app.post('/api/user-transfer', authenticateToken, requireRole('USER', 'ADMIN', 'SUPER_ADMIN'), pointRoutes.handleUserTransfer);
}
if (pointRoutes.handleGetMyTransfers) {
  app.get('/api/points/my-transfers', authenticateToken, requireRole('USER', 'ADMIN', 'SUPER_ADMIN'), pointRoutes.handleGetMyTransfers);
  app.get('/api/my-transfers', authenticateToken, requireRole('USER', 'ADMIN', 'SUPER_ADMIN'), pointRoutes.handleGetMyTransfers);
}
if (pointRoutes.handleUserWithdrawal) {
  app.post('/api/points/user-withdrawal-request', authenticateToken, pointRoutes.handleUserWithdrawal);
  app.post('/api/user-withdrawal-request', authenticateToken, pointRoutes.handleUserWithdrawal);
}

// Serve frontend static assets in production build
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

// Catch-all route for Single Page Application
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.warn(`[404 NOT FOUND] ${req.method} ${req.originalUrl}`);
    return res.status(404).json({
      error: 'API endpoint not found',
      requestedUrl: req.originalUrl,
      method: req.method,
      hint: 'If you just modified backend routes, please restart your server terminal (Ctrl+C, then restart).'
    });
  }
  const indexPath = path.join(clientBuildPath, 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('API Server is Running. Frontend not yet compiled into client/dist.');
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected internal server error occurred.'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  Hierarchical Point Management System Backend Server `);
  console.log(`  Listening on port http://0.0.0.0:${PORT}`);
  console.log(`=======================================================`);
});

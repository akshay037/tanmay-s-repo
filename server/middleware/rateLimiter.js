const rateLimit = require('express-rate-limit');

// Rate limiter for authentication endpoints (login attempts)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per windowMs
  message: {
    error: 'Too many failed login attempts from this IP address. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // limit each IP to 300 requests per minute
  message: {
    error: 'Rate limit exceeded. Too many requests. Please slow down.'
  }
});

module.exports = {
  loginLimiter,
  apiLimiter
};

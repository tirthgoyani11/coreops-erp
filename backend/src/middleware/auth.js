/**
 * Auth Middleware (Compatibility Shim)
 * Re-exports verifyToken's protect and authorize for routes
 * that import from '../middleware/auth'.
 */
const protect = require('./verifyToken');
const authorize = require('./authorize');

module.exports = { protect, authorize };

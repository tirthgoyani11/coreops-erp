const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getMe,
    seedAdmin,
    forgotPassword,
    validateResetToken,
    resetPassword,
    validateInvite,
    registerWithInvite,
    refreshToken,
    logout,
} = require('../controllers/authController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const { authLimiter, seedLimiter } = require('../middleware/rateLimiter');
const { authValidation } = require('../middleware/validation');

// Public routes with rate limiting and validation
router.post('/login', authLimiter, authValidation.login, login);
router.post('/seed', seedLimiter, seedAdmin);

// Password reset routes (public with rate limiting)
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/validate-reset-token', authLimiter, validateResetToken);
router.post('/reset-password', authLimiter, resetPassword);

// Invitation-based registration (public with rate limiting)
router.get('/validate-invite/:token', authLimiter, validateInvite);
router.post('/register-invite', authLimiter, registerWithInvite);

// Token management routes (public, cookie-based)
router.post('/refresh', authLimiter, refreshToken);
router.post('/logout', logout);

// Protected routes with validation
router.post('/register', verifyToken, authorize('SUPER_ADMIN', 'ADMIN'), authValidation.register, register);
router.get('/me', verifyToken, getMe);

module.exports = router;

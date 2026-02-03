const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getMe,
    seedAdmin,
} = require('../controllers/authController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const { authLimiter, seedLimiter } = require('../middleware/rateLimiter');
const { authValidation } = require('../middleware/validation');

// Public routes with rate limiting and validation
router.post('/login', authLimiter, authValidation.login, login);
router.post('/seed', seedLimiter, seedAdmin);

// Protected routes with validation
router.post('/register', verifyToken, authorize('SUPER_ADMIN'), authValidation.register, register);
router.get('/me', verifyToken, getMe);

module.exports = router;

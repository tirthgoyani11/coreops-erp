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

// Public routes
router.post('/login', login);
router.post('/seed', seedAdmin);

// Protected routes
router.post('/register', verifyToken, authorize('SUPER_ADMIN'), register);
router.get('/me', verifyToken, getMe);

module.exports = router;

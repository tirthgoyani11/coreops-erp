const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

// Make sure user is authenticated
router.use(verifyToken);

// ==========================================
// PERSONAL DASHBOARD & ALERTS (All Users)
// ==========================================
router.put('/me/dashboard', userController.updateDashboardPreferences);
router.get('/me/alerts', userController.getAlerts);
router.post('/me/alerts', userController.createAlert);
router.put('/me/alerts/:id', userController.updateAlert);
router.delete('/me/alerts/:id', userController.deleteAlert);

// ==========================================
// USER MANAGEMENT (Admins / Managers only)
// ==========================================
router.use(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'));

router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);

module.exports = router;

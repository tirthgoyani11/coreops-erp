const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

/**
 * Notification Routes
 * 
 * All routes require authentication.
 */

// User routes
router.get('/', verifyToken, notificationController.getNotifications);
router.get('/unread-count', verifyToken, notificationController.getUnreadCount);
router.put('/read-all', verifyToken, notificationController.markAllAsRead);
router.put('/:id/read', verifyToken, notificationController.markAsRead);
router.delete('/:id', verifyToken, notificationController.deleteNotification);

// Admin routes
router.post('/', verifyToken, authorize('SUPER_ADMIN', 'MANAGER'), notificationController.createNotification);
router.post('/broadcast', verifyToken, authorize('SUPER_ADMIN'), notificationController.broadcastNotification);

module.exports = router;

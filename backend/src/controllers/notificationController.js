const Notification = require('../models/Notification');
const { notifyUser, getIO } = require('../config/socketServer');

/**
 * Notification Controller
 * 
 * Handles user notifications for approvals, alerts, and system messages.
 */

/**
 * Get notifications for current user
 * GET /api/notifications
 */
exports.getNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false, type } = req.query;

        const query = { recipient: req.user._id };

        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        if (type) {
            query.type = type;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Notification.countDocuments(query),
            Notification.countDocuments({ recipient: req.user._id, isRead: false }),
        ]);

        res.json({
            success: true,
            data: notifications,
            unreadCount,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message,
        });
    }
};

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found',
            });
        }

        res.json({
            success: true,
            data: notification,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: error.message,
        });
    }
};

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
exports.markAllAsRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        res.json({
            success: true,
            message: `Marked ${result.modifiedCount} notifications as read`,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to mark all as read',
            error: error.message,
        });
    }
};

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
exports.deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.user._id,
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found',
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification',
            error: error.message,
        });
    }
};

/**
 * Get unread count only
 * GET /api/notifications/unread-count
 */
exports.getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            recipient: req.user._id,
            isRead: false,
        });

        res.json({
            success: true,
            data: { unreadCount: count },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get unread count',
            error: error.message,
        });
    }
};

/**
 * Admin: Create notification for a user
 * POST /api/notifications (admin only)
 */
exports.createNotification = async (req, res) => {
    try {
        const { recipient, type, title, message, priority, metadata, actionUrl } = req.body;

        const notification = await Notification.create({
            recipient,
            type,
            title,
            message,
            priority: priority || 'low',
            metadata,
            actionUrl,
        });

        // Real-time notification
        notifyUser(recipient, notification);

        res.status(201).json({
            success: true,
            data: notification,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create notification',
            error: error.message,
        });
    }
};

/**
 * Admin: Send notification to multiple users
 * POST /api/notifications/broadcast (admin only)
 */
exports.broadcastNotification = async (req, res) => {
    try {
        const { recipients, type, title, message, priority } = req.body;

        if (!recipients || !Array.isArray(recipients)) {
            return res.status(400).json({
                success: false,
                message: 'Recipients array is required',
            });
        }

        const notifications = recipients.map(recipient => ({
            recipient,
            type,
            title,
            message,
            priority: priority || 'low',
        }));

        const result = await Notification.insertMany(notifications);

        // Real-time broadcast (iterate or use room if available)
        result.forEach(note => {
            notifyUser(note.recipient, note);
        });

        res.status(201).json({
            success: true,
            message: `Sent ${result.length} notifications`,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to broadcast notification',
            error: error.message,
        });
    }
};

const prisma = require('../config/prisma');
const { notifyUser, getIO } = require('../config/socketServer');

/**
 * Notification Controller (Prisma)
 */

// GET /api/notifications
exports.getNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false, type } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = { recipientId: req.user.id };

        if (unreadOnly === 'true') where.isRead = false;
        if (type) where.type = type;

        const [notifications, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit),
            }),
            prisma.notification.count({ where }),
            prisma.notification.count({ where: { recipientId: req.user.id, isRead: false } }),
        ]);

        res.json({
            success: true,
            data: notifications,
            unreadCount,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: error.message });
    }
};

// PUT /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
    try {
        const notification = await prisma.notification.findFirst({
            where: { id: req.params.id, recipientId: req.user.id },
        });

        if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });

        const updated = await prisma.notification.update({
            where: { id: req.params.id },
            data: { isRead: true, readAt: new Date() },
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to mark notification as read', error: error.message });
    }
};

// PUT /api/notifications/read-all
exports.markAllAsRead = async (req, res) => {
    try {
        const result = await prisma.notification.updateMany({
            where: { recipientId: req.user.id, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });

        res.json({ success: true, message: `Marked ${result.count} notifications as read` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to mark all as read', error: error.message });
    }
};

// DELETE /api/notifications/:id
exports.deleteNotification = async (req, res) => {
    try {
        const notification = await prisma.notification.findFirst({
            where: { id: req.params.id, recipientId: req.user.id },
        });

        if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });

        await prisma.notification.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete notification', error: error.message });
    }
};

// GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res) => {
    try {
        const count = await prisma.notification.count({
            where: { recipientId: req.user.id, isRead: false },
        });

        res.json({ success: true, data: { unreadCount: count } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get unread count', error: error.message });
    }
};

// POST /api/notifications (admin only)
exports.createNotification = async (req, res) => {
    try {
        const { recipient, type, title, message, priority, metadata, actionUrl } = req.body;

        const notification = await prisma.notification.create({
            data: {
                recipientId: recipient,
                type,
                title,
                message,
                priority: priority || 'LOW',
                metadata: metadata || undefined,
                actionUrl,
            },
        });

        notifyUser(recipient, notification);
        res.status(201).json({ success: true, data: notification });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create notification', error: error.message });
    }
};

// POST /api/notifications/broadcast (admin only)
exports.broadcastNotification = async (req, res) => {
    try {
        const { recipients, type, title, message, priority } = req.body;

        if (!recipients || !Array.isArray(recipients)) {
            return res.status(400).json({ success: false, message: 'Recipients array is required' });
        }

        const notifications = [];
        for (const recipientId of recipients) {
            const n = await prisma.notification.create({
                data: { recipientId, type, title, message, priority: priority || 'LOW' },
            });
            notifications.push(n);
            notifyUser(recipientId, n);
        }

        res.status(201).json({ success: true, message: `Sent ${notifications.length} notifications` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to broadcast notification', error: error.message });
    }
};

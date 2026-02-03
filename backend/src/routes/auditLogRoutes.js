const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

/**
 * Audit Log Routes
 * 
 * View system audit logs for security and compliance
 */

// Get audit logs with pagination and filters
router.get('/', verifyToken, authorize('SUPER_ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            action,
            resourceType,
            userId,
            startDate,
            endDate,
            status,
        } = req.query;

        const query = {};

        // Filter by action
        if (action) {
            query.action = { $regex: action, $options: 'i' };
        }

        // Filter by resource type
        if (resourceType) {
            query.resourceType = resourceType;
        }

        // Filter by user
        if (userId) {
            query.user = userId;
        }

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Date range filter
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .populate('user', 'name email role')
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            AuditLog.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs',
            error: error.message,
        });
    }
});

// Get audit log by ID
router.get('/:id', verifyToken, authorize('SUPER_ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const log = await AuditLog.findById(req.params.id)
            .populate('user', 'name email role')
            .lean();

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Audit log not found',
            });
        }

        res.json({
            success: true,
            data: log,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit log',
            error: error.message,
        });
    }
});

// Get audit log statistics
router.get('/stats/summary', verifyToken, authorize('SUPER_ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const [byAction, byResource, byStatus, timeline] = await Promise.all([
            // Group by action
            AuditLog.aggregate([
                { $match: { timestamp: { $gte: startDate } } },
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
            // Group by resource type
            AuditLog.aggregate([
                { $match: { timestamp: { $gte: startDate } } },
                { $group: { _id: '$resourceType', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            // Group by status
            AuditLog.aggregate([
                { $match: { timestamp: { $gte: startDate } } },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            // Timeline by day
            AuditLog.aggregate([
                { $match: { timestamp: { $gte: startDate } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
        ]);

        res.json({
            success: true,
            data: {
                byAction,
                byResource,
                byStatus,
                timeline,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit stats',
            error: error.message,
        });
    }
});

module.exports = router;

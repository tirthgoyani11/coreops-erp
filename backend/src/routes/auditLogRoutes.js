const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

/**
 * Audit Log Routes (Prisma/PostgreSQL)
 *
 * Migrated from Mongoose → Prisma to fix 500 timeout errors.
 * View system audit logs for security and compliance.
 */

// Get audit logs with pagination and filters
router.get('/', verifyToken, authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
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

        const where = {};

        // Filter by action
        if (action) {
            where.action = action;
        }

        // Filter by resource type
        if (resourceType) {
            where.resourceType = resourceType;
        }

        // Filter by user
        if (userId) {
            where.userId = userId;
        }

        // Filter by status
        if (status) {
            where.status = status;
        }

        // Date range filter
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp.gte = new Date(startDate);
            if (endDate) where.timestamp.lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, name: true, email: true, role: true },
                    },
                },
                orderBy: { timestamp: 'desc' },
                skip,
                take: parseInt(limit),
            }),
            prisma.auditLog.count({ where }),
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
router.get('/:id', verifyToken, authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const log = await prisma.auditLog.findUnique({
            where: { id: req.params.id },
            include: {
                user: {
                    select: { id: true, name: true, email: true, role: true },
                },
            },
        });

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
router.get('/stats/summary', verifyToken, authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const [byAction, byResource, byStatus, recentLogs] = await Promise.all([
            // Group by action
            prisma.auditLog.groupBy({
                by: ['action'],
                _count: { action: true },
                where: { timestamp: { gte: startDate } },
                orderBy: { _count: { action: 'desc' } },
                take: 10,
            }),
            // Group by resource type
            prisma.auditLog.groupBy({
                by: ['resourceType'],
                _count: { resourceType: true },
                where: { timestamp: { gte: startDate } },
                orderBy: { _count: { resourceType: 'desc' } },
            }),
            // Group by status
            prisma.auditLog.groupBy({
                by: ['status'],
                _count: { status: true },
                where: { timestamp: { gte: startDate } },
            }),
            // Recent logs for timeline (last N days, grouped manually)
            prisma.auditLog.findMany({
                where: { timestamp: { gte: startDate } },
                select: { timestamp: true },
                orderBy: { timestamp: 'asc' },
            }),
        ]);

        // Build timeline by day from recent logs
        const timelineMap = {};
        for (const log of recentLogs) {
            const day = log.timestamp.toISOString().split('T')[0];
            timelineMap[day] = (timelineMap[day] || 0) + 1;
        }
        const timeline = Object.entries(timelineMap).map(([date, count]) => ({
            id: date,
            count,
        }));

        res.json({
            success: true,
            data: {
                byAction: byAction.map(r => ({ id: r.action, count: r._count.action })),
                byResource: byResource.map(r => ({ id: r.resourceType, count: r._count.resourceType })),
                byStatus: byStatus.map(r => ({ id: r.status, count: r._count.status })),
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

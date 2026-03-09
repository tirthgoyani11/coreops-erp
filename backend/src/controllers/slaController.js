const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

// ── Create SLA Policy ──────────────────────────────────
exports.createPolicy = asyncHandler(async (req, res, next) => {
    const { name, priority, responseTimeHours, resolutionTimeHours, escalationLevels, isDefault } = req.body;

    if (!name || !priority || !responseTimeHours || !resolutionTimeHours) {
        return next(new AppError('Name, priority, responseTimeHours, and resolutionTimeHours are required', 400));
    }

    const officeId = req.user.role === 'SUPER_ADMIN' && req.body.officeId
        ? req.body.officeId
        : req.user.officeId;

    // If setting as default, unset other defaults for same priority
    if (isDefault) {
        await prisma.sLAPolicy.updateMany({
            where: { priority, isDefault: true, officeId: officeId || undefined },
            data: { isDefault: false },
        });
    }

    const policy = await prisma.sLAPolicy.create({
        data: {
            name,
            priority,
            responseTimeHours: Number(responseTimeHours),
            resolutionTimeHours: Number(resolutionTimeHours),
            escalationLevels: escalationLevels || null,
            officeId: officeId || null,
            isDefault: isDefault || false,
        },
    });

    logger.info(`SLA policy created: ${policy.name} (${policy.priority})`);

    res.status(201).json({ success: true, message: 'SLA policy created', data: policy });
});

// ── List Policies ──────────────────────────────────────
exports.getPolicies = asyncHandler(async (req, res) => {
    const where = { isActive: true };
    if (req.user.role !== 'SUPER_ADMIN' && req.user.officeId) {
        where.OR = [{ officeId: req.user.officeId }, { officeId: null }];
    }

    const policies = await prisma.sLAPolicy.findMany({
        where,
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    res.status(200).json({ success: true, count: policies.length, data: policies });
});

// ── Update Policy ──────────────────────────────────────
exports.updatePolicy = asyncHandler(async (req, res, next) => {
    const existing = await prisma.sLAPolicy.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(new AppError('SLA policy not found', 404));

    const updateData = {};
    const fields = ['name', 'responseTimeHours', 'resolutionTimeHours', 'escalationLevels', 'isDefault', 'isActive'];
    fields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });

    if (updateData.responseTimeHours) updateData.responseTimeHours = Number(updateData.responseTimeHours);
    if (updateData.resolutionTimeHours) updateData.resolutionTimeHours = Number(updateData.resolutionTimeHours);

    const policy = await prisma.sLAPolicy.update({
        where: { id: req.params.id },
        data: updateData,
    });

    res.status(200).json({ success: true, message: 'SLA policy updated', data: policy });
});

// ── Delete Policy ──────────────────────────────────────
exports.deletePolicy = asyncHandler(async (req, res, next) => {
    const existing = await prisma.sLAPolicy.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(new AppError('SLA policy not found', 404));

    await prisma.sLAPolicy.update({
        where: { id: req.params.id },
        data: { isActive: false },
    });

    res.status(200).json({ success: true, message: 'SLA policy deactivated' });
});

// ── SLA Compliance Dashboard ───────────────────────────
exports.getCompliance = asyncHandler(async (req, res) => {
    const where = {};
    if (req.user.role !== 'SUPER_ADMIN') {
        where.officeId = req.user.officeId;
    }

    // Date range filter
    const daysBack = parseInt(req.query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - daysBack);
    where.createdAt = { gte: since };

    const tickets = await prisma.maintenanceTicket.findMany({
        where,
        select: {
            id: true,
            ticketNumber: true,
            priority: true,
            status: true,
            slaBreached: true,
            slaResponseDeadline: true,
            slaResolutionDeadline: true,
            firstResponseAt: true,
            createdAt: true,
            completedDate: true,
        },
    });

    const total = tickets.length;
    const breached = tickets.filter(t => t.slaBreached).length;
    const met = total - breached;
    const complianceRate = total > 0 ? Math.round((met / total) * 100) : 100;

    // Approaching breach (within 2 hours of deadline)
    const now = new Date();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    const approaching = tickets.filter(t =>
        !t.slaBreached &&
        t.slaResolutionDeadline &&
        t.slaResolutionDeadline > now &&
        (t.slaResolutionDeadline.getTime() - now.getTime()) < twoHoursMs
    );

    // Group by priority
    const priorityGroups = {};
    tickets.forEach(t => {
        if (!priorityGroups[t.priority]) priorityGroups[t.priority] = { total: 0, breached: 0 };
        priorityGroups[t.priority].total++;
        if (t.slaBreached) priorityGroups[t.priority].breached++;
    });
    const byPriority = Object.entries(priorityGroups).map(([priority, data]) => ({
        priority,
        total: data.total,
        breached: data.breached,
        rate: data.total > 0 ? Math.round(((data.total - data.breached) / data.total) * 100) : 100,
    }));

    // Recent breaches
    const recentBreaches = tickets
        .filter(t => t.slaBreached)
        .slice(0, 10);

    res.status(200).json({
        success: true,
        data: {
            total,
            met,
            onTrack: met,
            breached,
            complianceRate,
            avgResolutionHours: 0,
            approachingBreach: approaching.length,
            approachingTickets: approaching,
            byPriority,
            recentBreaches,
        },
    });
});

// ── Apply SLA to Ticket (called on ticket creation) ────
exports.applySLAToTicket = async (ticketId, priority, officeId) => {
    try {
        // Find matching SLA policy
        const policy = await prisma.sLAPolicy.findFirst({
            where: {
                priority,
                isActive: true,
                OR: [{ officeId }, { officeId: null }],
            },
            orderBy: { isDefault: 'desc' },
        });

        if (!policy) return null;

        const now = new Date();
        const responseDeadline = new Date(now.getTime() + policy.responseTimeHours * 60 * 60 * 1000);
        const resolutionDeadline = new Date(now.getTime() + policy.resolutionTimeHours * 60 * 60 * 1000);

        await prisma.maintenanceTicket.update({
            where: { id: ticketId },
            data: {
                slaResponseDeadline: responseDeadline,
                slaResolutionDeadline: resolutionDeadline,
            },
        });

        logger.info(`SLA applied to ticket ${ticketId}: response=${policy.responseTimeHours}h, resolution=${policy.resolutionTimeHours}h`);
        return policy;
    } catch (err) {
        logger.error(`Failed to apply SLA to ticket ${ticketId}:`, err);
        return null;
    }
};

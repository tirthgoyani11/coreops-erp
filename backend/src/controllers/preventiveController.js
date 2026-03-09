const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

// ── Frequency → Days mapping ──────────────────────────
const FREQ_DAYS = {
    DAILY: 1,
    WEEKLY: 7,
    BIWEEKLY: 14,
    MONTHLY: 30,
    QUARTERLY: 90,
    SEMI_ANNUAL: 182,
    YEARLY: 365,
};

function calculateNextDue(frequency, intervalDays, fromDate = new Date()) {
    const days = frequency === 'CUSTOM' ? (intervalDays || 30) : (FREQ_DAYS[frequency] || 30);
    const next = new Date(fromDate);
    next.setDate(next.getDate() + days);
    return next;
}

// ── Create Schedule ────────────────────────────────────
exports.createSchedule = asyncHandler(async (req, res, next) => {
    const {
        name, assetId, assetCategory, frequency, intervalDays,
        description, checklist, priority, estimatedCost, assignedToId, nextDue
    } = req.body;

    if (!name || !frequency) {
        return next(new AppError('Name and frequency are required', 400));
    }

    const officeId = req.user.role === 'SUPER_ADMIN' && req.body.officeId
        ? req.body.officeId
        : req.user.officeId;

    if (!officeId) return next(new AppError('Office is required', 400));

    const schedule = await prisma.preventiveSchedule.create({
        data: {
            name,
            assetId: assetId || null,
            assetCategory: assetCategory || null,
            officeId,
            frequency,
            intervalDays: frequency === 'CUSTOM' ? (intervalDays || 30) : null,
            description,
            checklist: checklist || null,
            priority: priority || 'MEDIUM',
            estimatedCost: estimatedCost ? Number(estimatedCost) : null,
            assignedToId: assignedToId || null,
            nextDue: nextDue ? new Date(nextDue) : calculateNextDue(frequency, intervalDays),
        },
        include: {
            asset: { select: { id: true, name: true, guai: true } },
            office: { select: { id: true, name: true } },
        },
    });

    logger.info(`Preventive schedule created: ${schedule.name} (${schedule.id})`);

    res.status(201).json({
        success: true,
        message: 'Preventive schedule created',
        data: schedule,
    });
});

// ── List Schedules ─────────────────────────────────────
exports.getSchedules = asyncHandler(async (req, res) => {
    const where = {};
    if (req.user.role !== 'SUPER_ADMIN') {
        where.officeId = req.user.officeId;
    }

    if (req.query.active !== undefined) {
        where.isActive = req.query.active === 'true';
    }

    const schedules = await prisma.preventiveSchedule.findMany({
        where,
        include: {
            asset: { select: { id: true, name: true, guai: true, category: true } },
            office: { select: { id: true, name: true } },
        },
        orderBy: { nextDue: 'asc' },
    });

    res.status(200).json({ success: true, count: schedules.length, data: schedules });
});

// ── Get Due Schedules ──────────────────────────────────
exports.getDueSchedules = asyncHandler(async (req, res) => {
    const where = { isActive: true, nextDue: { lte: new Date() } };
    if (req.user.role !== 'SUPER_ADMIN') {
        where.officeId = req.user.officeId;
    }

    const due = await prisma.preventiveSchedule.findMany({
        where,
        include: {
            asset: { select: { id: true, name: true, guai: true } },
            office: { select: { id: true, name: true } },
        },
        orderBy: { nextDue: 'asc' },
    });

    res.status(200).json({ success: true, count: due.length, data: due });
});

// ── Update Schedule ────────────────────────────────────
exports.updateSchedule = asyncHandler(async (req, res, next) => {
    const existing = await prisma.preventiveSchedule.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(new AppError('Schedule not found', 404));

    if (req.user.role !== 'SUPER_ADMIN' && existing.officeId !== req.user.officeId) {
        return next(new AppError('Access denied', 403));
    }

    const updateData = {};
    const fields = ['name', 'description', 'priority', 'assignedToId', 'isActive', 'assetId', 'assetCategory'];
    fields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });

    if (req.body.frequency) updateData.frequency = req.body.frequency;
    if (req.body.intervalDays !== undefined) updateData.intervalDays = req.body.intervalDays;
    if (req.body.estimatedCost !== undefined) updateData.estimatedCost = Number(req.body.estimatedCost);
    if (req.body.checklist !== undefined) updateData.checklist = req.body.checklist;
    if (req.body.nextDue) updateData.nextDue = new Date(req.body.nextDue);

    const schedule = await prisma.preventiveSchedule.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
            asset: { select: { id: true, name: true, guai: true } },
            office: { select: { id: true, name: true } },
        },
    });

    res.status(200).json({ success: true, message: 'Schedule updated', data: schedule });
});

// ── Delete Schedule ────────────────────────────────────
exports.deleteSchedule = asyncHandler(async (req, res, next) => {
    const existing = await prisma.preventiveSchedule.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(new AppError('Schedule not found', 404));

    if (req.user.role !== 'SUPER_ADMIN' && existing.officeId !== req.user.officeId) {
        return next(new AppError('Access denied', 403));
    }

    await prisma.preventiveSchedule.update({
        where: { id: req.params.id },
        data: { isActive: false },
    });

    res.status(200).json({ success: true, message: 'Schedule deactivated' });
});

// ── Execute Schedule (manually trigger) ────────────────
exports.executeSchedule = asyncHandler(async (req, res, next) => {
    const schedule = await prisma.preventiveSchedule.findUnique({
        where: { id: req.params.id },
        include: { asset: true },
    });

    if (!schedule) return next(new AppError('Schedule not found', 404));
    if (!schedule.assetId) return next(new AppError('Schedule must have an asset to execute', 400));

    // Generate ticket number
    const counter = await prisma.counter.upsert({
        where: { name: 'ticket_number' },
        update: { sequence: { increment: 1 } },
        create: { name: 'ticket_number', prefix: 'TKT', sequence: 1 },
    });
    const ticketNumber = `PM-${String(counter.sequence).padStart(6, '0')}`;

    // Create maintenance ticket from schedule
    const ticket = await prisma.maintenanceTicket.create({
        data: {
            ticketNumber,
            assetId: schedule.assetId,
            officeId: schedule.officeId,
            issueDescription: `[Preventive] ${schedule.name}: ${schedule.description || 'Scheduled maintenance'}`,
            issueType: 'PREVENTIVE',
            priority: schedule.priority,
            estimatedCost: schedule.estimatedCost,
            assignedToId: schedule.assignedToId,
            requestedById: req.user.id,
            status: schedule.assignedToId ? 'IN_PROGRESS' : 'REQUESTED',
        },
    });

    // Update schedule: lastExecuted and nextDue
    await prisma.preventiveSchedule.update({
        where: { id: schedule.id },
        data: {
            lastExecuted: new Date(),
            nextDue: calculateNextDue(schedule.frequency, schedule.intervalDays),
        },
    });

    logger.info(`Preventive ticket ${ticketNumber} created from schedule ${schedule.name}`);

    res.status(201).json({
        success: true,
        message: `Maintenance ticket ${ticketNumber} created`,
        data: ticket,
    });
});

// Export helper for scheduler service
exports.calculateNextDue = calculateNextDue;

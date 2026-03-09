/**
 * Scheduler Service — Automated cron jobs for preventive maintenance and SLA checks
 *
 * - Preventive: Runs every hour, creates tickets for due schedules
 * - SLA: Runs every 15 minutes, checks for SLA breaches and sends escalations
 */

const prisma = require('../config/prisma');
const logger = require('../utils/logger');
const { checkAndCreateReorders } = require('./autoReorderService');

let preventiveInterval = null;
let slaInterval = null;
let reorderInterval = null;

// ── Preventive Maintenance Auto-Creator ────────────────
async function processPreventiveSchedules() {
    try {
        const dueSchedules = await prisma.preventiveSchedule.findMany({
            where: {
                isActive: true,
                nextDue: { lte: new Date() },
                assetId: { not: null },
            },
            include: { asset: true },
        });

        if (dueSchedules.length === 0) return;

        logger.info(`[Scheduler] Found ${dueSchedules.length} due preventive schedules`);

        for (const schedule of dueSchedules) {
            try {
                // Generate ticket number
                const counter = await prisma.counter.upsert({
                    where: { name: 'ticket_number' },
                    update: { sequence: { increment: 1 } },
                    create: { name: 'ticket_number', prefix: 'TKT', sequence: 1 },
                });
                const ticketNumber = `PM-${String(counter.sequence).padStart(6, '0')}`;

                // Create ticket
                await prisma.maintenanceTicket.create({
                    data: {
                        ticketNumber,
                        assetId: schedule.assetId,
                        officeId: schedule.officeId,
                        issueDescription: `[Preventive] ${schedule.name}: ${schedule.description || 'Scheduled maintenance'}`,
                        issueType: 'PREVENTIVE',
                        priority: schedule.priority,
                        estimatedCost: schedule.estimatedCost,
                        assignedToId: schedule.assignedToId,
                        requestedById: schedule.assignedToId || (await getFirstAdmin(schedule.officeId)),
                        status: schedule.assignedToId ? 'IN_PROGRESS' : 'REQUESTED',
                        preventiveScheduleId: schedule.id,
                    },
                });

                // Calculate next due
                const FREQ_DAYS = {
                    DAILY: 1, WEEKLY: 7, BIWEEKLY: 14, MONTHLY: 30,
                    QUARTERLY: 90, SEMI_ANNUAL: 182, YEARLY: 365,
                };
                const days = schedule.frequency === 'CUSTOM'
                    ? (schedule.intervalDays || 30)
                    : (FREQ_DAYS[schedule.frequency] || 30);
                const nextDue = new Date();
                nextDue.setDate(nextDue.getDate() + days);

                await prisma.preventiveSchedule.update({
                    where: { id: schedule.id },
                    data: { lastExecuted: new Date(), nextDue },
                });

                logger.info(`[Scheduler] Created preventive ticket ${ticketNumber} for ${schedule.name}`);

                // Send notification if assigned
                if (schedule.assignedToId) {
                    await prisma.notification.create({
                        data: {
                            recipientId: schedule.assignedToId,
                            type: 'TICKET_ASSIGNED',
                            title: 'Preventive Maintenance Assigned',
                            message: `Scheduled maintenance "${schedule.name}" is due. Ticket ${ticketNumber} created.`,
                            priority: schedule.priority === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
                        },
                    });
                }
            } catch (err) {
                logger.error(`[Scheduler] Failed to process schedule ${schedule.id}:`, err);
            }
        }
    } catch (err) {
        logger.error('[Scheduler] Preventive schedule check failed:', err);
    }
}

// ── SLA Breach Checker ─────────────────────────────────
async function checkSLABreaches() {
    try {
        const now = new Date();

        // Find tickets with SLA deadlines that have passed but aren't marked breached
        const breachedTickets = await prisma.maintenanceTicket.findMany({
            where: {
                slaBreached: false,
                status: { notIn: ['COMPLETED', 'CLOSED', 'CANCELLED'] },
                OR: [
                    { slaResponseDeadline: { lte: now }, firstResponseAt: null },
                    { slaResolutionDeadline: { lte: now } },
                ],
            },
            include: {
                requestedBy: { select: { name: true } },
                assignedTo: { select: { id: true, name: true } },
                office: { select: { id: true, name: true } },
            },
        });

        if (breachedTickets.length === 0) return;

        logger.warn(`[SLA] ${breachedTickets.length} tickets breached SLA`);

        for (const ticket of breachedTickets) {
            // Mark as breached
            await prisma.maintenanceTicket.update({
                where: { id: ticket.id },
                data: { slaBreached: true },
            });

            // Notify managers in the office
            const managers = await prisma.user.findMany({
                where: {
                    officeId: ticket.officeId,
                    role: { in: ['MANAGER', 'ADMIN', 'SUPER_ADMIN'] },
                    isActive: true,
                },
                select: { id: true },
            });

            for (const mgr of managers) {
                await prisma.notification.create({
                    data: {
                        recipientId: mgr.id,
                        type: 'SYSTEM_ALERT',
                        title: '⚠️ SLA Breach',
                        message: `Ticket ${ticket.ticketNumber} has breached SLA. Priority: ${ticket.priority}. Please escalate.`,
                        priority: 'HIGH',
                        relatedModel: 'MaintenanceTicket',
                        relatedDocId: ticket.id,
                    },
                });
            }
        }
    } catch (err) {
        logger.error('[SLA] Breach check failed:', err);
    }
}

// ── Helper ─────────────────────────────────────────────
async function getFirstAdmin(officeId) {
    const admin = await prisma.user.findFirst({
        where: {
            OR: [
                { role: 'SUPER_ADMIN' },
                { role: 'ADMIN', officeId },
                { role: 'MANAGER', officeId },
            ],
            isActive: true,
        },
        select: { id: true },
    });
    return admin?.id || null;
}

// ── Start / Stop ───────────────────────────────────────
function startSchedulers() {
    // Run preventive check every hour
    preventiveInterval = setInterval(processPreventiveSchedules, 60 * 60 * 1000);
    // Run SLA check every 15 minutes
    slaInterval = setInterval(checkSLABreaches, 15 * 60 * 1000);
    // Run auto-reorder check every 24 hours
    reorderInterval = setInterval(checkAndCreateReorders, 24 * 60 * 60 * 1000);

    // Also run once on startup (after 10 second delay for DB ready)
    setTimeout(() => {
        processPreventiveSchedules();
        checkSLABreaches();
        checkAndCreateReorders();
    }, 10000);

    logger.info('[Scheduler] Preventive maintenance scheduler started (1h interval)');
    logger.info('[Scheduler] SLA breach checker started (15min interval)');
    logger.info('[Scheduler] Auto-reorder checker started (24h interval)');
}

function stopSchedulers() {
    if (preventiveInterval) clearInterval(preventiveInterval);
    if (slaInterval) clearInterval(slaInterval);
    if (reorderInterval) clearInterval(reorderInterval);
    logger.info('[Scheduler] All schedulers stopped');
}

module.exports = { startSchedulers, stopSchedulers, processPreventiveSchedules, checkSLABreaches };

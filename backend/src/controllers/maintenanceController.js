const prisma = require('../config/prisma');
const aiService = require('../services/aiService');
const { postTransactionToGL } = require('../services/financePostingService');
const { publishEvent } = require('../coreops/eventBus');
const { evaluateEvent } = require('../coreops/automationEngine');

/**
 * Maintenance Controller (Prisma)
 * Handles ticket management, approval workflows, work logs, spare parts
 */

// Helper: Repair-vs-Replace algorithm decision
function runAlgorithm(estimatedCost, purchasePrice, condition, age) {
    const costRatio = purchasePrice > 0 ? estimatedCost / purchasePrice : 0;
    const conditionScore = { 'EXCELLENT': 1, 'GOOD': 0.75, 'FAIR': 0.5, 'POOR': 0.25 };
    const cs = conditionScore[condition] || 0.5;
    const ageScore = Math.max(0, 1 - (age / 10));

    const repairScore = (1 - costRatio) * 0.5 + cs * 0.3 + ageScore * 0.2;
    const decision = repairScore >= 0.5 ? 'REPAIR' : 'REPLACE';
    const confidence = Math.round(Math.abs(repairScore - 0.5) * 200);
    const autoApprove = estimatedCost < 1000 && repairScore >= 0.6;

    return { decision, confidence, repairScore: Math.round(repairScore * 100), costRatio: Math.round(costRatio * 100), factors: { costRatio, conditionScore: cs, ageScore: Math.round(ageScore * 100) / 100 }, autoApprove };
}

function parseEnumList(input, allowed = []) {
    if (!input) return undefined;
    const normalized = String(input)
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
        .map((s) => s.replace(/\s+/g, '_'));

    const mapped = normalized
        .map((s) => {
            if (s === 'OPEN') return 'REQUESTED';
            if (s === 'PENDING_APPROVAL') return 'PENDING';
            if (s === 'DONE') return 'COMPLETED';
            return s;
        })
        .filter((s) => allowed.length === 0 || allowed.includes(s));

    if (mapped.length === 0) return undefined;
    return mapped.length === 1 ? mapped[0] : { in: mapped };
}

function getOfficeScope(user) {
    if (user.role === 'SUPER_ADMIN') return {};
    const oid = user.office?.id || user.officeId;
    return { officeId: typeof oid === 'object' ? oid.id : oid };
}

function ageHoursFrom(dateValue) {
    if (!dateValue) return 0;
    return Math.max(0, Math.round((Date.now() - new Date(dateValue).getTime()) / (1000 * 60 * 60)));
}

function getDefaultResolutionHours(priority) {
    const normalized = String(priority || '').toUpperCase();
    if (normalized === 'CRITICAL') return 4;
    if (normalized === 'HIGH') return 12;
    if (normalized === 'MEDIUM') return 24;
    return 48;
}

// @desc    Create ticket
// @route   POST /api/maintenance
exports.createTicket = async (req, res) => {
    try {
        const { assetId, issueDescription, priority, issueType, estimatedCost, images } = req.body;

        const normalizedPriority = String(priority || 'MEDIUM').toUpperCase();
        const normalizedIssueType = String(issueType || 'OTHER').toUpperCase();

        // Input validation
        if (!assetId || typeof assetId !== 'string') {
            return res.status(400).json({ success: false, message: 'assetId is required' });
        }
        if (!issueDescription || typeof issueDescription !== 'string' || issueDescription.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'issueDescription is required (min 5 characters)' });
        }
        const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        if (!VALID_PRIORITIES.includes(normalizedPriority)) {
            return res.status(400).json({ success: false, message: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
        }

        const VALID_ISSUE_TYPES = ['HARDWARE_FAILURE', 'SOFTWARE_ISSUE', 'PREVENTIVE', 'UPGRADE', 'OTHER'];
        if (!VALID_ISSUE_TYPES.includes(normalizedIssueType)) {
            return res.status(400).json({ success: false, message: `issueType must be one of: ${VALID_ISSUE_TYPES.join(', ')}` });
        }

        if (estimatedCost != null && (isNaN(estimatedCost) || Number(estimatedCost) < 0)) {
            return res.status(400).json({ success: false, message: 'estimatedCost must be a non-negative number' });
        }

        const asset = await prisma.asset.findUnique({ where: { id: assetId } });
        if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

        // Generate ticket number
        const count = await prisma.maintenanceTicket.count();
        const ticketNumber = `MT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(count + 1).padStart(4, '0')}`;

        const oid = req.user.office?.id || req.user.officeId;
        const resolvedOfficeId = typeof oid === 'object' ? oid.id : oid;

        // Run algorithm
        let algorithmDecision = null;
        let approvalStatus = 'PENDING';
        if (estimatedCost > 0) {
            const ageYears = (Date.now() - new Date(asset.purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
            algorithmDecision = runAlgorithm(estimatedCost, asset.purchasePrice, asset.condition, ageYears);
            if (algorithmDecision.autoApprove) approvalStatus = 'AUTO_APPROVED';
        }

        const ticket = await prisma.maintenanceTicket.create({
            data: {
                ticketNumber,
                assetId,
                officeId: resolvedOfficeId || asset.officeId,
                issueDescription,
                priority: normalizedPriority,
                issueType: normalizedIssueType,
                estimatedCost: estimatedCost || 0,
                requestedById: req.user.id,
                attachments: images || [],
                status: 'REQUESTED',
                approvalStatus,
                algorithmDecision,
            },
        });

        // Update asset status
        await prisma.asset.update({ where: { id: assetId }, data: { status: 'MAINTENANCE' } });

        res.status(201).json({ success: true, data: ticket });
    } catch (error) {
        if (error?.code === 'P2003') {
            return res.status(400).json({ success: false, message: 'Invalid relation data while creating ticket. Please verify selected asset/office.' });
        }

        if (error?.code === 'P2009' || error?.code === 'P2022') {
            return res.status(400).json({ success: false, message: 'Invalid ticket field value. Please check issue type and priority.' });
        }

        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get all tickets
// @route   GET /api/maintenance
exports.getTickets = async (req, res) => {
    try {
        const { status, priority, technician, assignedTo, assetId, view, start, end, approvalStatus, limit } = req.query;
        const where = {};

        if (req.user.role !== 'SUPER_ADMIN') {
            const oid = req.user.office?.id || req.user.officeId;
            where.officeId = typeof oid === 'object' ? oid.id : oid;
        }

        const statusFilter = parseEnumList(status, ['REQUESTED', 'PENDING', 'IN_PROGRESS', 'PENDING_PARTS', 'APPROVED', 'REJECTED', 'COMPLETED', 'CLOSED', 'CANCELLED']);
        const priorityFilter = parseEnumList(priority, ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
        const approvalFilter = parseEnumList(approvalStatus, ['PENDING', 'AUTO_APPROVED', 'APPROVED', 'REJECTED', 'ESCALATED']);

        if (statusFilter) where.status = statusFilter;
        if (priorityFilter) where.priority = priorityFilter;
        if (approvalFilter) where.approvalStatus = approvalFilter;

        const assignedToFilter = assignedTo || technician;
        if (assignedToFilter) {
            if (String(assignedToFilter).toLowerCase() === 'me') {
                where.assignedToId = req.user.id;
            } else {
                where.assignedToId = assignedToFilter;
            }
        }
        if (assetId) where.assetId = assetId;

        if (view === 'calendar' && start && end) {
            where.reportedDate = { gte: new Date(start), lte: new Date(end) };
        }

        const tickets = await prisma.maintenanceTicket.findMany({
            where,
            ...(limit ? { take: parseInt(limit, 10) } : {}),
            include: {
                asset: { select: { id: true, name: true, serialNumber: true, category: true, building: true, floor: true, room: true } },
                assignedTo: { select: { id: true, name: true } },
                requestedBy: { select: { id: true, name: true } },
                office: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({ success: true, count: tickets.length, data: tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Technician dashboard summary
// @route   GET /api/maintenance/technician/dashboard
exports.getTechnicianDashboard = async (req, res) => {
    try {
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);

        const officeFilter = req.user.role === 'SUPER_ADMIN'
            ? {}
            : {
                officeId: (typeof (req.user.office?.id || req.user.officeId) === 'object')
                    ? (req.user.office?.id || req.user.officeId).id
                    : (req.user.office?.id || req.user.officeId),
            };

        const [assignedOpen, completedToday, pendingAssignments, myRecent, workOrderOptions, unreadNotifications] = await Promise.all([
            prisma.maintenanceTicket.count({
                where: {
                    ...officeFilter,
                    assignedToId: req.user.id,
                    status: { in: ['REQUESTED', 'PENDING', 'IN_PROGRESS', 'PENDING_PARTS', 'APPROVED'] },
                },
            }),
            prisma.maintenanceTicket.count({
                where: {
                    ...officeFilter,
                    assignedToId: req.user.id,
                    status: { in: ['COMPLETED', 'CLOSED'] },
                    completedDate: { gte: dayStart },
                },
            }),
            prisma.maintenanceTicket.count({
                where: {
                    ...officeFilter,
                    OR: [
                        { assignedToId: req.user.id, status: 'REQUESTED' },
                        { assignedToId: null, status: { in: ['REQUESTED', 'PENDING'] } },
                    ],
                },
            }),
            prisma.maintenanceTicket.findMany({
                where: {
                    ...officeFilter,
                    assignedToId: req.user.id,
                },
                include: {
                    asset: { select: { id: true, name: true, guai: true, status: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 12,
            }),
            prisma.maintenanceTicket.findMany({
                where: {
                    ...officeFilter,
                    OR: [
                        {
                            assignedToId: req.user.id,
                            status: { in: ['REQUESTED', 'PENDING', 'IN_PROGRESS', 'PENDING_PARTS', 'APPROVED'] },
                        },
                        {
                            assignedToId: null,
                            status: { in: ['REQUESTED', 'PENDING'] },
                        },
                    ],
                },
                include: {
                    asset: { select: { id: true, name: true, guai: true, status: true } },
                    assignedTo: { select: { id: true, name: true } },
                },
                orderBy: [
                    { priority: 'desc' },
                    { createdAt: 'desc' },
                ],
                take: 30,
            }),
            prisma.notification.count({
                where: {
                    recipientId: req.user.id,
                    isRead: false,
                },
            }),
        ]);

        res.status(200).json({
            success: true,
            data: {
                assignedOpen,
                completedToday,
                pendingAssignments,
                unreadNotifications,
                recentWorkOrders: myRecent,
                workOrderOptions,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get single ticket
// @route   GET /api/maintenance/:id
exports.getTicket = async (req, res) => {
    try {
        const ticket = await prisma.maintenanceTicket.findUnique({
            where: { id: req.params.id },
            include: {
                asset: true,
                assignedTo: { select: { id: true, name: true, email: true } },
                requestedBy: { select: { id: true, name: true, email: true } },
                approvedBy: { select: { id: true, name: true } },
                workLogs: { include: { technician: { select: { id: true, name: true } } } },
                sparePartsUsed: { include: { inventory: { select: { id: true, name: true, partNumber: true } } } },
            },
        });

        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
        res.status(200).json({ success: true, data: ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Update ticket
// @route   PUT /api/maintenance/:id
exports.updateTicket = async (req, res) => {
    try {
        const {
            status,
            assignedTo,
            approvalStatus,
            approvalNotes,
            resolution,
            estimatedCost,
            actualCost,
            scheduledStartAt,
            estimatedHours,
        } = req.body;

        const ticket = await prisma.maintenanceTicket.findUnique({ where: { id: req.params.id } });
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        const updateData = {};
        const statusNormalized = status ? String(status).toUpperCase() : null;
        const isManager = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(req.user.role);

        if (estimatedCost != null) {
            const value = Number(estimatedCost);
            if (Number.isNaN(value) || value < 0) {
                return res.status(400).json({ success: false, message: 'estimatedCost must be a non-negative number' });
            }
            updateData.estimatedCost = value;
        }

        if (actualCost != null) {
            const value = Number(actualCost);
            if (Number.isNaN(value) || value < 0) {
                return res.status(400).json({ success: false, message: 'actualCost must be a non-negative number' });
            }
            updateData.actualCost = value;
        }

        if (assignedTo !== undefined) {
            const assignToId = String(assignedTo || '').trim();
            if (!assignToId) {
                updateData.assignedToId = null;
                if (['IN_PROGRESS', 'PENDING_PARTS'].includes(ticket.status)) {
                    updateData.status = 'REQUESTED';
                }
            } else {
                const technician = await prisma.user.findUnique({
                    where: { id: assignToId },
                    select: { id: true, role: true, officeId: true, isActive: true },
                });

                if (!technician || !technician.isActive) {
                    return res.status(404).json({ success: false, message: 'Assigned technician not found or inactive' });
                }

                if (technician.role !== 'TECHNICIAN' && !isManager) {
                    return res.status(403).json({ success: false, message: 'Only managers can assign non-technician users' });
                }

                if (req.user.role !== 'SUPER_ADMIN' && ticket.officeId && technician.officeId && technician.officeId !== ticket.officeId) {
                    return res.status(400).json({ success: false, message: 'Assigned technician must belong to the same office' });
                }

                updateData.assignedToId = assignToId;
                updateData.assignedDate = new Date();
                if (ticket.status === 'REQUESTED' || ticket.status === 'PENDING') {
                    updateData.status = 'PENDING';
                }
            }
        }

        if (scheduledStartAt || estimatedHours != null) {
            const startAt = scheduledStartAt ? new Date(scheduledStartAt) : (ticket.assignedDate || new Date());
            if (Number.isNaN(startAt.getTime())) {
                return res.status(400).json({ success: false, message: 'scheduledStartAt is invalid' });
            }

            const etaHours = estimatedHours != null ? Number(estimatedHours) : getDefaultResolutionHours(ticket.priority);
            if (Number.isNaN(etaHours) || etaHours <= 0 || etaHours > 720) {
                return res.status(400).json({ success: false, message: 'estimatedHours must be between 1 and 720' });
            }

            updateData.assignedDate = startAt;
            updateData.slaResolutionDeadline = new Date(startAt.getTime() + etaHours * 60 * 60 * 1000);
        }

        if (approvalStatus) {
            if (!req.user.canApproveTickets) {
                return res.status(403).json({ success: false, message: 'Not authorized to approve tickets' });
            }

            updateData.approvalStatus = approvalStatus.toUpperCase();
            updateData.approvedById = req.user.id;
            updateData.approvalDate = new Date();
            updateData.approvalNotes = approvalNotes;

            if (approvalStatus.toUpperCase() === 'APPROVED') updateData.status = 'APPROVED';
            else if (approvalStatus.toUpperCase() === 'REJECTED') updateData.status = 'REJECTED';
        }

        if (statusNormalized) {
            const allowedStatuses = ['REQUESTED', 'PENDING', 'IN_PROGRESS', 'PENDING_PARTS', 'APPROVED', 'REJECTED', 'COMPLETED', 'CLOSED', 'CANCELLED'];
            if (!allowedStatuses.includes(statusNormalized)) {
                return res.status(400).json({ success: false, message: 'Invalid status value' });
            }

            updateData.status = statusNormalized;
            if (statusNormalized === 'COMPLETED' || statusNormalized === 'CLOSED') {
                updateData.completedDate = new Date();
                // Restore asset to ACTIVE
                if (ticket.assetId) {
                    await prisma.asset.update({ where: { id: ticket.assetId }, data: { status: 'ACTIVE' } });
                    // Log maintenance cost to asset history
                    await prisma.assetMaintenanceHistory.create({
                        data: {
                            assetId: ticket.assetId,
                            type: ticket.issueType || 'OTHER',
                            cost: ticket.actualCost || ticket.estimatedCost || 0,
                            notes: resolution || ticket.resolution || 'Ticket closed',
                        },
                    });
                }

                // Create finance transaction for maintenance cost
                const maintenanceCost = ticket.actualCost || ticket.estimatedCost || 0;
                if (maintenanceCost > 0) {
                    const maintenanceTransaction = await prisma.transaction.create({
                        data: {
                            type: 'EXPENSE',
                            category: 'MAINTENANCE',
                            amount: maintenanceCost,
                            description: `Maintenance ticket ${ticket.ticketNumber} completed`,
                            referenceType: 'MAINTENANCE_TICKET',
                            referenceId: ticket.ticketNumber,
                            officeId: ticket.officeId,
                            recordedById: req.user.id,
                            status: 'CLEARED',
                        },
                    });

                    await postTransactionToGL({ transaction: maintenanceTransaction, userId: req.user.id });
                }
            }
        }

        if (resolution) updateData.resolution = resolution;

        const updated = await prisma.maintenanceTicket.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                asset: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } },
            },
        });

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get assignable technicians for maintenance
// @route   GET /api/maintenance/technicians
exports.getAssignableTechnicians = async (req, res) => {
    try {
        const where = { role: 'TECHNICIAN', isActive: true };
        if (req.user.role !== 'SUPER_ADMIN') {
            const oid = req.user.office?.id || req.user.officeId;
            where.officeId = typeof oid === 'object' ? oid.id : oid;
        }

        const openStatuses = ['REQUESTED', 'PENDING', 'IN_PROGRESS', 'PENDING_PARTS', 'APPROVED'];

        const [technicians, activeLoad] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    officeId: true,
                    office: { select: { id: true, name: true } },
                },
                orderBy: { name: 'asc' },
            }),
            prisma.maintenanceTicket.groupBy({
                by: ['assignedToId'],
                where: {
                    assignedToId: { not: null },
                    status: { in: openStatuses },
                },
                _count: { assignedToId: true },
            }),
        ]);

        const loadMap = new Map(activeLoad.map((row) => [row.assignedToId, row._count.assignedToId]));
        const data = technicians.map((tech) => ({
            ...tech,
            openAssignments: loadMap.get(tech.id) || 0,
        }));

        res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Auto-schedule and auto-assign ticket
// @route   POST /api/maintenance/:id/auto-schedule
exports.autoScheduleTicket = async (req, res) => {
    try {
        const ticket = await prisma.maintenanceTicket.findUnique({ where: { id: req.params.id } });
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        const { startAt, estimatedHours } = req.body || {};
        const start = startAt ? new Date(startAt) : new Date();
        if (Number.isNaN(start.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid schedule start date' });
        }

        const eta = estimatedHours != null ? Number(estimatedHours) : getDefaultResolutionHours(ticket.priority);
        if (Number.isNaN(eta) || eta <= 0 || eta > 720) {
            return res.status(400).json({ success: false, message: 'estimatedHours must be between 1 and 720' });
        }

        const techWhere = {
            role: 'TECHNICIAN',
            isActive: true,
            ...(ticket.officeId ? { officeId: ticket.officeId } : {}),
        };
        const technicians = await prisma.user.findMany({
            where: techWhere,
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        });

        if (!technicians.length) {
            return res.status(400).json({ success: false, message: 'No active technician available for this office' });
        }

        const openStatuses = ['REQUESTED', 'PENDING', 'IN_PROGRESS', 'PENDING_PARTS', 'APPROVED'];
        const grouped = await prisma.maintenanceTicket.groupBy({
            by: ['assignedToId'],
            where: {
                assignedToId: { in: technicians.map((t) => t.id) },
                status: { in: openStatuses },
            },
            _count: { assignedToId: true },
        });

        const loadMap = new Map(grouped.map((row) => [row.assignedToId, row._count.assignedToId]));
        technicians.sort((a, b) => {
            const la = loadMap.get(a.id) || 0;
            const lb = loadMap.get(b.id) || 0;
            if (la !== lb) return la - lb;
            return a.name.localeCompare(b.name);
        });

        const selected = technicians[0];
        const deadline = new Date(start.getTime() + eta * 60 * 60 * 1000);

        const updated = await prisma.maintenanceTicket.update({
            where: { id: ticket.id },
            data: {
                assignedToId: selected.id,
                assignedDate: start,
                slaResolutionDeadline: deadline,
                status: ['REQUESTED', 'PENDING'].includes(ticket.status) ? 'PENDING' : ticket.status,
            },
            include: {
                asset: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } },
            },
        });

        res.status(200).json({
            success: true,
            data: {
                ticket: updated,
                scheduling: {
                    assignedTechnician: selected,
                    startAt: start,
                    estimatedHours: eta,
                    resolutionDeadline: deadline,
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Approve a ticket
// @route   PATCH /api/maintenance/:id/approve
exports.approveTicket = async (req, res) => {
    try {
        const ticket = await prisma.maintenanceTicket.findUnique({ where: { id: req.params.id } });
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        const updated = await prisma.maintenanceTicket.update({
            where: { id: req.params.id },
            data: {
                approvalStatus: 'APPROVED',
                status: 'APPROVED',
                approvedById: req.user.id,
                approvalDate: new Date(),
                approvalNotes: req.body.notes || null,
            },
            include: { asset: { select: { id: true, name: true } } },
        });

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Reject a ticket
// @route   PATCH /api/maintenance/:id/reject
exports.rejectTicket = async (req, res) => {
    try {
        const ticket = await prisma.maintenanceTicket.findUnique({ where: { id: req.params.id } });
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        const updated = await prisma.maintenanceTicket.update({
            where: { id: req.params.id },
            data: {
                approvalStatus: 'REJECTED',
                status: 'REJECTED',
                approvedById: req.user.id,
                approvalDate: new Date(),
                approvalNotes: req.body.notes || req.body.reason || null,
            },
            include: { asset: { select: { id: true, name: true } } },
        });

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Add work log
// @route   POST /api/maintenance/:id/worklog
exports.addWorkLog = async (req, res) => {
    try {
        const {
            startTime,
            endTime,
            notes,
            maintenanceType,
            issueType,
            attachments,
            location,
            voiceText,
            timeSpentMinutes,
            partsUsed,
        } = req.body;

        const ticket = await prisma.maintenanceTicket.findUnique({ where: { id: req.params.id } });
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        let hoursWorked = null;
        if (startTime && endTime) {
            hoursWorked = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
        } else if (timeSpentMinutes != null && !Number.isNaN(Number(timeSpentMinutes))) {
            hoursWorked = Number(timeSpentMinutes) / 60;
        }

        const metadata = {
            maintenanceType: maintenanceType || null,
            issueType: issueType || null,
            attachments: Array.isArray(attachments) ? attachments : [],
            location: location && typeof location === 'object' ? {
                latitude: Number(location.latitude) || null,
                longitude: Number(location.longitude) || null,
                accuracy: Number(location.accuracy) || null,
                capturedAt: new Date().toISOString(),
            } : null,
            voiceText: voiceText || null,
            timeSpentMinutes: Number(timeSpentMinutes) || null,
            partsUsed: Array.isArray(partsUsed) ? partsUsed : [],
        };

        const metaNotes = `${notes || ''}${Object.values(metadata).some(Boolean) ? `\n\n[META] ${JSON.stringify(metadata)}` : ''}`;

        await prisma.workLog.create({
            data: {
                ticketId: req.params.id,
                technicianId: req.user.id,
                startTime: startTime ? new Date(startTime) : null,
                endTime: endTime ? new Date(endTime) : null,
                hoursWorked,
                notes: metaNotes,
            },
        });

        const updated = await prisma.maintenanceTicket.findUnique({
            where: { id: req.params.id },
            include: { workLogs: { include: { technician: { select: { id: true, name: true } } } } },
        });

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Update work order status (technician-friendly transitions)
// @route   PATCH /api/maintenance/:id/status
exports.updateWorkOrderStatus = async (req, res) => {
    try {
        const {
            status,
            action,
            completionNotes,
            proofImages,
            signature,
            location,
        } = req.body;

        const ticket = await prisma.maintenanceTicket.findUnique({ where: { id: req.params.id } });
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        const isTechnician = req.user.role === 'TECHNICIAN';
        if (isTechnician && ticket.assignedToId && ticket.assignedToId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'This work order is assigned to another technician' });
        }

        const updateData = {};
        const normalizedAction = String(action || '').toUpperCase();
        const normalizedStatus = String(status || '').toUpperCase();

        if (normalizedAction === 'ACCEPT') {
            updateData.assignedToId = ticket.assignedToId || req.user.id;
            updateData.assignedDate = ticket.assignedDate || new Date();
            updateData.status = 'IN_PROGRESS';
            updateData.firstResponseAt = ticket.firstResponseAt || new Date();
        } else if (normalizedAction === 'REJECT') {
            updateData.status = 'REQUESTED';
            if (ticket.assignedToId === req.user.id) {
                updateData.assignedToId = null;
            }
        }

        if (normalizedStatus) {
            const allowed = ['REQUESTED', 'PENDING', 'IN_PROGRESS', 'PENDING_PARTS', 'APPROVED', 'REJECTED', 'COMPLETED', 'CLOSED', 'CANCELLED'];
            if (!allowed.includes(normalizedStatus)) {
                return res.status(400).json({ success: false, message: 'Invalid status transition' });
            }
            updateData.status = normalizedStatus;
        }

        const attachmentList = [];
        if (Array.isArray(ticket.attachments)) attachmentList.push(...ticket.attachments);
        if (Array.isArray(proofImages)) attachmentList.push(...proofImages.filter(Boolean));
        if (signature) attachmentList.push(signature);

        if (attachmentList.length > 0) {
            updateData.attachments = Array.from(new Set(attachmentList));
        }

        if (updateData.status === 'COMPLETED' || updateData.status === 'CLOSED') {
            updateData.completedDate = new Date();
            if (completionNotes) updateData.resolution = completionNotes;
        }

        const updated = await prisma.maintenanceTicket.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                asset: { select: { id: true, name: true, guai: true } },
                assignedTo: { select: { id: true, name: true } },
            },
        });

        if (location && typeof location === 'object') {
            const locationNote = `[LOCATION] ${JSON.stringify({
                latitude: Number(location.latitude) || null,
                longitude: Number(location.longitude) || null,
                accuracy: Number(location.accuracy) || null,
                capturedAt: new Date().toISOString(),
            })}`;

            await prisma.workLog.create({
                data: {
                    ticketId: req.params.id,
                    technicianId: req.user.id,
                    startTime: null,
                    endTime: null,
                    hoursWorked: null,
                    notes: `${completionNotes || 'Work order status updated'}\n${locationNote}`,
                },
            });
        }

        if (updated.status === 'COMPLETED' || updated.status === 'CLOSED') {
            await prisma.asset.update({ where: { id: updated.assetId }, data: { status: 'ACTIVE' } });
            await prisma.assetMaintenanceHistory.create({
                data: {
                    assetId: updated.assetId,
                    type: ticket.issueType || 'OTHER',
                    cost: updated.actualCost || updated.estimatedCost || 0,
                    notes: completionNotes || 'Completed by technician',
                },
            });
        }

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Consume spare parts
// @route   POST /api/maintenance/:id/parts
exports.consumePart = async (req, res) => {
    try {
        const { inventoryId, quantity } = req.body;

        const result = await prisma.$transaction(async (tx) => {
            const ticket = await tx.maintenanceTicket.findUnique({ where: { id: req.params.id } });
            if (!ticket) throw new Error('Ticket not found');

            const part = await tx.inventory.findUnique({ where: { id: inventoryId } });
            if (!part) throw new Error('Part not found');
            if (part.currentQuantity < quantity) throw new Error('Insufficient stock');

            // Decrement inventory
            await tx.inventory.update({
                where: { id: inventoryId },
                data: { currentQuantity: { decrement: quantity } },
            });

            // Record stock movement
            await tx.stockMovement.create({
                data: {
                    inventoryId,
                    type: 'STOCK_OUT',
                    quantity,
                    reason: `Maintenance ticket ${ticket.ticketNumber}`,
                    reference: ticket.ticketNumber,
                    performedById: req.user.id,
                },
            });

            // Record spare part usage on ticket
            await tx.sparePartUsage.create({
                data: {
                    ticketId: req.params.id,
                    inventoryId,
                    partNumber: part.partNumber || part.sku,
                    name: part.name,
                    quantity,
                    costPerUnit: part.unitCost || part.costPrice || 0,
                },
            });

            // Update actual cost
            const partCost = quantity * (part.unitCost || part.costPrice || 0);
            await tx.maintenanceTicket.update({
                where: { id: req.params.id },
                data: { actualCost: { increment: partCost } },
            });

            const updatedTicket = await tx.maintenanceTicket.findUnique({
                where: { id: req.params.id },
                include: { sparePartsUsed: { include: { inventory: { select: { id: true, name: true } } } } },
            });

            return {
                ticket: updatedTicket,
                usage: {
                    ticketId: ticket.id,
                    ticketNumber: ticket.ticketNumber,
                    officeId: ticket.officeId,
                    inventoryId,
                    inventoryName: part.name,
                    quantity: Number(quantity),
                    unitCost: Number(part.unitCost || part.costPrice || 0),
                    totalCost: Number(partCost.toFixed(2)),
                },
            };
        });

        const spareUsageEvent = await publishEvent('inventory.sparepart.used', result.usage, {
            source: 'maintenance.controller',
            officeId: result.usage.officeId,
            actorId: req.user?.id || null,
        });

        await evaluateEvent(spareUsageEvent, {
            source: 'maintenance.controller',
            officeId: result.usage.officeId,
            actorId: req.user?.id || null,
        });

        res.status(200).json({ success: true, data: result.ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get maintenance stats
// @route   GET /api/maintenance/stats
exports.getStats = async (req, res) => {
    try {
        const where = {};
        if (req.user.role !== 'SUPER_ADMIN') {
            const oid = req.user.office?.id || req.user.officeId;
            where.officeId = typeof oid === 'object' ? oid.id : oid;
        }

        const [totalTickets, openTickets, criticalTickets, completedTickets] = await Promise.all([
            prisma.maintenanceTicket.count({ where }),
            prisma.maintenanceTicket.count({ where: { ...where, status: { notIn: ['COMPLETED', 'CLOSED', 'CANCELLED'] } } }),
            prisma.maintenanceTicket.count({ where: { ...where, priority: 'CRITICAL', status: { not: 'CLOSED' } } }),
            prisma.maintenanceTicket.findMany({
                where: { ...where, status: 'COMPLETED', completedDate: { not: null } },
                select: { reportedDate: true, completedDate: true },
            }),
        ]);

        const avgResolutionTime = completedTickets.length
            ? completedTickets.reduce((acc, t) => {
                const days = (new Date(t.completedDate) - new Date(t.reportedDate)) / (1000 * 60 * 60 * 24);
                return acc + days;
            }, 0) / completedTickets.length
            : 0;

        res.status(200).json({
            success: true,
            data: { totalTickets, openTickets, criticalTickets, avgResolutionTime: Math.round(avgResolutionTime * 10) / 10 },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Executive maintenance operations overview
// @route   GET /api/maintenance/overview
exports.getOperationsOverview = async (req, res) => {
    try {
        const scope = getOfficeScope(req.user);
        const openStatuses = ['REQUESTED', 'PENDING', 'IN_PROGRESS', 'PENDING_PARTS', 'APPROVED'];
        const now = new Date();
        const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [
            openTickets,
            criticalOpen,
            highOpen,
            unassignedOpen,
            slaBreached,
            slaAtRisk,
            closedRecent,
            openTicketRows,
        ] = await Promise.all([
            prisma.maintenanceTicket.count({
                where: { ...scope, status: { in: openStatuses } },
            }),
            prisma.maintenanceTicket.count({
                where: { ...scope, status: { in: openStatuses }, priority: 'CRITICAL' },
            }),
            prisma.maintenanceTicket.count({
                where: { ...scope, status: { in: openStatuses }, priority: 'HIGH' },
            }),
            prisma.maintenanceTicket.count({
                where: { ...scope, status: { in: openStatuses }, assignedToId: null },
            }),
            prisma.maintenanceTicket.count({
                where: { ...scope, status: { in: openStatuses }, slaBreached: true },
            }),
            prisma.maintenanceTicket.count({
                where: {
                    ...scope,
                    status: { in: openStatuses },
                    slaBreached: false,
                    slaResolutionDeadline: { gte: now, lte: next24h },
                },
            }),
            prisma.maintenanceTicket.findMany({
                where: {
                    ...scope,
                    status: { in: ['COMPLETED', 'CLOSED'] },
                    completedDate: { gte: last30d },
                },
                select: {
                    reportedDate: true,
                    completedDate: true,
                    firstResponseAt: true,
                },
            }),
            prisma.maintenanceTicket.findMany({
                where: { ...scope, status: { in: openStatuses } },
                select: {
                    id: true,
                    ticketNumber: true,
                    priority: true,
                    status: true,
                    createdAt: true,
                    assignedToId: true,
                    assignedTo: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'asc' },
            }),
        ]);

        const resolutionHours = [];
        const responseMinutes = [];

        for (const t of closedRecent) {
            if (t.completedDate && t.reportedDate) {
                resolutionHours.push((new Date(t.completedDate).getTime() - new Date(t.reportedDate).getTime()) / (1000 * 60 * 60));
            }
            if (t.firstResponseAt && t.reportedDate) {
                responseMinutes.push((new Date(t.firstResponseAt).getTime() - new Date(t.reportedDate).getTime()) / (1000 * 60));
            }
        }

        const avgResolutionHours = resolutionHours.length
            ? Number((resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length).toFixed(1))
            : 0;

        const avgFirstResponseMins = responseMinutes.length
            ? Number((responseMinutes.reduce((a, b) => a + b, 0) / responseMinutes.length).toFixed(1))
            : 0;

        const backlogByPriority = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
        const technicianMap = new Map();

        for (const t of openTicketRows) {
            if (backlogByPriority[t.priority] != null) {
                backlogByPriority[t.priority] += 1;
            }

            if (!t.assignedToId || !t.assignedTo?.name) continue;
            const prev = technicianMap.get(t.assignedToId) || {
                technicianId: t.assignedToId,
                technicianName: t.assignedTo.name,
                openTickets: 0,
                criticalTickets: 0,
                oldestTicketAgeHours: 0,
            };

            prev.openTickets += 1;
            if (t.priority === 'CRITICAL') prev.criticalTickets += 1;
            prev.oldestTicketAgeHours = Math.max(prev.oldestTicketAgeHours, ageHoursFrom(t.createdAt));
            technicianMap.set(t.assignedToId, prev);
        }

        const technicianLoad = Array.from(technicianMap.values())
            .sort((a, b) => b.openTickets - a.openTickets || b.criticalTickets - a.criticalTickets)
            .slice(0, 8);

        res.status(200).json({
            success: true,
            data: {
                openTickets,
                criticalOpen,
                highOpen,
                unassignedOpen,
                slaBreached,
                slaAtRisk,
                avgResolutionHours,
                avgFirstResponseMins,
                backlogByPriority,
                technicianLoad,
                generatedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    AI-assisted operational brief for maintenance
// @route   GET /api/maintenance/insights
exports.getOperationalInsights = async (req, res) => {
    try {
        const scope = getOfficeScope(req.user);
        const openStatuses = ['REQUESTED', 'PENDING', 'IN_PROGRESS', 'PENDING_PARTS', 'APPROVED'];
        const requestedLimit = parseInt(req.query.limit, 10);
        const limit = Number.isFinite(requestedLimit)
            ? Math.max(5, Math.min(requestedLimit, 30))
            : 12;

        const openTickets = await prisma.maintenanceTicket.findMany({
            where: { ...scope, status: { in: openStatuses } },
            include: {
                asset: { select: { id: true, name: true, guai: true, category: true } },
                assignedTo: { select: { id: true, name: true } },
            },
            orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
            take: limit,
        });

        const now = Date.now();
        const watchlist = openTickets.slice(0, 5).map((t) => ({
            id: t.id,
            ticketNumber: t.ticketNumber,
            priority: t.priority,
            status: t.status,
            asset: t.asset?.name || 'Unknown Asset',
            assignedTo: t.assignedTo?.name || 'Unassigned',
            ageHours: Math.max(0, Math.round((now - new Date(t.createdAt).getTime()) / (1000 * 60 * 60))),
            slaBreached: Boolean(t.slaBreached),
            issueDescription: t.issueDescription,
        }));

        const unassignedCount = openTickets.filter((t) => !t.assignedToId).length;
        const breachedCount = openTickets.filter((t) => t.slaBreached).length;
        const pendingPartsCount = openTickets.filter((t) => t.status === 'PENDING_PARTS').length;
        const criticalAged = openTickets.filter((t) => t.priority === 'CRITICAL' && ageHoursFrom(t.createdAt) >= 24).length;

        const fallbackActions = [];
        if (unassignedCount > 0) fallbackActions.push(`Assign ownership for ${unassignedCount} unassigned open ticket(s) in the next standup.`);
        if (breachedCount > 0) fallbackActions.push(`Run escalation workflow for ${breachedCount} SLA-breached ticket(s) and set 4-hour checkpoints.`);
        if (criticalAged > 0) fallbackActions.push(`Create rapid response swarm for ${criticalAged} critical ticket(s) older than 24 hours.`);
        if (pendingPartsCount > 0) fallbackActions.push(`Expedite procurement for ${pendingPartsCount} ticket(s) blocked on parts.`);
        if (fallbackActions.length === 0) fallbackActions.push('Maintain current operating cadence and review the top 5 watchlist tickets every 2 hours.');

        const fallbackStructural = [
            'Introduce auto-routing rules by asset category and technician skill to reduce first assignment latency.',
            'Adopt SLA early-warning automation at 24h and 4h before deadline with manager escalation.',
            'Publish weekly MTTR and first-response scorecards per office and technician cohort.',
        ];

        const fallbackRiskScore = Math.min(100, Math.round((breachedCount * 18) + (criticalAged * 12) + (unassignedCount * 8)));
        const fallbackSummary = `Open:${openTickets.length}, Unassigned:${unassignedCount}, Breached:${breachedCount}, PendingParts:${pendingPartsCount}`;

        let aiBrief = null;
        try {
            const compactTickets = watchlist.map((t) => ({
                ticketNumber: t.ticketNumber,
                priority: t.priority,
                status: t.status,
                ageHours: t.ageHours,
                assignedTo: t.assignedTo,
                slaBreached: t.slaBreached,
                issue: t.issueDescription,
                asset: t.asset,
            }));

            const prompt = `You are an enterprise maintenance operations advisor for CoreOps ERP.
Return strict JSON only.
Input snapshot:
${JSON.stringify({
                totalOpen: openTickets.length,
                unassignedCount,
                breachedCount,
                pendingPartsCount,
                criticalAged,
                tickets: compactTickets,
            }, null, 2)}

Schema:
{
  "summary": "string max 180 chars",
  "riskScore": number,
  "immediateActions": ["string", "string", "string"],
  "structuralFixes": ["string", "string", "string"]
}
Rules:
- Keep items practical and ERP-operational.
- riskScore must be 0-100.
- No markdown, no extra keys.`;

            const result = await aiService.generateJSON('planning', prompt, {
                temperature: 0.2,
                maxTokens: 700,
            });

            if (result?.parsed && typeof result.parsed === 'object') {
                aiBrief = result.parsed;
            }
        } catch (_error) {
            aiBrief = null;
        }

        const immediateActions = Array.isArray(aiBrief?.immediateActions) && aiBrief.immediateActions.length > 0
            ? aiBrief.immediateActions.slice(0, 4)
            : fallbackActions.slice(0, 4);

        const structuralFixes = Array.isArray(aiBrief?.structuralFixes) && aiBrief.structuralFixes.length > 0
            ? aiBrief.structuralFixes.slice(0, 4)
            : fallbackStructural;

        const riskScoreRaw = Number(aiBrief?.riskScore);
        const riskScore = Number.isFinite(riskScoreRaw)
            ? Math.max(0, Math.min(100, Math.round(riskScoreRaw)))
            : fallbackRiskScore;

        const summary = typeof aiBrief?.summary === 'string' && aiBrief.summary.trim().length > 0
            ? aiBrief.summary.trim().slice(0, 180)
            : fallbackSummary;

        res.status(200).json({
            success: true,
            data: {
                source: aiBrief ? 'ai+rules' : 'rules',
                generatedAt: new Date().toISOString(),
                summary,
                riskScore,
                immediateActions,
                structuralFixes,
                ticketWatchlist: watchlist,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Digital Twin Preview
// @route   GET /api/maintenance/:id/preview
exports.getDigitalTwinPreview = async (req, res) => {
    try {
        const ticket = await prisma.maintenanceTicket.findUnique({
            where: { id: req.params.id },
            include: {
                asset: { select: { name: true, guai: true, status: true, purchasePrice: true } },
                sparePartsUsed: { include: { inventory: { select: { name: true, currentQuantity: true } } } },
            },
        });

        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        const closeCost = ticket.actualCost || ticket.estimatedCost || 0;

        // Get total maintenance history cost
        const historyAgg = await prisma.assetMaintenanceHistory.aggregate({
            where: { assetId: ticket.assetId },
            _sum: { cost: true },
        });
        const totalPriorCost = historyAgg._sum.cost || 0;

        const preview = {
            ticketId: ticket.ticketNumber,
            assetChanges: {
                field: 'status', before: ticket.asset?.status || 'UNKNOWN', after: 'ACTIVE',
                label: `Asset ${ticket.asset?.guai || ticket.asset?.name} will return to ACTIVE`,
            },
            financeImpact: {
                expenseAmount: closeCost, currency: ticket.currency || 'INR', budgetCategory: 'MAINTENANCE',
                label: `₹${closeCost.toLocaleString('en-IN')} will be recorded as maintenance expense`,
            },
            inventoryChanges: (ticket.sparePartsUsed || []).map(part => ({
                partName: part.name || part.inventory?.name || 'Unknown Part',
                quantityDeducted: part.quantity,
                currentStock: part.inventory?.currentQuantity ?? 'N/A',
                afterStock: part.inventory?.currentQuantity != null ? part.inventory.currentQuantity - part.quantity : 'N/A',
            })),
            maintenanceHistory: { totalPriorCost, totalAfterClose: totalPriorCost + closeCost },
            reversible: true,
            warning: closeCost > 50000 ? 'High value maintenance — manager approval recommended.' : null,
        };

        res.json({ success: true, data: preview });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Check anomaly on maintenance cost
// @route   GET /api/maintenance/:id/anomaly-check
exports.checkAnomaly = async (req, res) => {
    try {
        const { calculateZScore, rollingAverage } = require('../utils/anomaly');

        const ticket = await prisma.maintenanceTicket.findUnique({ where: { id: req.params.id } });
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        const cost = ticket.actualCost || ticket.estimatedCost || 0;
        const asset = await prisma.asset.findUnique({ where: { id: ticket.assetId }, select: { name: true } });

        const historicalTickets = await prisma.maintenanceTicket.findMany({
            where: {
                officeId: ticket.officeId,
                status: { in: ['COMPLETED', 'CLOSED'] },
                OR: [
                    { actualCost: { gt: 0 } },
                    { estimatedCost: { gt: 0 } },
                ],
            },
            select: { actualCost: true, estimatedCost: true, createdAt: true },
        });

        const historyCosts = historicalTickets.map(t => t.actualCost || t.estimatedCost);
        const zScoreResult = calculateZScore(cost, historyCosts);
        const rolling = rollingAverage(historicalTickets.map(t => ({
            amount: t.actualCost || t.estimatedCost,
            date: t.createdAt,
        })));

        res.json({
            success: true,
            data: {
                ticketNumber: ticket.ticketNumber, cost,
                anomaly: zScoreResult, rollingAverage: rolling,
                assetName: asset?.name,
                recommendation: zScoreResult.isAnomaly
                    ? 'ESCALATE — Cost significantly exceeds historical pattern'
                    : zScoreResult.isElevated
                        ? 'REVIEW — Cost is above average, consider manual review'
                        : 'APPROVE — Cost is within normal range',
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

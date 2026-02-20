const prisma = require('../config/prisma');

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

// @desc    Create ticket
// @route   POST /api/maintenance
exports.createTicket = async (req, res) => {
    try {
        const { assetId, issueDescription, priority, issueType, estimatedCost, images } = req.body;

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
                priority: priority || 'MEDIUM',
                issueType: issueType || 'OTHER',
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
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get all tickets
// @route   GET /api/maintenance
exports.getTickets = async (req, res) => {
    try {
        const { status, priority, technician, assetId, view, start, end } = req.query;
        const where = {};

        if (req.user.role !== 'SUPER_ADMIN') {
            const oid = req.user.office?.id || req.user.officeId;
            where.officeId = typeof oid === 'object' ? oid.id : oid;
        }

        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (technician) where.assignedToId = technician;
        if (assetId) where.assetId = assetId;

        if (view === 'calendar' && start && end) {
            where.reportedDate = { gte: new Date(start), lte: new Date(end) };
        }

        const tickets = await prisma.maintenanceTicket.findMany({
            where,
            include: {
                asset: { select: { id: true, name: true, serialNumber: true, category: true, building: true, floor: true, room: true } },
                assignedTo: { select: { id: true, name: true } },
                requestedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({ success: true, count: tickets.length, data: tickets });
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
        const { status, assignedTo, approvalStatus, approvalNotes, resolution } = req.body;

        const ticket = await prisma.maintenanceTicket.findUnique({ where: { id: req.params.id } });
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        const updateData = {};

        if (assignedTo) {
            updateData.assignedToId = assignedTo;
            updateData.assignedDate = new Date();
            updateData.status = 'IN_PROGRESS';
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

        if (status) {
            updateData.status = status;
            if (status === 'COMPLETED' || status === 'CLOSED') {
                updateData.completedDate = new Date();
                // Restore asset to ACTIVE
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

// @desc    Add work log
// @route   POST /api/maintenance/:id/worklog
exports.addWorkLog = async (req, res) => {
    try {
        const { startTime, endTime, notes } = req.body;

        const ticket = await prisma.maintenanceTicket.findUnique({ where: { id: req.params.id } });
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        let hoursWorked = null;
        if (startTime && endTime) {
            hoursWorked = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
        }

        await prisma.workLog.create({
            data: {
                ticketId: req.params.id,
                technicianId: req.user.id,
                startTime: startTime ? new Date(startTime) : null,
                endTime: endTime ? new Date(endTime) : null,
                hoursWorked,
                notes,
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

            return await tx.maintenanceTicket.findUnique({
                where: { id: req.params.id },
                include: { sparePartsUsed: { include: { inventory: { select: { id: true, name: true } } } } },
            });
        });

        res.status(200).json({ success: true, data: result });
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

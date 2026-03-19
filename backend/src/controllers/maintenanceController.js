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

// @desc    Create ticket
// @route   POST /api/maintenance
exports.createTicket = async (req, res) => {
    try {
        const { assetId, issueDescription, priority, issueType, estimatedCost, images } = req.body;

        // Input validation
        if (!assetId || typeof assetId !== 'string') {
            return res.status(400).json({ success: false, message: 'assetId is required' });
        }
        if (!issueDescription || typeof issueDescription !== 'string' || issueDescription.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'issueDescription is required (min 5 characters)' });
        }
        const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        if (priority && !VALID_PRIORITIES.includes(priority.toUpperCase())) {
            return res.status(400).json({ success: false, message: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
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
                    await prisma.transaction.create({
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

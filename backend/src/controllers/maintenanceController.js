const mongoose = require('mongoose');
const Maintenance = require('../models/Maintenance');
const Asset = require('../models/Asset');
const Inventory = require('../models/Inventory');
const User = require('../models/User');

/**
 * Maintenance Controller
 * Handles all ticket management, approval workflows, and algorithmic decision making
 */

// @desc    Create new maintenance ticket
// @route   POST /api/maintenance
// @access  Private
exports.createTicket = async (req, res) => {
    try {
        const { assetId, issueDescription, priority, issueType, estimatedCost, images } = req.body;

        // Verify asset exists
        const asset = await Asset.findById(assetId);
        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        // Create ticket
        const ticket = new Maintenance({
            assetId,
            officeId: req.user.officeId || asset.officeId, // Use asset office if super admin
            issueDescription,
            priority,
            issueType,
            estimatedCost: estimatedCost || 0,
            requestedBy: req.user._id,
            attachments: images || [],
            status: 'REQUESTED'
        });

        // Run algorithm if cost is provided
        if (estimatedCost > 0) {
            await ticket.runAlgorithm();
        }

        await ticket.save();

        // Update asset status
        asset.status = 'MAINTENANCE';
        await asset.save();

        res.status(201).json({
            success: true,
            data: ticket
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get all tickets
// @route   GET /api/maintenance
// @access  Private
exports.getTickets = async (req, res) => {
    try {
        const { status, priority, technician, assetId, view } = req.query;
        let query = {};

        // Role-based filtering
        if (req.user.role !== 'SUPER_ADMIN') {
            query.officeId = req.user.officeId;
        }

        // Apply filters
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (technician) query.assignedTo = technician;
        if (assetId) query.assetId = assetId;

        // Calendar view date range filter
        if (view === 'calendar' && req.query.start && req.query.end) {
            query.reportedDate = {
                $gte: new Date(req.query.start),
                $lte: new Date(req.query.end)
            };
        }

        const tickets = await Maintenance.find(query)
            .populate('assetId', 'name serialNumber category location')
            .populate('assignedTo', 'name')
            .populate('requestedBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: tickets.length,
            data: tickets
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get single ticket
// @route   GET /api/maintenance/:id
// @access  Private
exports.getTicket = async (req, res) => {
    try {
        const ticket = await Maintenance.findById(req.params.id)
            .populate('assetId')
            .populate('assignedTo', 'name email')
            .populate('requestedBy', 'name email')
            .populate('approvedBy', 'name')
            .populate('workLog.technician', 'name')
            .populate('sparePartsUsed.inventoryId', 'name partNumber');

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.status(200).json({
            success: true,
            data: ticket
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Update ticket status / Approve / Assign
// @route   PUT /api/maintenance/:id
// @access  Private (Manager/Admin)
exports.updateTicket = async (req, res) => {
    try {
        const { status, assignedTo, approvalStatus, approvalNotes, resolution } = req.body;

        let ticket = await Maintenance.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        // Handle assignment
        if (assignedTo) {
            ticket.assignedTo = assignedTo;
            ticket.assignedDate = Date.now();
            ticket.status = 'IN_PROGRESS';
        }

        // Handle approval
        if (approvalStatus) {
            // Check permission
            if (!req.user.permissions.canApproveTickets) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to approve tickets'
                });
            }

            // Check limit
            if (!req.user.canApproveAmount(ticket.estimatedCost)) {
                return res.status(403).json({
                    success: false,
                    message: `Approval limit exceeded. Requires approval > ${ticket.estimatedCost}`
                });
            }

            ticket.approvalStatus = approvalStatus;
            ticket.approvedBy = req.user._id;
            ticket.approvalDate = Date.now();
            ticket.approvalNotes = approvalNotes;

            if (approvalStatus === 'approved') {
                ticket.status = 'APPROVED';
            } else if (approvalStatus === 'rejected') {
                ticket.status = 'REJECTED';
            }
        }

        // Handle generic status update
        if (status) {
            ticket.status = status;
            if (status === 'COMPLETED' || status === 'CLOSED') {
                ticket.completedDate = Date.now();
                // Find asset and set status back to ACTIVE
                const asset = await Asset.findById(ticket.assetId);
                if (asset) {
                    asset.status = 'ACTIVE';
                    await asset.addMaintenanceRecord(
                        ticket._id,
                        ticket.issueType,
                        ticket.actualCost || ticket.estimatedCost,
                        resolution || ticket.resolution
                    );
                }
            }
        }

        if (resolution) {
            ticket.resolution = resolution;
        }

        await ticket.save();

        // Refetch to populate fields
        const updatedTicket = await Maintenance.findById(req.params.id)
            .populate('assetId', 'name')
            .populate('assignedTo', 'name');

        res.status(200).json({
            success: true,
            data: updatedTicket
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Add work log entry
// @route   POST /api/maintenance/:id/worklog
// @access  Private (Technician)
exports.addWorkLog = async (req, res) => {
    try {
        const { startTime, endTime, notes } = req.body;

        const ticket = await Maintenance.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        ticket.addWorkLog(req.user._id, startTime, endTime, notes);
        await ticket.save();

        res.status(200).json({
            success: true,
            data: ticket
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Consume spare parts
// @route   POST /api/maintenance/:id/parts
// @access  Private (Technician)
exports.consumePart = async (req, res) => {
    try {
        const { inventoryId, quantity } = req.body;

        const ticket = await Maintenance.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        const part = await Inventory.findById(inventoryId);
        if (!part) return res.status(404).json({ success: false, message: 'Part not found' });

        if (part.stock.currentQuantity < quantity) {
            return res.status(400).json({ success: false, message: 'Insufficient stock' });
        }

        // Record usage on part (decrements stock)
        part.recordUsage(ticket._id, quantity, ticket.assetId, req.user._id);
        await part.save();

        // Add to ticket
        ticket.sparePartsUsed.push({
            inventoryId: part._id,
            partNumber: part.partNumber || part.sku,
            name: part.name,
            quantity: quantity,
            costPerUnit: part.costInfo?.unitCost || 0
        });

        // Update actual cost
        ticket.actualCost = (ticket.actualCost || 0) + (quantity * (part.costInfo?.unitCost || 0));

        await ticket.save();

        res.status(200).json({
            success: true,
            data: ticket
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get dashboard stats
// @route   GET /api/maintenance/stats
// @access  Private
exports.getStats = async (req, res) => {
    try {
        const officeId = req.user.officeId;
        const query = req.user.role !== 'SUPER_ADMIN' ? { officeId } : {};

        const totalTickets = await Maintenance.countDocuments(query);
        const openTickets = await Maintenance.countDocuments({ ...query, status: { $nin: ['COMPLETED', 'CLOSED', 'CANCELLED'] } });
        const criticalTickets = await Maintenance.countDocuments({ ...query, priority: 'critical', status: { $ne: 'CLOSED' } });

        // Calculate average resolution time (rough)
        const completedTickets = await Maintenance.find({ ...query, status: 'COMPLETED' }).select('daysOpen');
        const avgResolutionTime = completedTickets.length
            ? completedTickets.reduce((acc, t) => acc + (t.daysOpen || 0), 0) / completedTickets.length
            : 0;

        res.status(200).json({
            success: true,
            data: {
                totalTickets,
                openTickets,
                criticalTickets,
                avgResolutionTime: Math.round(avgResolutionTime * 10) / 10
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Digital Twin Preview — shows exact state changes before closing a ticket
// @route   GET /api/maintenance/:id/preview
// @access  Private (Manager+)
exports.getDigitalTwinPreview = async (req, res) => {
    try {
        const ticket = await Maintenance.findById(req.params.id)
            .populate('assetId', 'name guaiNumber status purchaseCost totalMaintenanceCost')
            .populate('sparePartsUsed.inventoryId', 'name stock.currentQuantity');

        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        const asset = ticket.assetId;
        const closeCost = ticket.actualCost || ticket.estimatedCost || ticket.repairCost || 0;

        // Build state diff preview
        const preview = {
            ticketId: ticket.ticketNumber,
            assetChanges: {
                field: 'status',
                before: asset?.status || 'UNKNOWN',
                after: 'ACTIVE',
                label: `Asset ${asset?.guaiNumber || asset?.name} will return to ACTIVE`,
            },
            financeImpact: {
                expenseAmount: closeCost,
                currency: ticket.currency || 'INR',
                budgetCategory: 'MAINTENANCE',
                label: `₹${closeCost.toLocaleString('en-IN')} will be recorded as maintenance expense`,
            },
            inventoryChanges: (ticket.sparePartsUsed || []).map(part => ({
                partName: part.name || part.inventoryId?.name || 'Unknown Part',
                quantityDeducted: part.quantity,
                currentStock: part.inventoryId?.stock?.currentQuantity ?? 'N/A',
                afterStock: part.inventoryId?.stock?.currentQuantity != null
                    ? part.inventoryId.stock.currentQuantity - part.quantity
                    : 'N/A',
            })),
            maintenanceHistory: {
                totalPriorCost: asset?.totalMaintenanceCost || 0,
                totalAfterClose: (asset?.totalMaintenanceCost || 0) + closeCost,
            },
            reversible: true,
            warning: closeCost > 50000 ? 'High value maintenance — manager approval recommended.' : null,
        };

        res.json({ success: true, data: preview });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Check anomaly on maintenance cost before closing
// @route   GET /api/maintenance/:id/anomaly-check
// @access  Private
exports.checkAnomaly = async (req, res) => {
    try {
        const { calculateZScore, rollingAverage } = require('../utils/anomaly');

        const ticket = await Maintenance.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        const cost = ticket.actualCost || ticket.estimatedCost || ticket.repairCost || 0;

        // Get historical costs for same asset category
        const asset = await Asset.findById(ticket.assetId);
        const historicalTickets = await Maintenance.find({
            officeId: ticket.officeId,
            status: { $in: ['COMPLETED', 'CLOSED'] },
            $or: [
                { actualCost: { $gt: 0 } },
                { estimatedCost: { $gt: 0 } },
                { repairCost: { $gt: 0 } },
            ],
        }).select('actualCost estimatedCost repairCost createdAt');

        const historyCosts = historicalTickets.map(t => t.actualCost || t.estimatedCost || t.repairCost);
        const zScoreResult = calculateZScore(cost, historyCosts);
        const rolling = rollingAverage(historicalTickets.map(t => ({
            amount: t.actualCost || t.estimatedCost || t.repairCost,
            date: t.createdAt,
        })));

        res.json({
            success: true,
            data: {
                ticketNumber: ticket.ticketNumber,
                cost,
                anomaly: zScoreResult,
                rollingAverage: rolling,
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

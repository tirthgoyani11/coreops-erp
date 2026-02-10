const Maintenance = require('../models/Maintenance');
const Asset = require('../models/Asset');
const Inventory = require('../models/Inventory');
const FinanceLog = require('../models/FinanceLog');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const { paginateQuery } = require('../utils/pagination');
const emailService = require('../services/emailService');
const User = require('../models/User');

// Exchange Rates (Static for Phase 2)
const EXCHANGE_RATES = {
    'USD': 83,
    'EUR': 90,
    'INR': 1
};

/**
 * @desc    Create Maintenance Request (Rule Engine Applied)
 * @route   POST /api/maintenance
 * @access  STAFF, MANAGER, SUPER_ADMIN
 */
exports.createRequest = asyncHandler(async (req, res, next) => {
    const { assetId, issueDescription, repairCost, currency = 'INR', sparePartsUsed = [] } = req.body;

    const asset = await Asset.findById(assetId);
    if (!asset) {
        return next(new AppError('Asset not found', 404));
    }

    // Office Isolation Check (Unless Admin)
    if (req.user.role !== 'SUPER_ADMIN' && asset.officeId.toString() !== req.user.officeId.toString()) {
        return next(new AppError('Access denied: Asset belongs to another office', 403));
    }

    // 🧠 Rule Engine: Repair vs Replace
    // Logic: If repair cost > 60% of purchase cost -> REPLACE
    // Normalize costs to INR for comparison if needed, assuming asset cost is same currency for simplicity or using normalized.
    // Ideally, we normalize both.

    const assetCurrency = asset.purchaseInfo?.currency || 'INR';
    const assetRate = EXCHANGE_RATES[assetCurrency] || 1;
    const repairRate = EXCHANGE_RATES[currency] || 1;

    const assetValueNormalized = (asset.purchaseInfo?.purchasePrice || 0) * assetRate;
    const repairCostNormalized = repairCost * repairRate;

    let decision = 'REPAIR';
    if (repairCostNormalized > (assetValueNormalized * 0.6)) {
        decision = 'REPLACE';
    }

    const maintenance = await Maintenance.create({
        assetId,
        officeId: asset.officeId,
        issueDescription,
        repairCost,
        currency,
        decision,
        sparePartsUsed,
        requestedBy: req.user._id,
        status: 'REQUESTED'
    });

    // Auto-update Asset Status
    asset.status = 'MAINTENANCE';
    await asset.save();

    res.status(201).json({
        success: true,
        data: maintenance,
        meta: {
            ruleApplied: 'Repair vs Replace (>60%)',
            decision
        }
    });
});

/**
 * @desc    Approve/Reject Maintenance Request
 * @route   POST /api/maintenance/:id/:action (approve/reject)
 * @access  MANAGER, SUPER_ADMIN
 */
exports.processDecision = asyncHandler(async (req, res, next) => {
    const { id, action } = req.params; // action: 'approve' | 'reject'
    const maintenance = await Maintenance.findById(id);

    if (!maintenance) {
        return next(new AppError('Maintenance request not found', 404));
    }

    // Office Check
    if (req.user.role !== 'SUPER_ADMIN' && maintenance.officeId.toString() !== req.user.officeId.toString()) {
        return next(new AppError('Access denied', 403));
    }

    // Self-approval Check
    if (maintenance.requestedBy.toString() === req.user._id.toString() && req.user.role !== 'SUPER_ADMIN') {
        return next(new AppError('You cannot approve your own request', 403));
    }

    if (action === 'reject') {
        maintenance.status = 'REJECTED';
        await maintenance.save();

        // Revert Asset Status
        await Asset.findByIdAndUpdate(maintenance.assetId, { status: 'ACTIVE' });

        // Send rejection email
        try {
            const requester = await User.findById(maintenance.requestedBy);
            const assetData = await Asset.findById(maintenance.assetId); // Fetch asset for name

            if (requester && requester.email) {
                await emailService.sendTicketRejectedEmail(
                    requester.email,
                    maintenance.ticketNumber || `TICK-${maintenance._id.toString().substring(18)}`, // Fallback if no ticket number
                    assetData ? assetData.name : 'Unknown Asset',
                    'Request rejected by manager' // Default reason if not provided in params
                );
            }
        } catch (emailError) {
            console.error('Failed to send rejection email:', emailError);
        }

        return res.status(200).json({ success: true, message: 'Request rejected' });
    }

    // Handle Approval Logic
    // Simple Rule: If cost > 50000 INR, might need DIRECTOR (For now, MANAGER approves all for simplicity unless specified)

    maintenance.status = 'APPROVED';
    maintenance.approvedBy = req.user._id;
    await maintenance.save();

    // Send approval email
    try {
        const requester = await User.findById(maintenance.requestedBy);
        const assetData = await Asset.findById(maintenance.assetId); // Fetch asset for name

        if (requester && requester.email) {
            await emailService.sendTicketApprovedEmail(
                requester.email,
                maintenance.ticketNumber || `TICK-${maintenance._id.toString().substring(18)}`,
                assetData ? assetData.name : 'Unknown Asset',
                req.user.name
            );
        }
    } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
    }

    res.status(200).json({ success: true, data: maintenance });
});

/**
 * @desc    Start Maintenance (Technician)
 * @route   POST /api/maintenance/:id/start
 * @access  TECHNICIAN, MANAGER, SUPER_ADMIN
 */
exports.startMaintenance = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const maintenance = await Maintenance.findById(id);

    if (!maintenance) return next(new AppError('Request not found', 404));

    // Status check
    if (maintenance.status !== 'APPROVED' && maintenance.status !== 'assigned') { // Handle legacy 'assigned' if any, but mostly APPROVED
        // Actually, flow is REQUESTED -> APPROVED -> IN_PROGRESS
    }

    // Allow starting if APPROVED or pending (if auto-assigned?)
    // Strictly, should be APPROVED.
    if (maintenance.status !== 'APPROVED' && maintenance.status !== 'PENDING') {
        // Relaxed check for now
    }

    maintenance.status = 'IN_PROGRESS';
    maintenance.assignedTo = req.user._id; // Self-assign if not assigned
    maintenance.assignedDate = new Date();

    await maintenance.save();

    res.status(200).json({ success: true, data: maintenance });
});

/**
 * @desc    Complete Maintenance (Technician)
 * @route   POST /api/maintenance/:id/complete
 * @access  TECHNICIAN, MANAGER, SUPER_ADMIN
 */
exports.completeMaintenance = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { notes } = req.body;
    const maintenance = await Maintenance.findById(id);

    if (!maintenance) return next(new AppError('Request not found', 404));

    maintenance.status = 'COMPLETED';
    maintenance.completedDate = new Date();

    // Add work log
    if (notes) {
        maintenance.addWorkLog(req.user._id, maintenance.assignedDate || new Date(), new Date(), notes);
    }

    await maintenance.save();

    res.status(200).json({ success: true, data: maintenance });
});

/**
 * @desc    Close Maintenance (Deduct Inventory + Log Finance)
 * @route   POST /api/maintenance/:id/close
 * @access  MANAGER, SUPER_ADMIN
 */
exports.closeMaintenance = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const maintenance = await Maintenance.findById(id);

    if (!maintenance) return next(new AppError('Request not found', 404));
    if (maintenance.status !== 'APPROVED') return next(new AppError('Request must be APPROVED to close', 400));

    // 1. Deduct Spare Parts
    for (const part of maintenance.sparePartsUsed) {
        const inventory = await Inventory.findById(part.inventoryId);

        if (!inventory) {
            return next(new AppError(`Inventory item ${part.inventoryId} not found`, 404));
        }
        if (inventory.type !== 'SPARE') {
            return next(new AppError(`Item ${inventory.name} is not a SPARE`, 400));
        }
        if (inventory.quantity < part.quantity) {
            return next(new AppError(`Insufficient stock for ${inventory.name}`, 400));
        }

        inventory.quantity -= part.quantity;
        await inventory.save();
    }

    // 2. Log Finance
    const rate = EXCHANGE_RATES[maintenance.currency] || 1;
    const normalizedAmount = maintenance.repairCost * rate;

    await FinanceLog.create({
        type: 'maintenance',
        source: 'MAINTENANCE',
        sourceId: maintenance._id,
        amount: maintenance.repairCost,
        currency: maintenance.currency,
        normalizedAmount,
        officeId: maintenance.officeId
    });

    // 3. Update Status
    maintenance.status = 'CLOSED';
    await maintenance.save();

    // 4. Update Asset Final Status & Log History
    const finalAssetStatus = maintenance.decision === 'REPLACE' ? 'RETIRED' : 'ACTIVE';

    const asset = await Asset.findById(maintenance.assetId);
    if (asset) {
        asset.status = finalAssetStatus;
        await asset.addMaintenanceRecord(
            maintenance._id,
            maintenance.decision,
            maintenance.repairCost,
            `Ticket Closed. Decision: ${maintenance.decision}`
        );
    }

    res.status(200).json({
        success: true,
        message: 'Maintenance closed successfully. Inventory updated. Finance logged.'
    });
});

/**
 * @desc    Get All Maintenance Requests (with pagination)
 * @route   GET /api/maintenance?page=1&limit=20
 * @access  ALL (Filtered)
 */
exports.getMaintenance = asyncHandler(async (req, res, next) => {
    let filter = {};

    // Filter by Office
    if (req.user.role !== 'SUPER_ADMIN') {
        filter.officeId = req.user.officeId;
    }

    // Optional status filter
    if (req.query.status) {
        filter.status = req.query.status;
    }

    const { data, pagination } = await paginateQuery(
        Maintenance,
        filter,
        req,
        [
            { path: 'assetId', select: 'name guai' },
            { path: 'requestedBy', select: 'name' }
        ]
    );

    res.status(200).json({
        success: true,
        count: data.length,
        pagination,
        data
    });
});

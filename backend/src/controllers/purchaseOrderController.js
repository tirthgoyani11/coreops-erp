const PurchaseOrder = require('../models/PurchaseOrder');
const Vendor = require('../models/Vendor');
const Inventory = require('../models/Inventory');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

/**
 * Purchase Order Controller
 * 
 * Handles PO creation, approval workflow, and receiving.
 */

/**
 * Get all purchase orders with filtering
 * GET /api/purchase-orders
 */
exports.getPurchaseOrders = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            vendor,
            startDate,
            endDate,
            sortBy = 'orderDate',
            sortOrder = 'desc',
        } = req.query;

        const officeFilter = req.user.role === 'SUPER_ADMIN'
            ? {}
            : { officeId: req.user.officeId };

        const query = { ...officeFilter };

        if (status) query.status = status;
        if (vendor) query.vendor = vendor;
        if (startDate || endDate) {
            query.orderDate = {};
            if (startDate) query.orderDate.$gte = new Date(startDate);
            if (endDate) query.orderDate.$lte = new Date(endDate);
        }

        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [orders, total] = await Promise.all([
            PurchaseOrder.find(query)
                .populate('vendor', 'vendorCode name')
                .populate('requestedBy', 'name email')
                .populate('approval.approvedBy', 'name')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            PurchaseOrder.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch purchase orders',
            error: error.message,
        });
    }
};

/**
 * Get single PO by ID
 * GET /api/purchase-orders/:id
 */
exports.getPurchaseOrder = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id)
            .populate('vendor', 'vendorCode name contactInfo')
            .populate('officeId', 'name code')
            .populate('requestedBy', 'name email')
            .populate('approval.approvedBy', 'name email')
            .populate('items.inventoryId', 'name sku')
            .populate('receivedItems.receivedBy', 'name');

        if (!po) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found',
            });
        }

        res.json({
            success: true,
            data: po,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch purchase order',
            error: error.message,
        });
    }
};

/**
 * Create new purchase order
 * POST /api/purchase-orders
 */
exports.createPurchaseOrder = async (req, res) => {
    try {
        const poData = {
            ...req.body,
            officeId: req.user.officeId,
            requestedBy: req.user._id,
            status: 'DRAFT',
        };

        const po = new PurchaseOrder(poData);
        await po.save();

        // Audit log
        await AuditLog.create({
            user: req.user._id,
            action: 'create_purchase_order',
            resourceType: 'PurchaseOrder',
            resourceId: po._id,
            changes: { after: po.toObject() },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
        });

        res.status(201).json({
            success: true,
            message: 'Purchase order created',
            data: po,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create purchase order',
            error: error.message,
        });
    }
};

/**
 * Update purchase order (only draft status)
 * PUT /api/purchase-orders/:id
 */
exports.updatePurchaseOrder = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id);

        if (!po) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found',
            });
        }

        if (po.status !== 'DRAFT') {
            return res.status(400).json({
                success: false,
                message: 'Only draft orders can be modified',
            });
        }

        const previousValues = po.toObject();

        // Update allowed fields
        const allowedUpdates = ['vendor', 'items', 'notes', 'expectedDeliveryDate', 'shippingAddress',
            'discountAmount', 'shippingCost', 'paymentTerms'];

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                po[field] = req.body[field];
            }
        });

        await po.save();

        // Audit log
        await AuditLog.create({
            user: req.user._id,
            action: 'update_purchase_order',
            resourceType: 'PurchaseOrder',
            resourceId: po._id,
            changes: { before: previousValues, after: po.toObject() },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
        });

        res.json({
            success: true,
            message: 'Purchase order updated',
            data: po,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update purchase order',
            error: error.message,
        });
    }
};

/**
 * Submit PO for approval
 * POST /api/purchase-orders/:id/submit
 */
exports.submitForApproval = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id);

        if (!po) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found',
            });
        }

        if (po.status !== 'DRAFT') {
            return res.status(400).json({
                success: false,
                message: 'Only draft orders can be submitted',
            });
        }

        if (!po.items || po.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot submit empty order',
            });
        }

        po.status = 'PENDING_APPROVAL';
        await po.save();

        // TODO: Notify approvers
        // await notifyApprovers(po);

        res.json({
            success: true,
            message: 'Purchase order submitted for approval',
            data: po,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to submit purchase order',
            error: error.message,
        });
    }
};

/**
 * Approve purchase order
 * POST /api/purchase-orders/:id/approve
 */
exports.approvePurchaseOrder = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id);

        if (!po) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found',
            });
        }

        if (po.status !== 'PENDING_APPROVAL') {
            return res.status(400).json({
                success: false,
                message: 'Order is not pending approval',
            });
        }

        // Check if user has approval authority
        if (!req.user.canApproveAmount(po.totalAmount)) {
            return res.status(403).json({
                success: false,
                message: 'Amount exceeds your approval limit',
            });
        }

        po.status = 'APPROVED';
        po.approval = {
            status: 'approved',
            approvedBy: req.user._id,
            approvedDate: new Date(),
            comments: req.body.comments,
        };
        await po.save();

        // Notify requester
        await Notification.create({
            recipient: po.requestedBy,
            type: 'ticket_approved',
            title: 'Purchase Order Approved',
            message: `PO ${po.poNumber} has been approved`,
        });

        res.json({
            success: true,
            message: 'Purchase order approved',
            data: po,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to approve purchase order',
            error: error.message,
        });
    }
};

/**
 * Reject purchase order
 * POST /api/purchase-orders/:id/reject
 */
exports.rejectPurchaseOrder = async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required',
            });
        }

        const po = await PurchaseOrder.findById(req.params.id);

        if (!po) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found',
            });
        }

        if (po.status !== 'PENDING_APPROVAL') {
            return res.status(400).json({
                success: false,
                message: 'Order is not pending approval',
            });
        }

        po.status = 'REJECTED';
        po.approval = {
            status: 'rejected',
            approvedBy: req.user._id,
            approvedDate: new Date(),
            rejectionReason: reason,
        };
        await po.save();

        // Notify requester
        await Notification.create({
            recipient: po.requestedBy,
            type: 'ticket_rejected',
            title: 'Purchase Order Rejected',
            message: `PO ${po.poNumber} was rejected: ${reason}`,
            priority: 'high',
        });

        res.json({
            success: true,
            message: 'Purchase order rejected',
            data: po,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to reject purchase order',
            error: error.message,
        });
    }
};

/**
 * Record items received
 * POST /api/purchase-orders/:id/receive
 */
exports.receiveItems = async (req, res) => {
    try {
        const { items } = req.body; // [{ itemIndex, quantityReceived, notes }]

        const po = await PurchaseOrder.findById(req.params.id);

        if (!po) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found',
            });
        }

        if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
            return res.status(400).json({
                success: false,
                message: 'Order must be approved to receive items',
            });
        }

        // Record received items
        for (const item of items) {
            po.receivedItems.push({
                itemIndex: item.itemIndex,
                quantityReceived: item.quantityReceived,
                receivedDate: new Date(),
                receivedBy: req.user._id,
                notes: item.notes,
            });

            // Update inventory if linked
            const orderItem = po.items[item.itemIndex];
            if (orderItem?.inventoryId) {
                await Inventory.findByIdAndUpdate(orderItem.inventoryId, {
                    $inc: { 'stock.currentQuantity': item.quantityReceived },
                });
            }
        }

        // Update status
        if (po.isFullyReceived) {
            po.status = 'RECEIVED';
        } else {
            po.status = 'PARTIALLY_RECEIVED';
        }

        await po.save();

        res.json({
            success: true,
            message: 'Items received',
            data: po,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to receive items',
            error: error.message,
        });
    }
};

/**
 * Cancel purchase order
 * POST /api/purchase-orders/:id/cancel
 */
exports.cancelPurchaseOrder = async (req, res) => {
    try {
        const { reason } = req.body;

        const po = await PurchaseOrder.findById(req.params.id);

        if (!po) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found',
            });
        }

        if (['RECEIVED', 'CANCELLED'].includes(po.status)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel this order',
            });
        }

        po.status = 'CANCELLED';
        po.notes = (po.notes || '') + `\n[CANCELLED: ${reason}]`;
        await po.save();

        res.json({
            success: true,
            message: 'Purchase order cancelled',
            data: po,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to cancel purchase order',
            error: error.message,
        });
    }
};

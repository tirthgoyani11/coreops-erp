const PurchaseOrder = require('../models/PurchaseOrder');
const Vendor = require('../models/Vendor');
const Inventory = require('../models/Inventory');
const mongoose = require('mongoose');

// @desc    Create new PO
// @route   POST /api/purchase-orders
// @access  Private
exports.createPO = async (req, res) => {
    try {
        const { vendorId, items, expectedDeliveryDate, notes } = req.body;

        const vendor = await Vendor.findById(vendorId);
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

        const po = new PurchaseOrder({
            vendorId,
            officeId: req.user.officeId,
            requestedBy: req.user._id,
            items: items.map(item => ({
                inventoryId: item.inventoryId || null,
                name: item.name,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity * item.unitPrice
            })),
            expectedDeliveryDate,
            notes,
            status: 'DRAFT'
        });

        await po.save();
        res.status(201).json({ success: true, data: po });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get all POs
// @route   GET /api/purchase-orders
// @access  Private
exports.getPOs = async (req, res) => {
    try {
        const { status, vendorId } = req.query;
        let query = {};

        if (req.user.role !== 'SUPER_ADMIN') {
            query.officeId = req.user.officeId;
        }

        if (status) query.status = status;
        if (vendorId) query.vendorId = vendorId;

        const pos = await PurchaseOrder.find(query)
            .populate('vendorId', 'name vendorCode')
            .populate('requestedBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: pos.length, data: pos });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get single PO
// @route   GET /api/purchase-orders/:id
// @access  Private
exports.getPO = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id)
            .populate('vendorId')
            .populate('requestedBy', 'name email')
            .populate('approvedBy', 'name');

        if (!po) return res.status(404).json({ success: false, message: 'PO not found' });

        res.status(200).json({ success: true, data: po });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Update PO Details or Status
// @route   PUT /api/purchase-orders/:id
// @access  Private
exports.updatePO = async (req, res) => {
    try {
        const { status, items } = req.body;
        const po = await PurchaseOrder.findById(req.params.id);

        if (!po) return res.status(404).json({ success: false, message: 'PO not found' });

        if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
            return res.status(400).json({ success: false, message: 'Cannot update finalized PO' });
        }

        // Logic for approval
        if (status === 'APPROVED' && req.user.role === 'MAINTENANCE_TECH') {
            return res.status(403).json({ success: false, message: 'Not authorized to approve' });
        }

        if (status === 'APPROVED') {
            po.approvedBy = req.user._id;
            po.approvalDate = Date.now();
        }

        if (status) po.status = status;
        // Only allow item updates if draft
        if (items && po.status === 'DRAFT') {
            po.items = items;
        }

        await po.save();
        res.status(200).json({ success: true, data: po });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Receive Goods (Update Inventory)
// @route   POST /api/purchase-orders/:id/receive
// @access  Private
exports.receiveGoods = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { receivedItems, grnReference } = req.body; // Array of { itemId, quantityReceived, bin, shelf }
        const po = await PurchaseOrder.findById(req.params.id).session(session);

        if (!po) throw new Error('PO not found');
        if (po.status !== 'ORDERED' && po.status !== 'PARTIALLY_RECEIVED') {
            throw new Error('PO is not in order status');
        }

        let allReceived = true;

        for (const rec of receivedItems) {
            // Find item in PO
            const poItem = po.items.id(rec.itemId);
            if (!poItem) continue;

            const qtyToReceive = Number(rec.quantityReceived);

            // Validate Quantity
            if (poItem.receivedQuantity + qtyToReceive > poItem.quantity) {
                throw new Error(`Cannot receive more than ordered for ${poItem.name}`);
            }

            poItem.receivedQuantity += qtyToReceive;
            if (poItem.receivedQuantity < poItem.quantity) allReceived = false;

            // Update Inventory
            if (poItem.inventoryId) {
                const inventoryItem = await Inventory.findById(poItem.inventoryId).session(session);
                if (inventoryItem) {
                    // Update location if provided
                    if (rec.bin || rec.shelf) {
                        inventoryItem.storage = { bin: rec.bin, shelf: rec.shelf };
                    }

                    // Add stock movement
                    inventoryItem.stock.currentQuantity += qtyToReceive;
                    inventoryItem.stock.lastRestockDate = Date.now();

                    inventoryItem.stockMovements.push({
                        type: 'stock_in',
                        quantity: qtyToReceive,
                        reason: 'PURCHASE_ORDER',
                        reference: po.poNumber,
                        performedBy: req.user._id,
                        date: Date.now()
                    });

                    await inventoryItem.save({ session });
                }
            }
        }

        po.status = allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
        po.deliveryDate = Date.now();
        if (grnReference) po.grnReference = grnReference;

        await po.save({ session });
        await session.commitTransaction();

        res.status(200).json({ success: true, data: po });

    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

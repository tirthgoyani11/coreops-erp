const Inventory = require('../models/Inventory');
const Office = require('../models/Office');
const mongoose = require('mongoose');

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private
exports.getInventory = async (req, res) => {
    try {
        const { type, category, lowStock, officeId } = req.query;
        let query = {};

        // Role-based filtering
        if (req.user.role !== 'SUPER_ADMIN') {
            query.officeId = req.user.officeId;
        } else if (officeId) {
            query.officeId = officeId;
        }

        if (type) query.type = type.toUpperCase();
        if (category) query.category = category;

        const items = await Inventory.find(query)
            .populate('officeId', 'name')
            .populate('vendor', 'name')
            .sort({ name: 1 });

        // Post-query filtering for low stock (virtual field)
        let results = items;
        if (lowStock === 'true') {
            results = items.filter(item => item.isLowStock);
        }

        res.status(200).json({
            success: true,
            count: results.length,
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get single inventory item
// @route   GET /api/inventory/:id
// @access  Private
exports.getItem = async (req, res) => {
    try {
        const item = await Inventory.findById(req.params.id)
            .populate('officeId', 'name')
            .populate('vendor', 'name')
            .populate('usageHistory.maintenanceTicket', 'ticketNumber')
            .populate('usageHistory.asset', 'name')
            .populate('usageHistory.technician', 'name')
            .populate('stockMovements.performedBy', 'name');

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        res.status(200).json({
            success: true,
            data: item
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Create new inventory item
// @route   POST /api/inventory
// @access  Private (Manager/Admin)
exports.createItem = async (req, res) => {
    try {
        const officeId = req.user.officeId || req.body.officeId;

        const item = new Inventory({
            ...req.body,
            officeId,
            createdBy: req.user._id
        });

        await item.save();

        res.status(201).json({
            success: true,
            data: item
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private (Manager/Admin)
exports.updateItem = async (req, res) => {
    try {
        let item = await Inventory.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        // Prevent updating stock quantity directly via update
        delete req.body.stock;
        delete req.body.quantity;

        Object.assign(item, req.body);
        await item.save();

        res.status(200).json({
            success: true,
            data: item
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Adjust stock (In/Out)
// @route   POST /api/inventory/:id/adjust
// @access  Private
exports.adjustStock = async (req, res) => {
    try {
        const { type, quantity, reason, notes, reference } = req.body;
        // type: 'stock_in' | 'stock_out' | 'adjustment'

        const item = await Inventory.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        item.recordMovement(type, Number(quantity), reference, notes || reason, req.user._id);
        await item.save();

        res.status(200).json({
            success: true,
            data: item
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Transfer stock between offices
// @route   POST /api/inventory/transfer
// @access  Private (Manager/Admin)
exports.transferStock = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { sourceItemId, targetOfficeId, quantity, notes } = req.body;

        const sourceItem = await Inventory.findById(sourceItemId).session(session);
        if (!sourceItem) throw new Error('Source item not found');

        if (sourceItem.stock.currentQuantity < quantity) {
            throw new Error('Insufficient stock for transfer');
        }

        // Deduct from source
        sourceItem.recordMovement('stock_out', quantity, 'TRANSFER', `Transfer to office ${targetOfficeId}`, req.user._id);
        await sourceItem.save({ session });

        // Find or create item in target office
        let targetItem = await Inventory.findOne({
            sku: sourceItem.sku, // Assuming SKU is unique per item type, but wait SKU is unique gloablly? 
            // SKU is generated per item. If transferring, we might match by name/partNumber + officeId
            // Or we strictly look for same 'partNumber' or 'name' in target office
            name: sourceItem.name,
            partNumber: sourceItem.partNumber,
            officeId: targetOfficeId
        }).session(session);

        if (!targetItem) {
            // Clone item for new office
            const itemData = sourceItem.toObject();
            delete itemData._id;
            delete itemData.id;
            delete itemData.officeId;
            delete itemData.stock;
            delete itemData.quantity;
            delete itemData.stockMovements;
            delete itemData.usageHistory;
            delete itemData.createdAt;
            delete itemData.updatedAt;
            delete itemData.sku; // Let it regenerate or share? Usually unique. Let it regen.

            targetItem = new Inventory({
                ...itemData,
                officeId: targetOfficeId,
                stock: { ...sourceItem.stock, currentQuantity: 0 },
                quantity: 0
            });
        }

        // Add to target
        targetItem.recordMovement('stock_in', quantity, 'TRANSFER', `Transfer from ${sourceItem.officeId}`, req.user._id);
        await targetItem.save({ session });

        await session.commitTransaction();
        res.status(200).json({
            success: true,
            message: 'Transfer successful'
        });

    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        session.endSession();
    }
};

// @desc    Get low stock items
// @route   GET /api/inventory/alerts/low-stock
// @access  Private
exports.getLowStock = async (req, res) => {
    try {
        const query = req.user.role !== 'SUPER_ADMIN' ? { officeId: req.user.officeId } : {};

        // Mongo doesn't easily query virtuals, so we fetch all valid for office and filter in JS
        // Optimization: Query where quantity < reorderPoint (heuristic) if possible, but schema structure makes it hard
        // We'll rely on the getInventory filter logic or just do it here.

        const items = await Inventory.find(query).select('name stock quantity partNumber officeId type');
        const lowStockItems = items.filter(item => item.isLowStock);

        res.status(200).json({
            success: true,
            count: lowStockItems.length,
            data: lowStockItems
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get stock valuation report
// @route   GET /api/inventory/reports/valuation
// @access  Private (Admin/Manager)
exports.getStockValuation = async (req, res) => {
    try {
        const query = req.user.role !== 'SUPER_ADMIN' ? { officeId: req.user.officeId } : {};

        const items = await Inventory.find(query);

        const valuation = items.reduce((acc, item) => {
            const val = item.totalValue || 0;
            if (item.type === 'PRODUCT') acc.products += val;
            if (item.type === 'SPARE') acc.spares += val;
            acc.total += val;
            return acc;
        }, { total: 0, products: 0, spares: 0 });

        res.status(200).json({
            success: true,
            data: {
                ...valuation,
                itemCount: items.length
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

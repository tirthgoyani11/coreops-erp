const prisma = require('../config/prisma');

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private
exports.getInventory = async (req, res) => {
    try {
        const { type, category, lowStock, officeId } = req.query;
        const where = {};

        if (req.user.role !== 'SUPER_ADMIN') {
            const oid = req.user.office?.id || req.user.officeId;
            where.officeId = typeof oid === 'object' ? oid.id : oid;
        } else if (officeId) {
            where.officeId = officeId;
        }

        if (type) where.type = type.toUpperCase();
        if (category) where.category = category;

        let items = await prisma.inventory.findMany({
            where,
            include: { stockMovements: { orderBy: { date: 'desc' }, take: 5 } },
            orderBy: { name: 'asc' },
        });

        // Post-query filtering for low stock
        if (lowStock === 'true') {
            items = items.filter(item => item.currentQuantity <= item.reorderPoint);
        }

        res.status(200).json({ success: true, count: items.length, data: items });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get single inventory item
// @route   GET /api/inventory/:id
// @access  Private
exports.getItem = async (req, res) => {
    try {
        const item = await prisma.inventory.findUnique({
            where: { id: req.params.id },
            include: {
                stockMovements: {
                    orderBy: { date: 'desc' },
                    take: 50,
                    include: { performedBy: { select: { id: true, name: true } } },
                },
                sparePartUsages: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    include: { ticket: { select: { id: true, ticketNumber: true } } },
                },
            },
        });

        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        res.status(200).json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Create new inventory item
// @route   POST /api/inventory
// @access  Private (Manager/Admin)
exports.createItem = async (req, res) => {
    try {
        const oid = req.user.office?.id || req.user.officeId || req.body.officeId;
        const resolvedOfficeId = typeof oid === 'object' ? oid.id : oid;

        const { name, type, description, sku, partNumber, category, subcategory,
            trackingType, currentQuantity, reorderPoint, reorderQuantity,
            maxQuantity, minimumQuantity, unit, costPrice, sellingPrice,
            unitCost, pricingCurrency, notes } = req.body;

        // Auto-generate SKU if not provided
        let finalSku = sku?.toUpperCase()?.trim();
        if (!finalSku) {
            const prefix = (type || 'PRODUCT') === 'PRODUCT' ? 'PRD' : 'SPR';
            const count = await prisma.inventory.count();
            finalSku = `${prefix}-${String(count + 1).padStart(5, '0')}`;
        }

        const item = await prisma.inventory.create({
            data: {
                name,
                type: type?.toUpperCase() || 'PRODUCT',
                description,
                sku: finalSku,
                partNumber,
                category,
                subcategory,
                officeId: resolvedOfficeId,
                trackingType: trackingType || 'QUANTITY',
                currentQuantity: Number(currentQuantity) || 0,
                reorderPoint: Number(reorderPoint) || 10,
                reorderQuantity: Number(reorderQuantity) || 50,
                maxQuantity: maxQuantity ? Number(maxQuantity) : null,
                minimumQuantity: Number(minimumQuantity) || 5,
                unit: unit || 'pieces',
                costPrice: costPrice ? Number(costPrice) : null,
                sellingPrice: sellingPrice ? Number(sellingPrice) : null,
                unitCost: unitCost ? Number(unitCost) : null,
                pricingCurrency: pricingCurrency || 'INR',
                notes,
            },
        });

        res.status(201).json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private (Manager/Admin)
exports.updateItem = async (req, res) => {
    try {
        const exists = await prisma.inventory.findUnique({ where: { id: req.params.id } });
        if (!exists) return res.status(404).json({ success: false, message: 'Item not found' });

        // Don't allow direct quantity changes — use adjustStock
        const { currentQuantity, ...updateData } = req.body;

        const item = await prisma.inventory.update({
            where: { id: req.params.id },
            data: updateData,
        });

        res.status(200).json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Adjust stock (In/Out)
// @route   POST /api/inventory/:id/adjust
// @access  Private
exports.adjustStock = async (req, res) => {
    try {
        const { type, quantity, reason, notes, reference } = req.body;

        const result = await prisma.$transaction(async (tx) => {
            const item = await tx.inventory.findUnique({ where: { id: req.params.id } });
            if (!item) throw new Error('Item not found');

            const qty = Number(quantity);
            let newQuantity = item.currentQuantity;

            const movementType = type.toUpperCase().replace(/[-\s]/g, '_');

            if (movementType === 'STOCK_IN') {
                newQuantity += qty;
            } else if (movementType === 'STOCK_OUT') {
                if (item.currentQuantity < qty) throw new Error('Insufficient stock');
                newQuantity -= qty;
            } else if (movementType === 'ADJUSTMENT') {
                newQuantity = qty; // Direct set
            }

            await tx.inventory.update({
                where: { id: req.params.id },
                data: { currentQuantity: newQuantity },
            });

            await tx.stockMovement.create({
                data: {
                    inventoryId: req.params.id,
                    type: movementType,
                    quantity: qty,
                    reason: notes || reason,
                    reference,
                    performedById: req.user.id,
                },
            });

            return await tx.inventory.findUnique({
                where: { id: req.params.id },
                include: { stockMovements: { orderBy: { date: 'desc' }, take: 5 } },
            });
        });

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Transfer stock between offices
// @route   POST /api/inventory/transfer
// @access  Private (Manager/Admin)
exports.transferStock = async (req, res) => {
    try {
        const { sourceItemId, targetOfficeId, quantity, notes } = req.body;

        await prisma.$transaction(async (tx) => {
            const sourceItem = await tx.inventory.findUnique({ where: { id: sourceItemId } });
            if (!sourceItem) throw new Error('Source item not found');
            if (sourceItem.currentQuantity < quantity) throw new Error('Insufficient stock for transfer');

            // Deduct from source
            await tx.inventory.update({
                where: { id: sourceItemId },
                data: { currentQuantity: { decrement: quantity } },
            });

            await tx.stockMovement.create({
                data: {
                    inventoryId: sourceItemId,
                    type: 'TRANSFER',
                    quantity,
                    reason: `Transfer to office ${targetOfficeId}`,
                    performedById: req.user.id,
                },
            });

            // Find or create item in target office
            let targetItem = await tx.inventory.findFirst({
                where: { name: sourceItem.name, officeId: targetOfficeId },
            });

            if (!targetItem) {
                const count = await tx.inventory.count();
                targetItem = await tx.inventory.create({
                    data: {
                        name: sourceItem.name,
                        type: sourceItem.type,
                        description: sourceItem.description,
                        sku: `XFER-${String(count + 1).padStart(5, '0')}`,
                        partNumber: sourceItem.partNumber,
                        category: sourceItem.category,
                        subcategory: sourceItem.subcategory,
                        officeId: targetOfficeId,
                        trackingType: sourceItem.trackingType,
                        currentQuantity: 0,
                        reorderPoint: sourceItem.reorderPoint,
                        reorderQuantity: sourceItem.reorderQuantity,
                        unit: sourceItem.unit,
                        unitCost: sourceItem.unitCost,
                        pricingCurrency: sourceItem.pricingCurrency,
                    },
                });
            }

            await tx.inventory.update({
                where: { id: targetItem.id },
                data: { currentQuantity: { increment: quantity } },
            });

            await tx.stockMovement.create({
                data: {
                    inventoryId: targetItem.id,
                    type: 'TRANSFER',
                    quantity,
                    reason: `Transfer from ${sourceItem.officeId}`,
                    performedById: req.user.id,
                },
            });
        });

        res.status(200).json({ success: true, message: 'Transfer successful' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get low stock items
// @route   GET /api/inventory/alerts/low-stock
// @access  Private
exports.getLowStock = async (req, res) => {
    try {
        const where = {};
        if (req.user.role !== 'SUPER_ADMIN') {
            const oid = req.user.office?.id || req.user.officeId;
            where.officeId = typeof oid === 'object' ? oid.id : oid;
        }

        // Prisma doesn't support field-to-field comparisons in where, so fetch and filter
        const items = await prisma.inventory.findMany({
            where,
            select: { id: true, name: true, type: true, currentQuantity: true, reorderPoint: true, partNumber: true, officeId: true },
        });

        const lowStockItems = items.filter(item => item.currentQuantity <= item.reorderPoint);

        res.status(200).json({ success: true, count: lowStockItems.length, data: lowStockItems });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get stock valuation
// @route   GET /api/inventory/reports/valuation
// @access  Private (Admin/Manager)
exports.getStockValuation = async (req, res) => {
    try {
        const where = {};
        if (req.user.role !== 'SUPER_ADMIN') {
            const oid = req.user.office?.id || req.user.officeId;
            where.officeId = typeof oid === 'object' ? oid.id : oid;
        }

        const items = await prisma.inventory.findMany({ where });

        const valuation = items.reduce((acc, item) => {
            const unitVal = item.costPrice || item.unitCost || 0;
            const val = unitVal * item.currentQuantity;
            if (item.type === 'PRODUCT') acc.products += val;
            if (item.type === 'SPARE') acc.spares += val;
            acc.total += val;
            return acc;
        }, { total: 0, products: 0, spares: 0 });

        res.status(200).json({
            success: true,
            data: { ...valuation, itemCount: items.length },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

const prisma = require('../config/prisma');
const aiService = require('../services/aiService');
const { postTransactionToGL } = require('../services/financePostingService');
const { publishEvent } = require('../coreops/eventBus');
const { evaluateEvent } = require('../coreops/automationEngine');

function resolveUserOfficeId(user) {
    const oid = user.office?.id || user.officeId;
    return typeof oid === 'object' ? oid.id : oid;
}

async function getScopedInventoryItem(id, reqUser) {
    const item = await prisma.inventory.findUnique({ where: { id } });
    if (!item) return null;
    if (reqUser.role === 'SUPER_ADMIN') return item;

    const userOfficeId = resolveUserOfficeId(reqUser);
    if (!userOfficeId || item.officeId !== userOfficeId) return null;
    return item;
}

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private
exports.getInventory = async (req, res) => {
    try {
        const { type, category, lowStock, officeId, page = 1, limit = 50 } = req.query;
        const where = {};

        const take = Math.min(parseInt(limit) || 50, 200);
        const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

        if (req.user.role !== 'SUPER_ADMIN') {
            const oid = req.user.office?.id || req.user.officeId;
            where.officeId = typeof oid === 'object' ? oid.id : oid;
        } else if (officeId) {
            where.officeId = officeId;
        }

        if (type) where.type = type.toUpperCase();
        if (category) where.category = category;

        const [items, total] = await Promise.all([
            prisma.inventory.findMany({
                where,
                include: { stockMovements: { orderBy: { date: 'desc' }, take: 5 } },
                orderBy: { name: 'asc' },
                skip,
                take,
            }),
            prisma.inventory.count({ where }),
        ]);

        // Post-query filtering for low stock (field-to-field comparison)
        const data = lowStock === 'true'
            ? items.filter(item => item.currentQuantity <= item.reorderPoint)
            : items;

        res.status(200).json({
            success: true,
            count: data.length,
            total,
            page: Math.max(parseInt(page) || 1, 1),
            totalPages: Math.ceil(total / take),
            data,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private (Admin/Manager only)
exports.deleteItem = async (req, res) => {
    try {
        const item = await getScopedInventoryItem(req.params.id, req.user);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        // Check if item has active stock movements or dependencies
        const movements = await prisma.stockMovement.count({
            where: { inventoryId: item.id },
        });

        if (movements > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete item with ${movements} stock movement(s). Archive instead.`,
            });
        }

        // Check for spare part usage
        const spareUsage = await prisma.sparePartUsage.count({
            where: { inventoryId: item.id },
        });

        if (spareUsage > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete item used in ${spareUsage} maintenance ticket(s).`,
            });
        }

        // Safe to delete
        const deleted = await prisma.$transaction(async (tx) => {
            // Delete any related serial units or batches first
            await tx.serialUnit.deleteMany({ where: { inventoryId: item.id } });
            await tx.batch.deleteMany({ where: { inventoryId: item.id } });

            // Delete the inventory item
            const result = await tx.inventory.delete({
                where: { id: item.id },
            });

            return result;
        });

        // Publish audit event
        publishEvent('INVENTORY_ITEM_DELETED', {
            itemId: deleted.id,
            sku: deleted.sku,
            name: deleted.name,
            deletedBy: req.user.id,
        });

        res.status(200).json({
            success: true,
            message: `Item "${deleted.sku}" deleted successfully`,
            data: {
                id: deleted.id,
                sku: deleted.sku,
                name: deleted.name,
            },
        });
    } catch (error) {
        // Handle constraint violations
        if (error.code === 'P2003') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete item due to existing references. Please archive instead.',
            });
        }
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

        const openingQty = Number(currentQuantity) || 0;
        const resolvedUnitCost = Number(unitCost || costPrice || 0) || 0;
        const openingStockValue = Number((openingQty * resolvedUnitCost).toFixed(2));
        const shouldCreateExpenseEntry = req.body.skipAutoExpenseEntry !== true && openingStockValue > 0;

        const item = await prisma.$transaction(async (tx) => {
            const createdItem = await tx.inventory.create({
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
                    currentQuantity: openingQty,
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

            if (openingQty > 0) {
                await tx.stockMovement.create({
                    data: {
                        inventoryId: createdItem.id,
                        type: 'STOCK_IN',
                        quantity: openingQty,
                        reason: 'Opening stock on inventory creation',
                        reference: createdItem.sku || createdItem.id,
                        performedById: req.user.id,
                    },
                });
            }

            if (shouldCreateExpenseEntry) {
                const expenseTx = await tx.transaction.create({
                    data: {
                        type: 'EXPENSE',
                        category: 'INVENTORY_PURCHASE',
                        amount: openingStockValue,
                        currency: pricingCurrency || 'INR',
                        date: new Date(),
                        description: `Inventory opening stock - ${createdItem.name} (${openingQty} ${createdItem.unit})`,
                        referenceType: 'MANUAL',
                        referenceId: createdItem.id,
                        officeId: resolvedOfficeId,
                        recordedById: req.user.id,
                        status: 'CLEARED',
                    },
                });

                await postTransactionToGL({ tx, transaction: expenseTx, userId: req.user.id });
            }

            return createdItem;
        });

        const inventoryCreatedEvent = await publishEvent('inventory.item.created', {
            inventoryId: item.id,
            name: item.name,
            officeId: item.officeId,
            openingQuantity: openingQty,
            openingValue: openingStockValue,
        }, {
            source: 'inventory.controller',
            officeId: item.officeId,
            actorId: req.user?.id || null,
        });

        await evaluateEvent(inventoryCreatedEvent, {
            source: 'inventory.controller',
            officeId: item.officeId,
            actorId: req.user?.id || null,
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

        if (!type || typeof type !== 'string') {
            return res.status(400).json({ success: false, message: 'type is required' });
        }

        if (quantity === undefined || quantity === null || Number.isNaN(Number(quantity))) {
            return res.status(400).json({ success: false, message: 'quantity must be numeric' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const item = await tx.inventory.findUnique({ where: { id: req.params.id } });
            if (!item) throw new Error('Item not found');

            const qty = Number(quantity);
            let newQuantity = item.currentQuantity;

            const movementType = type.toUpperCase().replace(/[-\s]/g, '_');

            if (Number.isNaN(qty)) {
                throw new Error('Quantity must be numeric');
            }

            if (movementType === 'ADJUSTMENT') {
                if (qty < 0) throw new Error('Adjusted stock level cannot be negative');
            } else {
                if (qty <= 0) throw new Error('Quantity must be greater than zero');
            }

            if (movementType === 'STOCK_IN') {
                newQuantity += qty;
            } else if (movementType === 'STOCK_OUT' || movementType === 'RETURN') {
                if (item.currentQuantity < qty) throw new Error('Insufficient stock');
                newQuantity -= qty;
            } else if (movementType === 'ADJUSTMENT') {
                newQuantity = qty; // Direct set
            } else {
                throw new Error('Invalid stock movement type');
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

            return {
                item: await tx.inventory.findUnique({
                    where: { id: req.params.id },
                    include: { stockMovements: { orderBy: { date: 'desc' }, take: 5 } },
                }),
                movement: {
                    type: movementType,
                    quantity: qty,
                    unitCost: Number(item.unitCost || item.costPrice || 0),
                    movementValue: Number((qty * Number(item.unitCost || item.costPrice || 0)).toFixed(2)),
                },
            };
        });

        const adjustedEvent = await publishEvent('inventory.stock.adjusted', {
            inventoryId: req.params.id,
            officeId: result.item?.officeId || null,
            movementType: result.movement.type,
            quantity: result.movement.quantity,
            unitCost: result.movement.unitCost,
            movementValue: result.movement.movementValue,
            reason: notes || reason || null,
            reference: reference || null,
        }, {
            source: 'inventory.controller',
            officeId: result.item?.officeId || null,
            actorId: req.user?.id || null,
        });

        await evaluateEvent(adjustedEvent, {
            source: 'inventory.controller',
            officeId: result.item?.officeId || null,
            actorId: req.user?.id || null,
        });

        res.status(200).json({ success: true, data: result.item });
    } catch (error) {
        const message = error?.message || 'Server Error';
        if (message === 'Item not found') {
            return res.status(404).json({ success: false, message });
        }

        if (
            message.includes('Quantity must') ||
            message.includes('Adjusted stock level') ||
            message.includes('Insufficient stock') ||
            message.includes('Invalid stock movement type')
        ) {
            return res.status(400).json({ success: false, message });
        }

        res.status(500).json({ success: false, message: 'Server Error', error: message });
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

// ─── PHASE 2: INVENTORY INTELLIGENCE ───────────────────────────

// @desc    Demand forecast for an item (next 30/60/90 days)
// @route   GET /api/inventory/forecast/:id
// @access  Private
// Algorithm: ERPNext-standard — avg daily consumption × projection period
exports.getDemandForecast = async (req, res) => {
    try {
        const item = await prisma.inventory.findUnique({ where: { id: req.params.id } });
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        // Get stock OUT movements (last 90 days for historical data)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const movements = await prisma.stockMovement.findMany({
            where: {
                inventoryId: item.id,
                type: { in: ['STOCK_OUT', 'TRANSFER'] },
                date: { gte: ninetyDaysAgo },
            },
            orderBy: { date: 'asc' },
        });

        // Calculate average daily consumption
        const totalConsumed = movements.reduce((s, m) => s + Math.abs(m.quantity), 0);
        const dayRange = movements.length > 0
            ? Math.max(1, Math.ceil((Date.now() - new Date(movements[0].date)) / (1000 * 60 * 60 * 24)))
            : 90;
        const avgDailyConsumption = totalConsumed / dayRange;

        // Projections
        const periods = [30, 60, 90];
        const forecast = periods.map(days => ({
            period: `${days} days`,
            projectedDemand: Math.round(avgDailyConsumption * days),
            currentStock: item.currentQuantity,
            stockoutDate: avgDailyConsumption > 0
                ? new Date(Date.now() + (item.currentQuantity / avgDailyConsumption) * 24 * 60 * 60 * 1000)
                : null,
            willStockOut: avgDailyConsumption > 0 && item.currentQuantity < avgDailyConsumption * days,
        }));

        // Weekly breakdown (last 12 weeks)
        const weeklyConsumption = [];
        for (let i = 11; i >= 0; i--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() - i * 7);

            const weekMoves = movements.filter(m => {
                const d = new Date(m.date);
                return d >= weekStart && d < weekEnd;
            });

            weeklyConsumption.push({
                week: `W${12 - i}`,
                startDate: weekStart,
                consumed: weekMoves.reduce((s, m) => s + Math.abs(m.quantity), 0),
            });
        }

        res.json({
            success: true,
            data: {
                item: { id: item.id, name: item.name, sku: item.sku, currentQuantity: item.currentQuantity },
                avgDailyConsumption: Math.round(avgDailyConsumption * 100) / 100,
                totalConsumedLast90Days: totalConsumed,
                forecast,
                weeklyConsumption,
                reorderRecommendation: {
                    reorderPoint: Math.round(avgDailyConsumption * 14) + (item.minimumQuantity || 5), // 2 weeks lead time + safety
                    reorderQuantity: Math.round(avgDailyConsumption * 30), // 1 month supply
                    currentReorderPoint: item.reorderPoint,
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Auto-calculated reorder points for all items
// @route   GET /api/inventory/reorder-calc
// @access  Private (Manager/Admin)
// Formula (ERPNext): reorder_level = (avg_daily_consumption × lead_time_days) + safety_stock
exports.getReorderCalc = async (req, res) => {
    try {
        const { leadTimeDays = 14 } = req.query;
        const leadTime = parseInt(leadTimeDays);

        const where = { isActive: true };
        if (req.user.role !== 'SUPER_ADMIN') {
            const oid = req.user.office?.id || req.user.officeId;
            where.officeId = typeof oid === 'object' ? oid.id : oid;
        }

        const items = await prisma.inventory.findMany({
            where,
            include: {
                stockMovements: {
                    where: {
                        type: { in: ['STOCK_OUT', 'TRANSFER'] },
                        date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
                    },
                },
            },
        });

        const recommendations = items.map(item => {
            const totalConsumed = item.stockMovements.reduce((s, m) => s + Math.abs(m.quantity), 0);
            const avgDaily = totalConsumed / 90;
            const safetyStock = item.minimumQuantity || 5;

            const recommendedReorderPoint = Math.round(avgDaily * leadTime + safetyStock);
            const recommendedReorderQty = Math.round(avgDaily * 30); // 1 month

            return {
                id: item.id,
                name: item.name,
                sku: item.sku,
                type: item.type,
                currentQuantity: item.currentQuantity,
                currentReorderPoint: item.reorderPoint,
                currentReorderQty: item.reorderQuantity,
                avgDailyConsumption: Math.round(avgDaily * 100) / 100,
                recommendedReorderPoint,
                recommendedReorderQty: Math.max(recommendedReorderQty, 1),
                needsUpdate: item.reorderPoint !== recommendedReorderPoint,
                status: item.currentQuantity <= recommendedReorderPoint ? 'REORDER_NOW' :
                    item.currentQuantity <= recommendedReorderPoint * 1.5 ? 'LOW' : 'OK',
            };
        });

        const needsReorder = recommendations.filter(r => r.status === 'REORDER_NOW');
        const needsUpdate = recommendations.filter(r => r.needsUpdate);

        res.json({
            success: true,
            data: {
                recommendations,
                summary: {
                    total: recommendations.length,
                    reorderNow: needsReorder.length,
                    lowStock: recommendations.filter(r => r.status === 'LOW').length,
                    needsConfigUpdate: needsUpdate.length,
                },
                config: { leadTimeDays: leadTime },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Consumption analytics report
// @route   GET /api/inventory/consumption-report
// @access  Private
exports.getConsumptionReport = async (req, res) => {
    try {
        const { startDate, endDate, category } = req.query;
        const now = new Date();
        const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth() - 3, 1);
        const end = endDate ? new Date(endDate) : now;

        const moveWhere = {
            type: { in: ['STOCK_OUT', 'TRANSFER'] },
            date: { gte: start, lte: end },
        };

        // Get movements with inventory info
        const movements = await prisma.stockMovement.findMany({
            where: moveWhere,
            include: {
                inventory: { select: { id: true, name: true, sku: true, category: true, type: true, unitCost: true, costPrice: true } },
            },
            orderBy: { date: 'desc' },
        });

        // Group by category
        const byCategory = {};
        for (const m of movements) {
            const cat = m.inventory?.category || 'Uncategorized';
            if (category && cat !== category) continue;

            if (!byCategory[cat]) byCategory[cat] = { quantity: 0, value: 0, items: new Set() };
            byCategory[cat].quantity += Math.abs(m.quantity);
            byCategory[cat].value += Math.abs(m.quantity) * (m.inventory?.unitCost || m.inventory?.costPrice || 0);
            byCategory[cat].items.add(m.inventory?.id);
        }

        const categoryBreakdown = Object.entries(byCategory).map(([cat, data]) => ({
            category: cat,
            totalQuantity: data.quantity,
            totalValue: Math.round(data.value * 100) / 100,
            uniqueItems: data.items.size,
        })).sort((a, b) => b.totalValue - a.totalValue);

        // Top consumers (by value)
        const byItem = {};
        for (const m of movements) {
            if (!m.inventory) continue;
            const id = m.inventory.id;
            if (!byItem[id]) byItem[id] = { ...m.inventory, quantity: 0, value: 0 };
            byItem[id].quantity += Math.abs(m.quantity);
            byItem[id].value += Math.abs(m.quantity) * (m.inventory.unitCost || m.inventory.costPrice || 0);
        }

        const topConsumers = Object.values(byItem)
            .sort((a, b) => b.value - a.value)
            .slice(0, 10)
            .map(i => ({
                id: i.id, name: i.name, sku: i.sku, category: i.category,
                totalQuantity: i.quantity,
                totalValue: Math.round(i.value * 100) / 100,
            }));

        res.json({
            success: true,
            data: {
                period: { startDate: start, endDate: end },
                totalMovements: movements.length,
                totalQuantityConsumed: movements.reduce((s, m) => s + Math.abs(m.quantity), 0),
                totalValueConsumed: Math.round(movements.reduce((s, m) =>
                    s + Math.abs(m.quantity) * (m.inventory?.unitCost || m.inventory?.costPrice || 0), 0) * 100) / 100,
                categoryBreakdown,
                topConsumers,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Unified inventory overview for command-center UI
// @route   GET /api/inventory/overview
// @access  Private
exports.getInventoryOverview = async (req, res) => {
    try {
        const where = { isActive: true };
        if (req.user.role !== 'SUPER_ADMIN') {
            const oid = req.user.office?.id || req.user.officeId;
            where.officeId = typeof oid === 'object' ? oid.id : oid;
        }

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [items, recentMovements] = await Promise.all([
            prisma.inventory.findMany({
                where,
                select: {
                    id: true,
                    type: true,
                    name: true,
                    sku: true,
                    currentQuantity: true,
                    reorderPoint: true,
                    reorderQuantity: true,
                    minimumQuantity: true,
                    unitCost: true,
                    costPrice: true,
                    pricingCurrency: true,
                    updatedAt: true,
                },
                orderBy: { updatedAt: 'desc' },
            }),
            prisma.stockMovement.findMany({
                where: {
                    date: { gte: thirtyDaysAgo },
                    inventory: where,
                },
                select: {
                    id: true,
                    type: true,
                    quantity: true,
                    date: true,
                    inventoryId: true,
                },
                orderBy: { date: 'desc' },
            }),
        ]);

        const lowStockItems = items.filter((item) => item.currentQuantity <= item.reorderPoint);
        const outOfStockItems = items.filter((item) => item.currentQuantity === 0);

        const valuationByCurrency = {};
        let totalUnits = 0;
        for (const item of items) {
            const amount = (Number(item.unitCost || item.costPrice || 0) * Number(item.currentQuantity || 0));
            const currency = String(item.pricingCurrency || 'INR').toUpperCase();
            valuationByCurrency[currency] = Number((valuationByCurrency[currency] || 0) + amount);
            totalUnits += Number(item.currentQuantity || 0);
        }

        const movementByType = recentMovements.reduce((acc, move) => {
            acc[move.type] = (acc[move.type] || 0) + 1;
            return acc;
        }, {});

        const recentConsumption = recentMovements
            .filter((m) => ['STOCK_OUT', 'TRANSFER'].includes(m.type))
            .reduce((sum, m) => sum + Math.abs(Number(m.quantity || 0)), 0);

        const topRiskItems = lowStockItems
            .map((item) => {
                const gap = Number(item.reorderPoint || 0) - Number(item.currentQuantity || 0);
                return {
                    id: item.id,
                    sku: item.sku,
                    name: item.name,
                    type: item.type,
                    currentQuantity: item.currentQuantity,
                    reorderPoint: item.reorderPoint,
                    reorderQuantity: item.reorderQuantity,
                    shortage: Math.max(0, gap),
                    recommendedOrderQty: Math.max(Number(item.reorderQuantity || 1), Math.max(0, gap)),
                };
            })
            .sort((a, b) => b.shortage - a.shortage)
            .slice(0, 10);

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalItems: items.length,
                    totalUnits,
                    lowStockCount: lowStockItems.length,
                    outOfStockCount: outOfStockItems.length,
                    lowStockRatio: items.length ? Number((lowStockItems.length / items.length).toFixed(3)) : 0,
                    valuationByCurrency,
                    movementCount30Days: recentMovements.length,
                    consumptionUnits30Days: recentConsumption,
                    movementByType,
                },
                topRiskItems,
                generatedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    AI + rule-based inventory operations brief
// @route   GET /api/inventory/insights
// @access  Private
exports.getInventoryInsights = async (req, res) => {
    try {
        const where = { isActive: true };
        if (req.user.role !== 'SUPER_ADMIN') {
            const oid = req.user.office?.id || req.user.officeId;
            where.officeId = typeof oid === 'object' ? oid.id : oid;
        }

        const items = await prisma.inventory.findMany({
            where,
            select: {
                id: true,
                name: true,
                sku: true,
                type: true,
                category: true,
                currentQuantity: true,
                reorderPoint: true,
                reorderQuantity: true,
                minimumQuantity: true,
                unitCost: true,
                costPrice: true,
                pricingCurrency: true,
            },
        });

        const riskItems = items
            .filter((i) => i.currentQuantity <= i.reorderPoint)
            .map((i) => ({
                id: i.id,
                sku: i.sku,
                name: i.name,
                type: i.type,
                category: i.category,
                currentQuantity: i.currentQuantity,
                reorderPoint: i.reorderPoint,
                reorderQuantity: i.reorderQuantity,
                shortage: Math.max(0, i.reorderPoint - i.currentQuantity),
            }))
            .sort((a, b) => b.shortage - a.shortage)
            .slice(0, 12);

        const fallback = {
            source: 'rules',
            headline: `Inventory has ${riskItems.length} item(s) below reorder level.`,
            urgency: riskItems.length > 20 ? 'CRITICAL' : riskItems.length > 8 ? 'HIGH' : riskItems.length > 0 ? 'MEDIUM' : 'LOW',
            recommendations: [
                riskItems.length > 0
                    ? `Issue replenishment orders for top ${Math.min(riskItems.length, 5)} at-risk SKU(s) today.`
                    : 'No immediate low-stock risk; maintain current replenishment cadence.',
                'Review reorder points using 30-day consumption trends every week.',
                'Escalate any out-of-stock spare impacting maintenance SLA to procurement immediately.',
            ],
            topRisks: riskItems.slice(0, 6),
            generatedAt: new Date().toISOString(),
        };

        let aiParsed = null;
        try {
            const prompt = `You are an ERP inventory operations analyst. Return strict JSON only.\nData:\n${JSON.stringify({
                inventoryCount: items.length,
                lowStockCount: riskItems.length,
                topRiskItems: riskItems.slice(0, 8),
            }, null, 2)}\nSchema:\n{\n  "headline": "string max 180 chars",\n  "urgency": "LOW|MEDIUM|HIGH|CRITICAL",\n  "recommendations": ["string","string","string"],\n  "topRisks": [{ "id": "string", "sku": "string", "name": "string", "shortage": number }]\n}\nRules:\n- concise, practical ERP language\n- recommendations must be executable\n- no markdown`;

            const result = await aiService.generateJSON('planning', prompt, {
                temperature: 0.2,
                maxTokens: 500,
            });
            if (result?.parsed && typeof result.parsed === 'object') {
                aiParsed = result.parsed;
            }
        } catch {
            aiParsed = null;
        }

        const response = {
            source: aiParsed ? 'ai+rules' : fallback.source,
            headline: typeof aiParsed?.headline === 'string' && aiParsed.headline.trim()
                ? aiParsed.headline.trim().slice(0, 180)
                : fallback.headline,
            urgency: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(String(aiParsed?.urgency || ''))
                ? String(aiParsed.urgency)
                : fallback.urgency,
            recommendations: Array.isArray(aiParsed?.recommendations) && aiParsed.recommendations.length
                ? aiParsed.recommendations.slice(0, 4)
                : fallback.recommendations,
            topRisks: Array.isArray(aiParsed?.topRisks) && aiParsed.topRisks.length
                ? aiParsed.topRisks.slice(0, 6)
                : fallback.topRisks,
            generatedAt: new Date().toISOString(),
        };

        res.status(200).json({ success: true, data: response });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    One-click reorder for at-risk item
// @route   POST /api/inventory/:id/reorder
// @access  Private (Manager/Admin)
exports.reorderFromRisk = async (req, res) => {
    try {
        const item = await getScopedInventoryItem(req.params.id, req.user);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        const inputQty = Number(req.body.quantity);
        const shortage = Math.max(0, Number(item.reorderPoint || 0) - Number(item.currentQuantity || 0));
        const suggestedQty = Math.max(Number(item.reorderQuantity || 1), shortage || 1);
        const qty = Number.isFinite(inputQty) && inputQty > 0 ? Math.round(inputQty) : Math.round(suggestedQty);

        const updated = await prisma.$transaction(async (tx) => {
            const next = await tx.inventory.update({
                where: { id: item.id },
                data: { currentQuantity: { increment: qty }, lastRestockDate: new Date() },
            });

            await tx.stockMovement.create({
                data: {
                    inventoryId: item.id,
                    type: 'STOCK_IN',
                    quantity: qty,
                    reason: 'AUTO_REORDER_TOP_RISK',
                    reference: `AUTO-REORDER-${new Date().toISOString().slice(0, 10)}`,
                    performedById: req.user.id,
                },
            });

            return next;
        });

        res.status(200).json({
            success: true,
            message: `Reorder applied: +${qty} units`,
            data: {
                id: updated.id,
                sku: updated.sku,
                name: updated.name,
                quantityAdded: qty,
                currentQuantity: updated.currentQuantity,
                reorderPoint: updated.reorderPoint,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    One-click set stock level to reorder point
// @route   POST /api/inventory/:id/fix-reorder-point
// @access  Private (Manager/Admin)
exports.fixToReorderPoint = async (req, res) => {
    try {
        const item = await getScopedInventoryItem(req.params.id, req.user);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        const target = Math.max(0, Number(item.reorderPoint || 0));
        const prev = Number(item.currentQuantity || 0);

        if (prev === target) {
            return res.status(200).json({
                success: true,
                message: 'Stock already at reorder point',
                data: {
                    id: item.id,
                    sku: item.sku,
                    currentQuantity: prev,
                    reorderPoint: target,
                    delta: 0,
                },
            });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const next = await tx.inventory.update({
                where: { id: item.id },
                data: { currentQuantity: target },
            });

            await tx.stockMovement.create({
                data: {
                    inventoryId: item.id,
                    type: 'ADJUSTMENT',
                    quantity: target,
                    reason: `FIX_TO_REORDER_POINT_FROM_${prev}`,
                    reference: `AUTO-FIX-ROP-${new Date().toISOString().slice(0, 10)}`,
                    performedById: req.user.id,
                },
            });

            return next;
        });

        res.status(200).json({
            success: true,
            message: `Stock adjusted to reorder point (${target})`,
            data: {
                id: updated.id,
                sku: updated.sku,
                name: updated.name,
                previousQuantity: prev,
                currentQuantity: updated.currentQuantity,
                reorderPoint: updated.reorderPoint,
                delta: updated.currentQuantity - prev,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Bulk route inventory items to spare parts or purchase order
// @route   POST /api/inventory/bulk-route
// @access  Private (Manager/Admin)
exports.bulkRouteItems = async (req, res) => {
    try {
        const { itemIds, destination } = req.body;

        if (!Array.isArray(itemIds) || itemIds.length === 0) {
            return res.status(400).json({ success: false, message: 'itemIds must be a non-empty array' });
        }

        if (!['SPARE', 'PURCHASE_ORDER'].includes(destination)) {
            return res.status(400).json({ success: false, message: 'destination must be SPARE or PURCHASE_ORDER' });
        }

        const userOfficeId = resolveUserOfficeId(req.user);

        // Fetch all items with office scope
        const items = await prisma.inventory.findMany({
            where: {
                id: { in: itemIds },
                ...(req.user.role !== 'SUPER_ADMIN' && { officeId: userOfficeId }),
            },
        });

        if (items.length !== itemIds.length) {
            return res.status(400).json({ success: false, message: 'Some items not found or access denied' });
        }

        let result = { routed: 0, poId: null };

        if (destination === 'SPARE') {
            // Route all selected items to spare parts type
            await prisma.inventory.updateMany({
                where: { id: { in: itemIds } },
                data: { type: 'SPARE' },
            });
            result.routed = items.length;
        } else if (destination === 'PURCHASE_ORDER') {
            // Create a purchase order for selected items
            const poNumber = `PO-${Date.now()}`;
            
            // Try to find vendor from user's primary vendor or default
            let vendorId = null;
            const vendor = await prisma.vendor.findFirst({
                where: { officeId: userOfficeId },
            });
            vendorId = vendor?.id;

            if (!vendorId) {
                // Create a placeholder vendor if none exists
                const newVendor = await prisma.vendor.create({
                    data: {
                        name: 'General Vendor',
                        vendorCode: 'GEN-001',
                        officeId: userOfficeId,
                        email: 'vendor@company.com',
                        status: 'ACTIVE',
                    },
                });
                vendorId = newVendor.id;
            }

            const poItems = items.map(item => ({
                name: item.name,
                description: item.description || null,
                quantity: item.reorderQuantity || 50,
                unitPrice: item.costPrice || item.unitCost || 100,
                totalPrice: (item.reorderQuantity || 50) * (item.costPrice || item.unitCost || 100),
                inventoryId: item.id,
            }));

            const subtotal = poItems.reduce((sum, item) => sum + item.totalPrice, 0);
            const taxAmount = Math.round(subtotal * 0.18); // 18% GST
            const totalAmount = subtotal + taxAmount;

            const po = await prisma.purchaseOrder.create({
                data: {
                    poNumber,
                    vendorId,
                    officeId: userOfficeId,
                    requestedById: req.user.id,
                    status: 'DRAFT',
                    subtotal,
                    taxAmount,
                    totalAmount,
                    items: {
                        create: poItems,
                    },
                },
                include: { items: true },
            });

            result.poId = po.id;
            result.routed = items.length;

            // Publish event for audit/workflow
            publishEvent('PURCHASE_ORDER_CREATED', {
                poId: po.id,
                poNumber: po.poNumber,
                itemCount: poItems.length,
                totalAmount,
                createdBy: req.user.id,
            });
        }

        res.status(200).json({
            success: true,
            message: `${result.routed} item(s) routed to ${destination === 'SPARE' ? 'spare parts' : 'purchase order'}`,
            data: result,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    AI multimodal processing (image + text) for inventory operations
// @route   POST /api/inventory/ai-multimodal
// @access  Private
exports.aiMultimodal = async (req, res) => {
    try {
        const { image, text } = req.body;

        if (!image && !text) {
            return res.status(400).json({ success: false, message: 'Please provide image or text input' });
        }

        const langchainService = require('../services/langchainService');
        const orchestrator = require('../services/orchestrator');

        let extractedData = null;
        let suggestion = null;
        let confidenceScore = 0.8;

        // If image is provided, perform vision analysis
        if (image) {
            try {
                const visionResult = await langchainService.processVision(image, text || 'Extract inventory data from this image');
                extractedData = visionResult.text;
            } catch (err) {
                console.error('Vision processing failed:', err);
            }
        }

        // Combine image insights with text for AI recommendation
        const prompt = `You are an inventory operations assistant. 
${extractedData ? `Image Analysis:\n${extractedData}\n\n` : ''}
User Request: ${text || 'Analyze the provided image for inventory operations'}

Based on the above, provide:
1. Summary of extracted data or observations
2. Recommended action (create item, update stock, create PO, etc.)
3. Any warnings or notes

Respond in JSON format: { "summary": "", "recommendation": "", "action": "" }`;

        // Get AI suggestion
        try {
            const aiResult = await orchestrator.processCommand(prompt, {
                userId: req.user.id,
                officeId: resolveUserOfficeId(req.user),
                role: req.user.role,
            });

            if (aiResult?.response) {
                // Try to parse structured response
                try {
                    const parsed = JSON.parse(aiResult.response);
                    suggestion = parsed.recommendation;
                    confidenceScore = 0.85;
                } catch {
                    suggestion = aiResult.response;
                }
            }
        } catch (err) {
            console.error('AI suggestion failed:', err);
            suggestion = 'Please review the extracted data and perform manual action';
        }

        res.status(200).json({
            success: true,
            data: {
                extractedData,
                suggestion,
                confidenceScore,
                source: 'multimodal-ai',
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

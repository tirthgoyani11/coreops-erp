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


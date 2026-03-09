const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

// ── Create Stocktake ───────────────────────────────────
exports.createStocktake = asyncHandler(async (req, res, next) => {
    const officeId = req.user.role === 'SUPER_ADMIN' && req.body.officeId
        ? req.body.officeId
        : req.user.officeId;

    if (!officeId) return next(new AppError('Office is required', 400));

    // Get all active inventory for the office
    const inventoryItems = await prisma.inventory.findMany({
        where: { officeId, isActive: true },
        select: { id: true, currentQuantity: true },
    });

    if (inventoryItems.length === 0) {
        return next(new AppError('No inventory items found for this office', 400));
    }

    const stocktake = await prisma.stocktake.create({
        data: {
            officeId,
            createdById: req.user.id,
            status: 'IN_PROGRESS',
            startedAt: new Date(),
            notes: req.body.notes,
            items: {
                create: inventoryItems.map(item => ({
                    inventoryId: item.id,
                    systemQuantity: item.currentQuantity,
                })),
            },
        },
        include: {
            items: {
                include: { stocktake: false },
            },
        },
    });

    logger.info(`Stocktake created for office ${officeId}: ${inventoryItems.length} items`);

    res.status(201).json({
        success: true,
        message: `Stocktake started with ${inventoryItems.length} items`,
        data: stocktake,
    });
});

// ── Get Stocktakes ─────────────────────────────────────
exports.getStocktakes = asyncHandler(async (req, res) => {
    const where = {};
    if (req.user.role !== 'SUPER_ADMIN') where.officeId = req.user.officeId;
    if (req.query.status) where.status = req.query.status;

    const stocktakes = await prisma.stocktake.findMany({
        where,
        include: {
            office: { select: { id: true, name: true } },
            _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, count: stocktakes.length, data: stocktakes });
});

// ── Get Stocktake Detail ───────────────────────────────
exports.getStocktakeDetail = asyncHandler(async (req, res, next) => {
    const stocktake = await prisma.stocktake.findUnique({
        where: { id: req.params.id },
        include: {
            office: { select: { id: true, name: true } },
            items: {
                include: {
                    stocktake: false,
                },
            },
        },
    });

    if (!stocktake) return next(new AppError('Stocktake not found', 404));

    // Enrich items with inventory details
    const inventoryIds = stocktake.items.map(i => i.inventoryId);
    const inventories = await prisma.inventory.findMany({
        where: { id: { in: inventoryIds } },
        select: { id: true, name: true, sku: true, category: true, unit: true },
    });
    const invMap = Object.fromEntries(inventories.map(i => [i.id, i]));

    const enrichedItems = stocktake.items.map(item => ({
        ...item,
        inventory: invMap[item.inventoryId] || null,
    }));

    res.status(200).json({
        success: true,
        data: { ...stocktake, items: enrichedItems },
    });
});

// ── Update Count for Item ──────────────────────────────
exports.updateCount = asyncHandler(async (req, res, next) => {
    const { itemId } = req.params;
    const { countedQuantity, notes } = req.body;

    if (countedQuantity === undefined || countedQuantity < 0) {
        return next(new AppError('Valid counted quantity required', 400));
    }

    const item = await prisma.stocktakeItem.findUnique({
        where: { id: itemId },
        include: { stocktake: true },
    });

    if (!item) return next(new AppError('Stocktake item not found', 404));
    if (item.stocktake.status !== 'IN_PROGRESS') {
        return next(new AppError('Stocktake is not in progress', 400));
    }

    const variance = Number(countedQuantity) - item.systemQuantity;

    const updated = await prisma.stocktakeItem.update({
        where: { id: itemId },
        data: {
            countedQuantity: Number(countedQuantity),
            variance,
            notes,
            countedAt: new Date(),
        },
    });

    res.status(200).json({ success: true, data: updated });
});

// ── Complete Stocktake ─────────────────────────────────
exports.completeStocktake = asyncHandler(async (req, res, next) => {
    const stocktake = await prisma.stocktake.findUnique({
        where: { id: req.params.id },
        include: { items: true },
    });

    if (!stocktake) return next(new AppError('Stocktake not found', 404));
    if (stocktake.status !== 'IN_PROGRESS') {
        return next(new AppError('Stocktake is not in progress', 400));
    }

    // Check all items are counted
    const uncounted = stocktake.items.filter(i => i.countedQuantity === null);
    if (uncounted.length > 0) {
        return next(new AppError(`${uncounted.length} items have not been counted yet`, 400));
    }

    // Create adjustment stock movements for variances
    const adjustments = [];
    for (const item of stocktake.items) {
        if (item.variance !== 0 && item.variance !== null) {
            const absQty = Math.abs(item.variance);

            await prisma.stockMovement.create({
                data: {
                    inventoryId: item.inventoryId,
                    type: 'ADJUSTMENT',
                    quantity: item.variance, // positive or negative
                    reason: `Stocktake adjustment (counted: ${item.countedQuantity}, system: ${item.systemQuantity})`,
                    reference: `ST-${stocktake.id.slice(0, 8)}`,
                    performedById: req.user.id,
                },
            });

            // Update inventory quantity to match counted
            await prisma.inventory.update({
                where: { id: item.inventoryId },
                data: { currentQuantity: item.countedQuantity },
            });

            adjustments.push({
                inventoryId: item.inventoryId,
                variance: item.variance,
            });
        }
    }

    // Mark stocktake as completed
    await prisma.stocktake.update({
        where: { id: req.params.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
    });

    logger.info(`Stocktake ${req.params.id} completed: ${adjustments.length} adjustments made`);

    res.status(200).json({
        success: true,
        message: `Stocktake completed. ${adjustments.length} inventory adjustments applied.`,
        data: { adjustments },
    });
});

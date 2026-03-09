const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

// ── Get Batches for Inventory Item ─────────────────────
exports.getBatches = asyncHandler(async (req, res) => {
    const batches = await prisma.inventoryBatch.findMany({
        where: { inventoryId: req.params.inventoryId },
        orderBy: { receivedDate: 'desc' },
    });
    res.status(200).json({ success: true, count: batches.length, data: batches });
});

// ── Create Batch (on stock-in) ─────────────────────────
exports.createBatch = asyncHandler(async (req, res, next) => {
    const { batchNumber, lotNumber, quantity, expiryDate, manufacturingDate, costPerUnit, notes } = req.body;
    const { inventoryId } = req.params;

    if (!batchNumber || !quantity) {
        return next(new AppError('Batch number and quantity are required', 400));
    }

    const inventory = await prisma.inventory.findUnique({ where: { id: inventoryId } });
    if (!inventory) return next(new AppError('Inventory item not found', 404));

    // Check unique batch number per inventory
    const existing = await prisma.inventoryBatch.findUnique({
        where: { inventoryId_batchNumber: { inventoryId, batchNumber } },
    });
    if (existing) return next(new AppError(`Batch "${batchNumber}" already exists for this item`, 409));

    const batch = await prisma.inventoryBatch.create({
        data: {
            inventoryId,
            batchNumber,
            lotNumber,
            quantity: Number(quantity),
            remainingQuantity: Number(quantity),
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
            costPerUnit: costPerUnit ? Number(costPerUnit) : null,
            notes,
        },
    });

    // Update inventory quantity
    await prisma.inventory.update({
        where: { id: inventoryId },
        data: { currentQuantity: { increment: Number(quantity) } },
    });

    // Create stock movement
    await prisma.stockMovement.create({
        data: {
            inventoryId,
            type: 'STOCK_IN',
            quantity: Number(quantity),
            reason: `Batch ${batchNumber} received`,
            reference: batchNumber,
            performedById: req.user.id,
        },
    });

    logger.info(`Batch ${batchNumber} created for inventory ${inventoryId}: qty=${quantity}`);
    res.status(201).json({ success: true, message: 'Batch created', data: batch });
});

// ── Consume from Batch (FIFO by default) ───────────────
exports.consumeBatch = asyncHandler(async (req, res, next) => {
    const { inventoryId } = req.params;
    const { quantity, reason, reference } = req.body;

    if (!quantity || quantity <= 0) return next(new AppError('Valid quantity required', 400));

    const availableBatches = await prisma.inventoryBatch.findMany({
        where: { inventoryId, status: 'AVAILABLE', remainingQuantity: { gt: 0 } },
        orderBy: { receivedDate: 'asc' }, // FIFO
    });

    let remaining = Number(quantity);
    const consumed = [];

    for (const batch of availableBatches) {
        if (remaining <= 0) break;

        const take = Math.min(remaining, batch.remainingQuantity);
        const newRemaining = batch.remainingQuantity - take;

        await prisma.inventoryBatch.update({
            where: { id: batch.id },
            data: {
                remainingQuantity: newRemaining,
                status: newRemaining === 0 ? 'CONSUMED' : 'AVAILABLE',
            },
        });

        consumed.push({ batchNumber: batch.batchNumber, consumed: take, costPerUnit: batch.costPerUnit });
        remaining -= take;
    }

    if (remaining > 0) {
        return next(new AppError(`Insufficient stock. Short by ${remaining} units.`, 400));
    }

    // Update inventory quantity
    await prisma.inventory.update({
        where: { id: inventoryId },
        data: { currentQuantity: { decrement: Number(quantity) } },
    });

    // Stock movement
    await prisma.stockMovement.create({
        data: {
            inventoryId,
            type: 'STOCK_OUT',
            quantity: Number(quantity),
            reason: reason || 'Batch consumption (FIFO)',
            reference,
            performedById: req.user.id,
        },
    });

    res.status(200).json({
        success: true,
        message: `${quantity} units consumed from ${consumed.length} batch(es)`,
        data: { consumed, totalCost: consumed.reduce((sum, c) => sum + (c.consumed * (c.costPerUnit || 0)), 0) },
    });
});

// ── Get Expiring Batches ───────────────────────────────
exports.getExpiringBatches = asyncHandler(async (req, res) => {
    const daysAhead = parseInt(req.query.days) || 30;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const where = {
        status: 'AVAILABLE',
        remainingQuantity: { gt: 0 },
        expiryDate: { lte: futureDate, gte: new Date() },
    };

    const batches = await prisma.inventoryBatch.findMany({
        where,
        include: {
            inventory: { select: { id: true, name: true, sku: true, officeId: true } },
        },
        orderBy: { expiryDate: 'asc' },
    });

    // Filter by office for non-admin
    const filtered = req.user.role === 'SUPER_ADMIN'
        ? batches
        : batches.filter(b => b.inventory.officeId === req.user.officeId);

    res.status(200).json({ success: true, count: filtered.length, data: filtered });
});

// ── Serialized Units ───────────────────────────────────
exports.getSerializedUnits = asyncHandler(async (req, res) => {
    const units = await prisma.serializedUnit.findMany({
        where: { inventoryId: req.params.inventoryId },
        orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, count: units.length, data: units });
});

exports.addSerializedUnits = asyncHandler(async (req, res, next) => {
    const { serialNumbers, batchNumber } = req.body;
    const { inventoryId } = req.params;

    if (!serialNumbers || !Array.isArray(serialNumbers) || serialNumbers.length === 0) {
        return next(new AppError('Array of serial numbers required', 400));
    }

    // Check for duplicates
    const existing = await prisma.serializedUnit.findMany({
        where: { serialNumber: { in: serialNumbers } },
        select: { serialNumber: true },
    });
    if (existing.length > 0) {
        return next(new AppError(`Serial numbers already exist: ${existing.map(e => e.serialNumber).join(', ')}`, 409));
    }

    const units = await prisma.serializedUnit.createMany({
        data: serialNumbers.map(sn => ({
            inventoryId,
            serialNumber: sn,
            batchNumber: batchNumber || null,
        })),
    });

    // Update inventory quantity
    await prisma.inventory.update({
        where: { id: inventoryId },
        data: { currentQuantity: { increment: serialNumbers.length } },
    });

    res.status(201).json({
        success: true,
        message: `${units.count} serialized units added`,
        data: { count: units.count },
    });
});

exports.issueSerializedUnit = asyncHandler(async (req, res, next) => {
    const { serialNumber, issuedToId, reason } = req.body;
    if (!serialNumber) return next(new AppError('Serial number required', 400));

    const unit = await prisma.serializedUnit.findUnique({ where: { serialNumber } });
    if (!unit) return next(new AppError('Serialized unit not found', 404));
    if (unit.status !== 'IN_STOCK') return next(new AppError(`Unit is currently ${unit.status}`, 400));

    await prisma.serializedUnit.update({
        where: { serialNumber },
        data: { status: 'ISSUED', issuedToId, issuedDate: new Date() },
    });

    await prisma.inventory.update({
        where: { id: unit.inventoryId },
        data: { currentQuantity: { decrement: 1 } },
    });

    await prisma.stockMovement.create({
        data: {
            inventoryId: unit.inventoryId,
            type: 'STOCK_OUT',
            quantity: 1,
            reason: reason || `Serialized unit ${serialNumber} issued`,
            reference: serialNumber,
            performedById: req.user.id,
        },
    });

    res.status(200).json({ success: true, message: `Unit ${serialNumber} issued` });
});

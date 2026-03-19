const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

function isBatchTableMissingError(error) {
    if (!error) return false;
    if (error.code !== 'P2021') return false;
    const msg = String(error.message || '');
    const model = String(error?.meta?.modelName || '');
    return msg.includes('InventoryBatch') || model === 'InventoryBatch';
}

// ── Get Batches for Inventory Item ─────────────────────
exports.getBatches = asyncHandler(async (req, res) => {
    try {
        const batches = await prisma.inventoryBatch.findMany({
            where: { inventoryId: req.params.inventoryId },
            orderBy: { receivedDate: 'desc' },
        });
        return res.status(200).json({ success: true, count: batches.length, data: batches });
    } catch (error) {
        if (isBatchTableMissingError(error)) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: [],
                capability: { enabled: false, reason: 'Batch tables are not initialized in this database.' },
            });
        }
        throw error;
    }
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

    let batch;
    try {
        batch = await prisma.inventoryBatch.create({
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
    } catch (error) {
        if (isBatchTableMissingError(error)) {
            return next(new AppError('Batch module is not initialized. Run database migrations for InventoryBatch first.', 503));
        }
        throw error;
    }

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

    const requestedQty = Number(quantity);
    if (!requestedQty || requestedQty <= 0) return next(new AppError('Valid quantity required', 400));

    let result;
    try {
        result = await prisma.$transaction(async (tx) => {
            const availableBatches = await tx.inventoryBatch.findMany({
                where: { inventoryId, status: 'AVAILABLE', remainingQuantity: { gt: 0 } },
                orderBy: { receivedDate: 'asc' }, // FIFO
            });

            const totalAvailable = availableBatches.reduce((sum, batch) => sum + Number(batch.remainingQuantity || 0), 0);
            if (totalAvailable < requestedQty) {
                const shortBy = requestedQty - totalAvailable;
                throw new AppError(
                    `Insufficient stock. Requested ${requestedQty}, available ${totalAvailable}. Short by ${shortBy} units.`,
                    400
                );
            }

            let remaining = requestedQty;
            const consumed = [];

            for (const batch of availableBatches) {
                if (remaining <= 0) break;

                const take = Math.min(remaining, batch.remainingQuantity);
                const newRemaining = batch.remainingQuantity - take;

                await tx.inventoryBatch.update({
                    where: { id: batch.id },
                    data: {
                        remainingQuantity: newRemaining,
                        status: newRemaining === 0 ? 'CONSUMED' : 'AVAILABLE',
                    },
                });

                consumed.push({ batchNumber: batch.batchNumber, consumed: take, costPerUnit: batch.costPerUnit });
                remaining -= take;
            }

            await tx.inventory.update({
                where: { id: inventoryId },
                data: { currentQuantity: { decrement: requestedQty } },
            });

            await tx.stockMovement.create({
                data: {
                    inventoryId,
                    type: 'STOCK_OUT',
                    quantity: requestedQty,
                    reason: reason || 'Batch consumption (FIFO)',
                    reference,
                    performedById: req.user.id,
                },
            });

            return {
                consumed,
                totalCost: consumed.reduce((sum, c) => sum + (c.consumed * (c.costPerUnit || 0)), 0),
            };
        });
    } catch (error) {
        if (isBatchTableMissingError(error)) {
            return next(new AppError('Batch module is not initialized. Run database migrations for InventoryBatch first.', 503));
        }
        throw error;
    }

    res.status(200).json({
        success: true,
        message: `${requestedQty} units consumed from ${result.consumed.length} batch(es)`,
        data: result,
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

    let batches;
    try {
        batches = await prisma.inventoryBatch.findMany({
            where,
            include: {
                inventory: { select: { id: true, name: true, sku: true, officeId: true } },
            },
            orderBy: { expiryDate: 'asc' },
        });
    } catch (error) {
        if (isBatchTableMissingError(error)) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: [],
                capability: { enabled: false, reason: 'Batch tables are not initialized in this database.' },
            });
        }
        throw error;
    }

    // Filter by office for non-admin
    const filtered = req.user.role === 'SUPER_ADMIN'
        ? batches
        : batches.filter(b => b.inventory.officeId === req.user.officeId);

    res.status(200).json({ success: true, count: filtered.length, data: filtered });
});

// ── Batch Stock Summary (available qty per inventory) ──────────
exports.getBatchStockSummary = asyncHandler(async (req, res) => {
    let batches;
    try {
        batches = await prisma.inventoryBatch.findMany({
            where: {
                status: 'AVAILABLE',
                remainingQuantity: { gt: 0 },
            },
            select: {
                inventoryId: true,
                remainingQuantity: true,
                inventory: {
                    select: {
                        id: true,
                        sku: true,
                        name: true,
                        officeId: true,
                    },
                },
            },
        });
    } catch (error) {
        if (isBatchTableMissingError(error)) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: [],
                capability: { enabled: false, reason: 'Batch tables are not initialized in this database.' },
            });
        }
        throw error;
    }

    const isSuper = req.user.role === 'SUPER_ADMIN';
    const userOfficeId = req.user.office?.id || req.user.officeId;
    const resolvedOfficeId = typeof userOfficeId === 'object' ? userOfficeId.id : userOfficeId;

    const summaryMap = new Map();
    for (const b of batches) {
        if (!isSuper && b.inventory?.officeId !== resolvedOfficeId) continue;

        if (!summaryMap.has(b.inventoryId)) {
            summaryMap.set(b.inventoryId, {
                inventoryId: b.inventoryId,
                sku: b.inventory?.sku || null,
                name: b.inventory?.name || null,
                availableQuantity: 0,
            });
        }

        const row = summaryMap.get(b.inventoryId);
        row.availableQuantity += Number(b.remainingQuantity || 0);
    }

    const data = Array.from(summaryMap.values()).sort((a, b) => b.availableQuantity - a.availableQuantity);
    res.status(200).json({ success: true, count: data.length, data });
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

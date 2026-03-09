const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

// ── Create GRN from PO ─────────────────────────────────
exports.createGRN = asyncHandler(async (req, res, next) => {
    const { purchaseOrderId, items, notes } = req.body;
    if (!purchaseOrderId || !items || items.length === 0) {
        return next(new AppError('PO ID and items required', 400));
    }

    const po = await prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        include: { items: true },
    });
    if (!po) return next(new AppError('Purchase order not found', 404));
    if (!['APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
        return next(new AppError('PO must be approved/ordered for GRN', 400));
    }

    const counter = await prisma.counter.upsert({
        where: { name: 'grn_number' }, update: { sequence: { increment: 1 } },
        create: { name: 'grn_number', prefix: 'GRN', sequence: 1 },
    });
    const grnNumber = `GRN-${String(counter.sequence).padStart(6, '0')}`;

    const grn = await prisma.goodsReceipt.create({
        data: {
            grnNumber, purchaseOrderId, receivedById: req.user.id,
            officeId: po.officeId, notes,
            items: {
                create: items.map(i => ({
                    poItemId: i.poItemId, quantityReceived: i.quantityReceived,
                    quantityAccepted: i.quantityAccepted || i.quantityReceived,
                    quantityRejected: i.quantityRejected || 0,
                    rejectionReason: i.rejectionReason, batchNumber: i.batchNumber,
                })),
            },
        },
        include: { items: true },
    });

    // Update PO item received quantities
    let allFullyReceived = true;
    for (const grnItem of items) {
        const poItem = po.items.find(p => p.id === grnItem.poItemId);
        if (poItem) {
            const newReceived = poItem.receivedQuantity + (grnItem.quantityAccepted || grnItem.quantityReceived);
            await prisma.purchaseOrderItem.update({
                where: { id: grnItem.poItemId },
                data: { receivedQuantity: newReceived },
            });
            if (newReceived < poItem.quantity) allFullyReceived = false;
        }
    }

    // Update PO status
    const newStatus = allFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
    await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: newStatus },
    });

    // Auto-update inventory for accepted items
    for (const grnItem of items) {
        const poItem = po.items.find(p => p.id === grnItem.poItemId);
        if (poItem && poItem.inventoryId && (grnItem.quantityAccepted || grnItem.quantityReceived) > 0) {
            const qty = grnItem.quantityAccepted || grnItem.quantityReceived;
            await prisma.inventory.update({
                where: { id: poItem.inventoryId },
                data: { currentQuantity: { increment: qty }, lastRestockDate: new Date() },
            });
            await prisma.stockMovement.create({
                data: {
                    inventoryId: poItem.inventoryId, type: 'STOCK_IN', quantity: qty,
                    reason: `GRN ${grnNumber} from PO ${po.poNumber}`,
                    reference: grnNumber, performedById: req.user.id,
                },
            });
        }
    }

    logger.info(`GRN ${grnNumber} created for PO ${po.poNumber}`);
    res.status(201).json({ success: true, message: `GRN ${grnNumber} created`, data: grn });
});

// ── List GRNs ──────────────────────────────────────────
exports.getGRNs = asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.purchaseOrderId) where.purchaseOrderId = req.query.purchaseOrderId;
    const grns = await prisma.goodsReceipt.findMany({
        where, include: { items: true, purchaseOrder: { select: { poNumber: true, vendorId: true } } },
        orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, count: grns.length, data: grns });
});

// ── Get GRN Detail ─────────────────────────────────────
exports.getGRNDetail = asyncHandler(async (req, res, next) => {
    const grn = await prisma.goodsReceipt.findUnique({
        where: { id: req.params.id },
        include: { items: true, purchaseOrder: { include: { items: true, vendor: { select: { name: true } } } } },
    });
    if (!grn) return next(new AppError('GRN not found', 404));
    res.status(200).json({ success: true, data: grn });
});

const prisma = require('../config/prisma');
const { postTransactionToGL } = require('../services/financePostingService');
const { publishEvent } = require('../coreops/eventBus');
const { evaluateEvent } = require('../coreops/automationEngine');

function inferInventoryType(itemName, itemDescription) {
    const txt = `${String(itemName || '')} ${String(itemDescription || '')}`.toLowerCase();
    if (/(spare|part|bearing|belt|filter|consumable|seal|bolt|nut)/.test(txt)) return 'SPARE';
    return 'PRODUCT';
}

// @desc    Create new PO
// @route   POST /api/purchase-orders
// @access  Private
exports.createPO = async (req, res) => {
    try {
        const { vendorId, items, expectedDeliveryDate, notes } = req.body;

        // Input validation
        if (!vendorId || typeof vendorId !== 'string') {
            return res.status(400).json({ success: false, message: 'vendorId is required' });
        }
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'items must be a non-empty array' });
        }
        for (const item of items) {
            if (!item.name || !item.quantity || !item.unitPrice || item.quantity <= 0 || item.unitPrice <= 0) {
                return res.status(400).json({ success: false, message: 'Each item must have name, quantity (>0), and unitPrice (>0)' });
            }
        }

        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

        // Generate PO number
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await prisma.purchaseOrder.count();
        const poNumber = `PO-${dateStr}-${String(count + 1).padStart(4, '0')}`;

        // Calculate totals
        const poItems = items.map(item => ({
            inventoryId: item.inventoryId || null,
            name: item.name,
            description: item.description || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
        }));

        const subtotal = poItems.reduce((acc, item) => acc + item.totalPrice, 0);

        // officeId is required — resolve from req.user or fetch from DB
        let officeId = req.user.office?.id || req.user.officeId;
        if (!officeId) {
            const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { officeId: true } });
            officeId = dbUser?.officeId;
        }
        if (!officeId) {
            // Fallback: use the first office
            const firstOffice = await prisma.office.findFirst({ select: { id: true } });
            officeId = firstOffice?.id;
        }
        if (!officeId) {
            return res.status(400).json({ success: false, message: 'No office found. Please assign an office to your account.' });
        }

        const po = await prisma.purchaseOrder.create({
            data: {
                poNumber,
                vendor: { connect: { id: vendorId } },
                office: { connect: { id: officeId } },
                requestedBy: { connect: { id: req.user.id } },
                expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
                notes,
                status: 'DRAFT',
                subtotal,
                totalAmount: subtotal,
                items: {
                    create: poItems,
                },
            },
            include: { items: true, vendor: { select: { id: true, name: true, vendorCode: true } } },
        });

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
        const where = {};

        if (req.user.role !== 'SUPER_ADMIN') {
            where.officeId = req.user.office?.id || req.user.officeId;
        }

        if (status) where.status = status;
        if (vendorId) where.vendorId = vendorId;

        const { page = 1, limit = 50 } = req.query;
        const take = Math.min(parseInt(limit) || 50, 200);
        const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

        const [pos, total] = await Promise.all([
            prisma.purchaseOrder.findMany({
                where,
                include: {
                    vendor: { select: { id: true, name: true, vendorCode: true } },
                    requestedBy: { select: { id: true, name: true } },
                    items: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            prisma.purchaseOrder.count({ where }),
        ]);

        res.status(200).json({
            success: true,
            count: pos.length,
            total,
            page: Math.max(parseInt(page) || 1, 1),
            totalPages: Math.ceil(total / take),
            data: pos,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get single PO
// @route   GET /api/purchase-orders/:id
// @access  Private
exports.getPO = async (req, res) => {
    try {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id: req.params.id },
            include: {
                vendor: true,
                requestedBy: { select: { id: true, name: true, email: true } },
                approvedBy: { select: { id: true, name: true } },
                items: { include: { inventory: { select: { id: true, name: true } } } },
            },
        });

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
        const po = await prisma.purchaseOrder.findUnique({
            where: { id: req.params.id },
            include: { items: true },
        });

        if (!po) return res.status(404).json({ success: false, message: 'PO not found' });

        if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
            return res.status(400).json({ success: false, message: 'Cannot update finalized PO' });
        }

        if (status === 'APPROVED' && req.user.role === 'TECHNICIAN') {
            return res.status(403).json({ success: false, message: 'Not authorized to approve' });
        }

        const updateData = {};

        if (status === 'APPROVED') {
            updateData.approvedById = req.user.id;
            updateData.approvalDate = new Date();
        }

        if (status) updateData.status = status;

        const updated = await prisma.purchaseOrder.update({
            where: { id: req.params.id },
            data: updateData,
            include: { items: true },
        });

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Approve a PO
// @route   PATCH /api/purchase-orders/:id/approve
exports.approvePO = async (req, res) => {
    try {
        const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
        if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
        if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
            return res.status(400).json({ success: false, message: 'Cannot update finalized PO' });
        }

        const updated = await prisma.purchaseOrder.update({
            where: { id: req.params.id },
            data: { status: 'APPROVED', approvedById: req.user.id, approvalDate: new Date() },
            include: { items: true },
        });

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Reject a PO
// @route   PATCH /api/purchase-orders/:id/reject
exports.rejectPO = async (req, res) => {
    try {
        const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
        if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
        if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
            return res.status(400).json({ success: false, message: 'Cannot update finalized PO' });
        }

        const updated = await prisma.purchaseOrder.update({
            where: { id: req.params.id },
            data: { status: 'REJECTED' },
            include: { items: true },
        });

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Receive Goods (Update Inventory)
// @route   POST /api/purchase-orders/:id/receive
// @access  Private
exports.receiveGoods = async (req, res) => {
    try {
        const { receivedItems, grnReference } = req.body;

        if (!Array.isArray(receivedItems) || receivedItems.length === 0) {
            return res.status(400).json({ success: false, message: 'receivedItems must be a non-empty array' });
        }

        // Use a transaction for atomicity
        const result = await prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.findUnique({
                where: { id: req.params.id },
                include: { items: true, vendor: { select: { id: true, name: true } } },
            });

            if (!po) throw new Error('PO not found');
            if (!['APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
                throw new Error('PO must be APPROVED, ORDERED, or PARTIALLY_RECEIVED to receive goods');
            }

            let allReceived = true;

            const dateToken = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const grnCount = await tx.goodsReceipt.count();
            const grnNumber = `GRN-${dateToken}-${String(grnCount + 1).padStart(4, '0')}`;

            const grn = await tx.goodsReceipt.create({
                data: {
                    grnNumber,
                    purchaseOrderId: po.id,
                    receivedById: req.user.id,
                    officeId: po.officeId,
                    status: 'DRAFT',
                    notes: grnReference || null,
                },
            });

            const createdInventoryIds = [];

            for (const rec of receivedItems) {
                const poItem = po.items.find(i => i.id === rec.itemId);
                if (!poItem) continue;

                const qtyToReceive = Number(rec.quantityReceived);
                if (!Number.isFinite(qtyToReceive) || qtyToReceive <= 0) continue;

                if (poItem.receivedQuantity + qtyToReceive > poItem.quantity) {
                    throw new Error(`Cannot receive more than ordered for ${poItem.name}`);
                }

                const newReceivedQty = poItem.receivedQuantity + qtyToReceive;
                if (newReceivedQty < poItem.quantity) allReceived = false;

                let inventoryId = poItem.inventoryId;

                // If PO line is custom (no linked inventory), create a new inventory master row so receipt is always reflected.
                if (!inventoryId) {
                    const inferredType = inferInventoryType(poItem.name, poItem.description);
                    const invCount = await tx.inventory.count();
                    const skuPrefix = inferredType === 'SPARE' ? 'SPR' : 'PRD';
                    const generatedSku = `${skuPrefix}-${String(invCount + 1).padStart(5, '0')}`;

                    const createdInventory = await tx.inventory.create({
                        data: {
                            type: inferredType,
                            name: poItem.name,
                            description: poItem.description || null,
                            sku: generatedSku,
                            category: inferredType === 'SPARE' ? 'SPARE_PARTS' : 'PROCUREMENT',
                            officeId: po.officeId,
                            trackingType: 'QUANTITY',
                            currentQuantity: 0,
                            reorderPoint: inferredType === 'SPARE' ? 5 : 10,
                            reorderQuantity: inferredType === 'SPARE' ? 20 : 50,
                            minimumQuantity: inferredType === 'SPARE' ? 2 : 5,
                            unit: 'pieces',
                            unitCost: Number(poItem.unitPrice || 0),
                            costPrice: Number(poItem.unitPrice || 0),
                            pricingCurrency: po.currency || 'INR',
                            primaryVendorId: po.vendorId,
                            storageBin: rec.bin || null,
                            storageShelf: rec.shelf || null,
                            lastPurchasePrice: Number(poItem.unitPrice || 0),
                            lastPurchaseDate: new Date(),
                            lastRestockDate: new Date(),
                            notes: `Auto-created from PO ${po.poNumber}`,
                        },
                    });

                    inventoryId = createdInventory.id;
                    createdInventoryIds.push(createdInventory.id);

                    await tx.purchaseOrderItem.update({
                        where: { id: poItem.id },
                        data: { inventoryId },
                    });
                }

                // Update PO item
                await tx.purchaseOrderItem.update({
                    where: { id: poItem.id },
                    data: { receivedQuantity: newReceivedQty },
                });

                // Update Inventory
                await tx.inventory.update({
                    where: { id: inventoryId },
                    data: {
                        currentQuantity: { increment: qtyToReceive },
                        lastRestockDate: new Date(),
                        lastPurchasePrice: Number(poItem.unitPrice || 0),
                        lastPurchaseDate: new Date(),
                        unitCost: Number(poItem.unitPrice || 0),
                        costPrice: Number(poItem.unitPrice || 0),
                        ...(rec.bin && { storageBin: rec.bin }),
                        ...(rec.shelf && { storageShelf: rec.shelf }),
                    },
                });

                await tx.stockMovement.create({
                    data: {
                        inventoryId,
                        type: 'STOCK_IN',
                        quantity: qtyToReceive,
                        reason: `PO receipt ${po.poNumber}`,
                        reference: grnNumber,
                        performedById: req.user.id,
                    },
                });

                await tx.gRNItem.create({
                    data: {
                        grnId: grn.id,
                        poItemId: poItem.id,
                        quantityReceived: qtyToReceive,
                        quantityAccepted: qtyToReceive,
                        quantityRejected: 0,
                        batchNumber: rec.batchNumber || null,
                    },
                });
            }

            // Recalculate from database to avoid stale in-memory PO items.
            const latestItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });
            allReceived = latestItems.every((item) => Number(item.receivedQuantity || 0) >= Number(item.quantity || 0));

            await tx.goodsReceipt.update({
                where: { id: grn.id },
                data: { status: allReceived ? 'ACCEPTED' : 'PARTIAL' },
            });

            const updatedPO = await tx.purchaseOrder.update({
                where: { id: req.params.id },
                data: {
                    status: allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
                    deliveryDate: new Date(),
                    grnReference: grnReference || grnNumber,
                },
                include: {
                    items: { include: { inventory: { select: { id: true, name: true, type: true, currentQuantity: true } } } },
                    vendor: { select: { id: true, name: true } },
                },
            });

            return { updatedPO, grn, createdInventoryIds };
        });

        const receiptEvent = await publishEvent('procurement.goods.received', {
            purchaseOrderId: result.updatedPO.id,
            poNumber: result.updatedPO.poNumber,
            officeId: result.updatedPO.officeId,
            vendorId: result.updatedPO.vendorId,
            vendorName: result.updatedPO.vendor?.name || null,
            grnId: result.grn.id,
            grnNumber: result.grn.grnNumber,
            status: result.updatedPO.status,
            autoCreatedInventoryIds: result.createdInventoryIds,
        }, {
            source: 'procurement.po.receive',
            officeId: result.updatedPO.officeId,
            actorId: req.user?.id || null,
        });

        await evaluateEvent(receiptEvent, {
            source: 'procurement.po.receive',
            officeId: result.updatedPO.officeId,
            actorId: req.user?.id || null,
        });

        res.status(200).json({ success: true, data: result.updatedPO, grn: result.grn });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Approve Payment (Enforce 3-Way Match)
// @route   POST /api/purchase-orders/:id/approve-payment
// @access  Private
exports.approvePayment = async (req, res) => {
    try {
        const { invoiceItems, invoiceReference } = req.body;

        if (!invoiceItems || !Array.isArray(invoiceItems)) {
            return res.status(400).json({ success: false, message: 'invoiceItems array is required for 3-way match' });
        }

        const po = await prisma.purchaseOrder.findUnique({
            where: { id: req.params.id },
            include: { items: true, vendor: true },
        });

        if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
        if (po.status !== 'RECEIVED' && po.status !== 'PARTIALLY_RECEIVED') {
            return res.status(400).json({ success: false, message: 'Cannot approve payment: Goods not received yet (GRN missing)' });
        }

        const TOLERANCES = { quantityPercent: 5, pricePercent: 2 };
        let matchFailed = false;
        let mismatchDetails = [];

        // 3-Way Match Logic
        for (const poItem of po.items) {
            const invoiceItem = invoiceItems.find(inv => inv.name?.toLowerCase() === poItem.name?.toLowerCase());

            if (!invoiceItem) {
                matchFailed = true;
                mismatchDetails.push(`Missing invoice item for PO item: ${poItem.name}`);
                continue;
            }

            // GRN vs Invoice Qty
            const invQtyDiff = Math.abs((poItem.receivedQuantity || 0) - invoiceItem.quantity);
            const invQtyPct = invoiceItem.quantity > 0 ? (invQtyDiff / invoiceItem.quantity) * 100 : 0;
            if (invQtyPct > TOLERANCES.quantityPercent) {
                matchFailed = true;
                mismatchDetails.push(`Quantity mismatch on ${poItem.name} (Received: ${poItem.receivedQuantity}, Invoiced: ${invoiceItem.quantity})`);
            }

            // PO vs Invoice Price
            const priceDiff = Math.abs(poItem.unitPrice - invoiceItem.unitPrice);
            const pricePct = poItem.unitPrice > 0 ? (priceDiff / poItem.unitPrice) * 100 : 0;
            if (pricePct > TOLERANCES.pricePercent) {
                matchFailed = true;
                mismatchDetails.push(`Price mismatch on ${poItem.name} (PO: ₹${poItem.unitPrice}, Invoiced: ₹${invoiceItem.unitPrice})`);
            }
        }

        const invoiceTotal = invoiceItems.reduce((sum, i) => sum + (i.totalPrice || i.quantity * i.unitPrice || 0), 0);

        if (matchFailed && req.user.role !== 'SUPER_ADMIN') {
            return res.status(400).json({
                success: false,
                message: '3-Way Match failed. Payment rejected.',
                mismatches: mismatchDetails
            });
        }

        // If matched (or overridden by SUPER_ADMIN), create Transaction & update PO
        const transactionResult = await prisma.$transaction(async (tx) => {
            const updatedPO = await tx.purchaseOrder.update({
                where: { id: po.id },
                data: { invoiceReference: invoiceReference || 'INV-AUTO' },
            });

            const transaction = await tx.transaction.create({
                data: {
                    type: 'EXPENSE',
                    category: 'PROCUREMENT',
                    amount: invoiceTotal,
                    description: `Payment for PO ${po.poNumber} to ${po.vendor.name}`,
                    referenceType: 'PURCHASE_ORDER',
                    referenceId: po.poNumber,
                    officeId: po.officeId,
                    recordedById: req.user.id,
                    status: 'CLEARED'
                }
            });

            await postTransactionToGL({ tx, transaction, userId: req.user.id });

            return { updatedPO, transaction };
        });

        res.status(200).json({
            success: true,
            message: matchFailed ? '3-Way Match failed, but payment approved via SUPER_ADMIN override.' : '3-Way Match successful. Payment approved.',
            data: transactionResult
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

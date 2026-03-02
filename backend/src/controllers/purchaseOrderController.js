const prisma = require('../config/prisma');

// @desc    Create new PO
// @route   POST /api/purchase-orders
// @access  Private
exports.createPO = async (req, res) => {
    try {
        const { vendorId, items, expectedDeliveryDate, notes } = req.body;

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

        const pos = await prisma.purchaseOrder.findMany({
            where,
            include: {
                vendor: { select: { id: true, name: true, vendorCode: true } },
                requestedBy: { select: { id: true, name: true } },
                items: true,
            },
            orderBy: { createdAt: 'desc' },
        });

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

// @desc    Receive Goods (Update Inventory)
// @route   POST /api/purchase-orders/:id/receive
// @access  Private
exports.receiveGoods = async (req, res) => {
    try {
        const { receivedItems, grnReference } = req.body;

        // Use a transaction for atomicity
        const result = await prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.findUnique({
                where: { id: req.params.id },
                include: { items: true },
            });

            if (!po) throw new Error('PO not found');
            if (po.status !== 'ORDERED' && po.status !== 'PARTIALLY_RECEIVED') {
                throw new Error('PO is not in order status');
            }

            let allReceived = true;

            for (const rec of receivedItems) {
                const poItem = po.items.find(i => i.id === rec.itemId);
                if (!poItem) continue;

                const qtyToReceive = Number(rec.quantityReceived);

                if (poItem.receivedQuantity + qtyToReceive > poItem.quantity) {
                    throw new Error(`Cannot receive more than ordered for ${poItem.name}`);
                }

                const newReceivedQty = poItem.receivedQuantity + qtyToReceive;
                if (newReceivedQty < poItem.quantity) allReceived = false;

                // Update PO item
                await tx.purchaseOrderItem.update({
                    where: { id: poItem.id },
                    data: { receivedQuantity: newReceivedQty },
                });

                // Update Inventory
                if (poItem.inventoryId) {
                    await tx.inventory.update({
                        where: { id: poItem.inventoryId },
                        data: {
                            currentQuantity: { increment: qtyToReceive },
                            lastRestockDate: new Date(),
                            ...(rec.bin && { storageBin: rec.bin }),
                            ...(rec.shelf && { storageShelf: rec.shelf }),
                        },
                    });

                    await tx.stockMovement.create({
                        data: {
                            inventoryId: poItem.inventoryId,
                            type: 'STOCK_IN',
                            quantity: qtyToReceive,
                            reason: 'PURCHASE_ORDER',
                            reference: po.poNumber,
                            performedById: req.user.id,
                        },
                    });
                }
            }

            const updatedPO = await tx.purchaseOrder.update({
                where: { id: req.params.id },
                data: {
                    status: allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
                    deliveryDate: new Date(),
                    ...(grnReference && { grnReference }),
                },
                include: { items: true },
            });

            return updatedPO;
        });

        res.status(200).json({ success: true, data: result });
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

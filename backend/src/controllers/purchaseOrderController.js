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

        const po = await prisma.purchaseOrder.create({
            data: {
                poNumber,
                vendorId,
                officeId: req.user.office?.id || req.user.officeId,
                requestedById: req.user.id,
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

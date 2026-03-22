const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const { postARInvoiceToGL } = require('../services/financePostingService');

function resolveOfficeId(value) {
    if (!value) return null;
    if (typeof value === 'object' && value.id) return value.id;
    return value;
}

exports.createSalesOrder = asyncHandler(async (req, res, next) => {
    const { customerId, quotationId, expectedDelivery, notes, items } = req.body;
    const officeId = resolveOfficeId(req.user?.officeId || req.body.officeId);

    if (!officeId || !customerId || !items || !items.length) {
        return next(new AppError('Missing required fields or items', 400));
    }

    let totalAmount = 0;
    const soItems = items.map(item => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const discount = Number(item.discount || 0);
        if (quantity <= 0 || unitPrice < 0 || discount < 0) {
            throw new AppError('Invalid item quantity, price, or discount', 400);
        }
        const total = (quantity * unitPrice) - discount;
        totalAmount += total;
        return {
            inventoryId: item.inventoryId,
            description: item.description,
            quantity,
            unitPrice,
            discount,
            total
        };
    });

    const orderNumber = `SO-${Date.now().toString().slice(-6)}`;

    // Create SO
    const salesOrder = await prisma.salesOrder.create({
        data: {
            orderNumber,
            customerId,
            officeId,
            quotationId,
            expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
            notes,
            totalAmount,
            createdById: req.user.id,
            items: { create: soItems }
        },
        include: { items: true, customer: true }
    });

    // If Quotation provided, update its status
    if (quotationId) {
        await prisma.quotation.update({
            where: { id: quotationId },
            data: { status: 'ACCEPTED' }
        });
    }

    res.status(201).json({ success: true, data: salesOrder });
});

exports.getSalesOrders = asyncHandler(async (req, res, next) => {
    const officeId = resolveOfficeId(req.user?.officeId || req.query.officeId);
    
    const orders = await prisma.salesOrder.findMany({
        where: { ...(officeId && { officeId }) },
        include: { customer: true },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, count: orders.length, data: orders });
});

exports.getSalesOrder = asyncHandler(async (req, res, next) => {
    const order = await prisma.salesOrder.findUnique({
        where: { id: req.params.id },
        include: { items: true, customer: true, arInvoices: true }
    });
    if (!order) return next(new AppError('Sales Order not found', 404));
    res.status(200).json({ success: true, data: order });
});

exports.fulfillSalesOrder = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const order = await prisma.salesOrder.findUnique({
        where: { id },
        include: { items: true, arInvoices: { select: { id: true } } }
    });

    if (!order) return next(new AppError('Sales Order not found', 404));
    if (order.status === 'DELIVERED') return next(new AppError('Order already fulfilled', 400));
    if (order.arInvoices?.length) return next(new AppError('AR invoice already generated for this order', 400));

    const { updatedOrder, invoice } = await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
            if (!item.inventoryId) continue;

            const inventory = await tx.inventory.findUnique({
                where: { id: item.inventoryId },
                select: { id: true, currentQuantity: true, name: true },
            });

            if (!inventory) {
                throw new AppError(`Inventory item not found: ${item.inventoryId}`, 404);
            }

            if (Number(inventory.currentQuantity || 0) < Number(item.quantity || 0)) {
                throw new AppError(`Insufficient stock for ${inventory.name || 'item'} (${inventory.id})`, 400);
            }

            await tx.inventory.update({
                where: { id: item.inventoryId },
                data: { currentQuantity: { decrement: item.quantity } }
            });

            await tx.stockMovement.create({
                data: {
                    inventoryId: item.inventoryId,
                    type: 'STOCK_OUT',
                    quantity: item.quantity,
                    reason: 'Sales Order Fulfillment',
                    reference: order.orderNumber,
                    performedById: req.user.id
                }
            });
        }

        const updatedOrder = await tx.salesOrder.update({
            where: { id },
            data: { status: 'DELIVERED', shippedDate: new Date() }
        });

        const invoice = await tx.aRInvoice.create({
            data: {
                invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                salesOrderId: id,
                customerId: order.customerId,
                officeId: order.officeId,
                status: 'ISSUED',
                totalAmount: order.totalAmount,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });

        await postARInvoiceToGL({ tx, invoice, userId: req.user.id });

        return { updatedOrder, invoice };
    });

    res.status(200).json({ success: true, data: updatedOrder, invoiceGenerated: invoice });
});

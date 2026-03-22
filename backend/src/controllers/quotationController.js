const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');

function resolveOfficeId(value) {
    if (!value) return null;
    if (typeof value === 'object' && value.id) return value.id;
    return value;
}

exports.createQuotation = asyncHandler(async (req, res, next) => {
    const { customerId, validUntil, notes, items } = req.body;
    const officeId = resolveOfficeId(req.user?.officeId || req.body.officeId);

    if (!officeId || !customerId || !items || !items.length) {
        return next(new AppError('Missing required fields or items', 400));
    }

    let totalAmount = 0;
    const quotationItems = items.map(item => {
        const total = (item.quantity * item.unitPrice) - (item.discount || 0);
        totalAmount += total;
        return {
            inventoryId: item.inventoryId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            total
        };
    });

    const quoteNumber = `QT-${Date.now().toString().slice(-6)}`;

    const quotation = await prisma.quotation.create({
        data: {
            quotationNumber: quoteNumber,
            customerId,
            officeId,
            validUntil: validUntil ? new Date(validUntil) : null,
            notes,
            totalAmount,
            createdById: req.user.id,
            items: { create: quotationItems }
        },
        include: { items: true, customer: true }
    });

    res.status(201).json({ success: true, data: quotation });
});

exports.getQuotations = asyncHandler(async (req, res, next) => {
    const officeId = resolveOfficeId(req.user?.officeId || req.query.officeId);
    
    const quotations = await prisma.quotation.findMany({
        where: { ...(officeId && { officeId }) },
        include: { customer: true },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, count: quotations.length, data: quotations });
});

exports.getQuotation = asyncHandler(async (req, res, next) => {
    const quotation = await prisma.quotation.findUnique({
        where: { id: req.params.id },
        include: { items: true, customer: true }
    });
    if (!quotation) return next(new AppError('Quotation not found', 404));
    res.status(200).json({ success: true, data: quotation });
});

exports.updateQuotationStatus = asyncHandler(async (req, res, next) => {
    const { status } = req.body;
    const quotation = await prisma.quotation.update({
        where: { id: req.params.id },
        data: { status }
    });
    res.status(200).json({ success: true, data: quotation });
});

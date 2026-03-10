const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

// ── Create RFQ ─────────────────────────────────────────
exports.createRFQ = asyncHandler(async (req, res, next) => {
    const { title, description, items, requiredByDate } = req.body;
    if (!title || !items || items.length === 0) return next(new AppError('Title and items required', 400));

    const officeId = req.user.role === 'SUPER_ADMIN' && req.body.officeId ? req.body.officeId : req.user.officeId;
    const counter = await prisma.counter.upsert({
        where: { name: 'rfq_number' }, update: { sequence: { increment: 1 } },
        create: { name: 'rfq_number', prefix: 'RFQ', sequence: 1 },
    });
    const rfqNumber = `RFQ-${String(counter.sequence).padStart(6, '0')}`;

    const rfq = await prisma.rFQ.create({
        data: {
            rfqNumber, title, description, officeId, createdById: req.user.id,
            requiredByDate: requiredByDate ? new Date(requiredByDate) : null,
            items: { create: items.map(i => ({ description: i.description, quantity: i.quantity, unit: i.unit || 'pieces', specs: i.specs })) },
        },
        include: { items: true },
    });

    res.status(201).json({ success: true, message: `RFQ ${rfqNumber} created`, data: rfq });
});

// ── List RFQs ──────────────────────────────────────────
exports.getRFQs = asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const rfqs = await prisma.rFQ.findMany({
        where, include: { items: true, quotations: true, _count: { select: { quotations: true } } },
        orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, count: rfqs.length, data: rfqs });
});

// ── Get RFQ Detail ─────────────────────────────────────
exports.getRFQDetail = asyncHandler(async (req, res, next) => {
    const rfq = await prisma.rFQ.findUnique({
        where: { id: req.params.id },
        include: { items: true, quotations: true },
    });
    if (!rfq) return next(new AppError('RFQ not found', 404));
    res.status(200).json({ success: true, data: rfq });
});

// ── Submit Quotation ───────────────────────────────────
exports.submitQuotation = asyncHandler(async (req, res, next) => {
    const { vendorId, totalAmount, items, validUntil, currency } = req.body;
    if (!vendorId || !totalAmount) return next(new AppError('Vendor and total amount required', 400));

    const rfq = await prisma.rFQ.findUnique({ where: { id: req.params.id } });
    if (!rfq) return next(new AppError('RFQ not found', 404));
    if (rfq.status === 'AWARDED') return next(new AppError('RFQ already awarded', 400));

    const quotation = await prisma.vendorQuotation.create({
        data: {
            rfqId: req.params.id, vendorId, totalAmount: Number(totalAmount),
            currency: currency || 'INR', items: items || null,
            validUntil: validUntil ? new Date(validUntil) : null,
        },
    });

    // Auto-update RFQ status to SENT if DRAFT
    if (rfq.status === 'DRAFT') {
        await prisma.rFQ.update({ where: { id: req.params.id }, data: { status: 'SENT' } });
    }

    res.status(201).json({ success: true, message: 'Quotation submitted', data: quotation });
});

// ── Compare Quotations ─────────────────────────────────
exports.compareQuotations = asyncHandler(async (req, res, next) => {
    const rfq = await prisma.rFQ.findUnique({
        where: { id: req.params.id },
        include: { items: true, quotations: true },
    });
    if (!rfq) return next(new AppError('RFQ not found', 404));

    // Get vendor details
    const vendorIds = rfq.quotations.map(q => q.vendorId);
    const vendors = await prisma.vendor.findMany({
        where: { id: { in: vendorIds } },
        select: { id: true, name: true, rating: true, isBlacklisted: true },
    });
    const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]));

    const comparison = rfq.quotations
        .sort((a, b) => a.totalAmount - b.totalAmount)
        .map((q, idx) => ({
            rank: idx + 1, ...q,
            vendor: vendorMap[q.vendorId] || { name: 'Unknown' },
            priceDiffFromLowest: idx > 0 ? q.totalAmount - rfq.quotations[0].totalAmount : 0,
        }));

    res.status(200).json({ success: true, data: { rfq: { id: rfq.id, title: rfq.title, items: rfq.items }, comparison } });
});

// ── Award RFQ ──────────────────────────────────────────
exports.awardRFQ = asyncHandler(async (req, res, next) => {
    const { quotationId } = req.body;
    const rfq = await prisma.rFQ.findUnique({ where: { id: req.params.id }, include: { quotations: true, items: true } });
    if (!rfq) return next(new AppError('RFQ not found', 404));

    const winningQuote = rfq.quotations.find(q => q.id === quotationId);
    if (!winningQuote) return next(new AppError('Quotation not found', 404));

    // Accept winner, reject others
    await prisma.vendorQuotation.update({ where: { id: quotationId }, data: { status: 'ACCEPTED' } });
    await prisma.vendorQuotation.updateMany({
        where: { rfqId: req.params.id, id: { not: quotationId } },
        data: { status: 'REJECTED' },
    });

    // Award RFQ
    await prisma.rFQ.update({
        where: { id: req.params.id },
        data: { status: 'AWARDED', awardedVendorId: winningQuote.vendorId },
    });

    // Auto-create PO from awarded quotation
    const counter = await prisma.counter.upsert({
        where: { name: 'po_number' }, update: { sequence: { increment: 1 } },
        create: { name: 'po_number', prefix: 'PO', sequence: 1 },
    });
    const poNumber = `PO-${String(counter.sequence).padStart(6, '0')}`;

    const po = await prisma.purchaseOrder.create({
        data: {
            poNumber, vendorId: winningQuote.vendorId, officeId: rfq.officeId,
            requestedById: req.user.id, status: 'DRAFT',
            totalAmount: winningQuote.totalAmount, subtotal: winningQuote.totalAmount,
            notes: `From RFQ ${rfq.rfqNumber}`,
            items: {
                create: rfq.items.map((i, index) => {
                    // Try to map unit price from the JSON items array in winningQuote
                    const quoteItem = winningQuote.items && Array.isArray(winningQuote.items) ? winningQuote.items[index] : null;
                    const unitPrice = quoteItem?.unitPrice ? Number(quoteItem.unitPrice) : (winningQuote.totalAmount / rfq.items.length);
                    const qty = i.quantity || 1;
                    return {
                        name: i.description,
                        quantity: qty,
                        unitPrice: unitPrice,
                        totalPrice: unitPrice * qty
                    };
                })
            },
        },
    });

    res.status(200).json({ success: true, message: `RFQ awarded. PO ${poNumber} created.`, data: { rfq: { status: 'AWARDED' }, po } });
});

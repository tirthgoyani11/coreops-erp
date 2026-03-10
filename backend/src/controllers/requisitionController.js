const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

// ── Create PR ──────────────────────────────────────────
exports.createRequisition = asyncHandler(async (req, res, next) => {
    const { items, justification, priority, requiredByDate } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return next(new AppError('At least one item is required', 400));
    }

    const officeId = req.user.role === 'SUPER_ADMIN' && req.body.officeId ? req.body.officeId : req.user.officeId;
    if (!officeId) return next(new AppError('Office is required', 400));

    const counter = await prisma.counter.upsert({
        where: { name: 'pr_number' }, update: { sequence: { increment: 1 } },
        create: { name: 'pr_number', prefix: 'PR', sequence: 1 },
    });
    const prNumber = `PR-${String(counter.sequence).padStart(6, '0')}`;

    const totalEstimate = items.reduce((sum, i) => sum + ((i.quantity || 0) * (i.estimatedPrice || 0)), 0);

    const pr = await prisma.purchaseRequisition.create({
        data: {
            prNumber, requestedById: req.user.id, officeId,
            justification, priority: priority || 'MEDIUM',
            requiredByDate: requiredByDate ? new Date(requiredByDate) : null,
            totalEstimate,
            items: { create: items.map(i => ({ description: i.description, quantity: i.quantity, estimatedPrice: i.estimatedPrice, inventoryId: i.inventoryId, suggestedVendorId: i.suggestedVendorId, notes: i.notes })) },
        },
        include: { items: true },
    });

    res.status(201).json({ success: true, message: `Purchase requisition ${prNumber} created`, data: pr });
});

// ── List PRs ───────────────────────────────────────────
exports.getRequisitions = asyncHandler(async (req, res) => {
    const where = {};
    if (req.user.role !== 'SUPER_ADMIN') where.officeId = req.user.officeId;
    if (req.query.status) where.status = req.query.status;

    const prs = await prisma.purchaseRequisition.findMany({
        where, include: { items: true, requestedBy: { select: { name: true } }, _count: { select: { items: true } } },
        orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, count: prs.length, data: prs });
});

// ── Approve / Reject PR ────────────────────────────────
exports.approveRequisition = asyncHandler(async (req, res, next) => {
    const { decision } = req.body; // 'APPROVED' or 'REJECTED'
    const pr = await prisma.purchaseRequisition.findUnique({ where: { id: req.params.id } });
    if (!pr) return next(new AppError('Requisition not found', 404));
    if (pr.status !== 'SUBMITTED') return next(new AppError('PR must be submitted to approve', 400));

    await prisma.purchaseRequisition.update({
        where: { id: req.params.id },
        data: { status: decision, approvedById: req.user.id, approvalDate: new Date() },
    });
    res.status(200).json({ success: true, message: `PR ${decision.toLowerCase()}` });
});

// ── Submit PR ──────────────────────────────────────────
exports.submitRequisition = asyncHandler(async (req, res, next) => {
    const pr = await prisma.purchaseRequisition.findUnique({ where: { id: req.params.id } });
    if (!pr) return next(new AppError('Requisition not found', 404));
    if (pr.status !== 'DRAFT') return next(new AppError('Only draft PRs can be submitted', 400));

    await prisma.purchaseRequisition.update({ where: { id: req.params.id }, data: { status: 'SUBMITTED' } });
    res.status(200).json({ success: true, message: 'PR submitted for approval' });
});

// ── Convert PR to PO ──────────────────────────────────
exports.convertToPO = asyncHandler(async (req, res, next) => {
    const { vendorId } = req.body;
    const pr = await prisma.purchaseRequisition.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!pr) return next(new AppError('Requisition not found', 404));
    if (pr.status !== 'APPROVED') return next(new AppError('Only approved PRs can be converted', 400));
    if (!vendorId) return next(new AppError('Vendor ID is required', 400));

    const counter = await prisma.counter.upsert({
        where: { name: 'po_number' }, update: { sequence: { increment: 1 } },
        create: { name: 'po_number', prefix: 'PO', sequence: 1 },
    });
    const poNumber = `PO-${String(counter.sequence).padStart(6, '0')}`;

    const poItems = pr.items.map(i => ({
        name: i.description, description: i.notes, quantity: i.quantity,
        unitPrice: i.estimatedPrice || 0, totalPrice: i.quantity * (i.estimatedPrice || 0),
        inventoryId: i.inventoryId,
    }));

    const po = await prisma.purchaseOrder.create({
        data: {
            poNumber, vendorId, officeId: pr.officeId, requestedById: req.user.id,
            status: 'DRAFT', subtotal: pr.totalEstimate,
            totalAmount: pr.totalEstimate, notes: `Converted from PR ${pr.prNumber}`,
            items: { create: poItems },
        },
    });

    await prisma.purchaseRequisition.update({
        where: { id: req.params.id },
        data: { status: 'CONVERTED', convertedToPOId: po.id },
    });

    res.status(201).json({ success: true, message: `PO ${poNumber} created from PR ${pr.prNumber}`, data: po });
});

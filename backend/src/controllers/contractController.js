const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

// ── Create Contract ────────────────────────────────────
exports.createContract = asyncHandler(async (req, res, next) => {
    const { vendorId, type, startDate, endDate, value, currency, renewalType, terms, reminderDays } = req.body;
    if (!vendorId || !type || !startDate || !endDate) {
        return next(new AppError('Vendor, type, start date, and end date are required', 400));
    }

    const officeId = req.user.role === 'SUPER_ADMIN' && req.body.officeId ? req.body.officeId : req.user.officeId;

    const counter = await prisma.counter.upsert({
        where: { name: 'contract_number' }, update: { sequence: { increment: 1 } },
        create: { name: 'contract_number', prefix: 'CON', sequence: 1 },
    });
    const contractNumber = `CON-${String(counter.sequence).padStart(6, '0')}`;

    const contract = await prisma.vendorContract.create({
        data: {
            contractNumber, vendorId, officeId, type,
            startDate: new Date(startDate), endDate: new Date(endDate),
            value: value ? Number(value) : null, currency: currency || 'INR',
            renewalType: renewalType || 'MANUAL', terms,
            reminderDays: reminderDays || 30,
        },
    });

    res.status(201).json({ success: true, message: `Contract ${contractNumber} created`, data: contract });
});

// ── List Contracts ─────────────────────────────────────
exports.getContracts = asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.vendorId) where.vendorId = req.query.vendorId;

    const contracts = await prisma.vendorContract.findMany({
        where, orderBy: { endDate: 'asc' },
    });

    // Get vendor names
    const vendorIds = [...new Set(contracts.map(c => c.vendorId))];
    const vendors = await prisma.vendor.findMany({
        where: { id: { in: vendorIds } }, select: { id: true, name: true },
    });
    const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v.name]));

    const enriched = contracts.map(c => ({ ...c, vendorName: vendorMap[c.vendorId] || 'Unknown' }));
    res.status(200).json({ success: true, count: enriched.length, data: enriched });
});

// ── Update Contract ────────────────────────────────────
exports.updateContract = asyncHandler(async (req, res, next) => {
    const existing = await prisma.vendorContract.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(new AppError('Contract not found', 404));

    const data = {};
    const fields = ['type', 'value', 'currency', 'renewalType', 'terms', 'status', 'reminderDays'];
    fields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    if (req.body.startDate) data.startDate = new Date(req.body.startDate);
    if (req.body.endDate) data.endDate = new Date(req.body.endDate);
    if (data.value) data.value = Number(data.value);

    const contract = await prisma.vendorContract.update({ where: { id: req.params.id }, data });
    res.status(200).json({ success: true, message: 'Contract updated', data: contract });
});

// ── Expiring Contracts ─────────────────────────────────
exports.getExpiringContracts = asyncHandler(async (req, res) => {
    const daysAhead = parseInt(req.query.days) || 30;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const contracts = await prisma.vendorContract.findMany({
        where: { status: 'ACTIVE', endDate: { lte: futureDate, gte: new Date() } },
        orderBy: { endDate: 'asc' },
    });

    const vendorIds = [...new Set(contracts.map(c => c.vendorId))];
    const vendors = await prisma.vendor.findMany({
        where: { id: { in: vendorIds } }, select: { id: true, name: true },
    });
    const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v.name]));

    const enriched = contracts.map(c => ({ ...c, vendorName: vendorMap[c.vendorId] || 'Unknown' }));
    res.status(200).json({ success: true, count: enriched.length, data: enriched });
});

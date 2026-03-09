const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/errorHandler');

// ── Expense Claims Controller ────────────────────────────────

// @desc    Create Expense Claim
// @route   POST /api/finance-ext/expense-claims
exports.createExpenseClaim = asyncHandler(async (req, res) => {
    const { officeId, description, currency = 'INR', items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Expense items are required' });
    }

    const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    const count = await prisma.expenseClaim.count();
    const claimNumber = `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const claim = await prisma.expenseClaim.create({
        data: {
            claimNumber,
            employeeId: req.user.id,
            officeId: officeId || req.user.officeId,
            description,
            currency,
            totalAmount,
            status: 'SUBMITTED',
            items: {
                create: items.map(i => ({
                    date: new Date(i.date),
                    category: i.category,
                    description: i.description,
                    amount: parseFloat(i.amount),
                    receipt: i.receipt || null
                }))
            }
        },
        include: { items: true, employee: { select: { id: true, name: true } } }
    });

    res.status(201).json({ success: true, data: claim });
});

// @desc    Get Expense Claims
// @route   GET /api/finance-ext/expense-claims
exports.getExpenseClaims = asyncHandler(async (req, res) => {
    const where = {};
    const role = req.user.role;

    if (role === 'STAFF' || role === 'TECHNICIAN') {
        // Normal users only see their own
        where.employeeId = req.user.id;
    } else if (role === 'MANAGER') {
        // Managers see their office's claims
        where.officeId = req.user.officeId;
    }
    // SUPER_ADMIN sees all

    const claims = await prisma.expenseClaim.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { employee: { select: { id: true, name: true, email: true } }, items: true }
    });

    res.json({ success: true, count: claims.length, data: claims });
});

// @desc    Update Expense Claim Status (Approve/Reject)
// @route   PUT /api/finance-ext/expense-claims/:id/status
exports.updateClaimStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // APPROVED or REJECTED

    if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const claim = await prisma.expenseClaim.update({
        where: { id },
        data: {
            status,
            approvedById: status === 'APPROVED' ? req.user.id : null,
            approvalDate: status === 'APPROVED' ? new Date() : null
        },
        include: { employee: { select: { id: true, name: true } }, items: true }
    });

    res.json({ success: true, data: claim });
});

// @desc    Mark Expense Claim as Paid
// @route   PUT /api/finance-ext/expense-claims/:id/pay
exports.payClaim = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const existing = await prisma.expenseClaim.findUnique({ where: { id } });
    if (!existing || existing.status !== 'APPROVED') {
        return res.status(400).json({ success: false, message: 'Claim must be APPROVED to be paid.' });
    }

    const claim = await prisma.expenseClaim.update({
        where: { id },
        data: {
            status: 'PAID',
            paidDate: new Date()
        },
        include: { employee: { select: { id: true, name: true } } }
    });

    // Optionally create a GL entry for the payment in a real system here

    res.json({ success: true, data: claim });
});

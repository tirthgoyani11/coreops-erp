const prisma = require('../config/prisma');

// @desc    Get All Transactions
// @route   GET /api/finance/transactions
exports.getTransactions = async (req, res) => {
    try {
        const { type, category, startDate, endDate } = req.query;
        const where = {};

        // Scope to office unless super admin
        if (req.user.role !== 'SUPER_ADMIN') {
            where.officeId = req.user.office?.id || req.user.officeId;
        }

        if (type) where.type = type;
        if (category) where.category = category;
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { date: 'desc' },
            include: { recordedBy: { select: { id: true, name: true } } },
        });

        res.status(200).json({ success: true, count: transactions.length, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Create Transaction
// @route   POST /api/finance/transactions
exports.createTransaction = async (req, res) => {
    try {
        const { type, category, amount, description, referenceType, referenceId, date } = req.body;

        const officeId = req.user.office?.id || req.user.officeId;

        const transaction = await prisma.transaction.create({
            data: {
                type,
                category,
                amount,
                description,
                referenceType: referenceType || 'MANUAL',
                referenceId,
                date: date ? new Date(date) : new Date(),
                officeId: typeof officeId === 'string' ? officeId : officeId?.id || null,
                recordedById: req.user.id,
            },
        });

        // Update Budget if Expense
        if (type === 'EXPENSE') {
            const dateObj = new Date(transaction.date);
            const month = dateObj.getMonth() + 1;
            const year = dateObj.getFullYear();
            const resolvedOfficeId = typeof officeId === 'string' ? officeId : officeId?.id;

            if (resolvedOfficeId) {
                // Try to find and update existing budget
                const budget = await prisma.budget.findUnique({
                    where: {
                        officeId_category_month_year: {
                            officeId: resolvedOfficeId,
                            category,
                            month,
                            year,
                        },
                    },
                });

                if (budget) {
                    await prisma.budget.update({
                        where: { id: budget.id },
                        data: { spent: { increment: amount } },
                    });
                }
            }
        }

        res.status(201).json({ success: true, data: transaction });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Set/Update Budget
// @route   POST /api/finance/budgets
exports.setBudget = async (req, res) => {
    try {
        const { category, month, year, limit } = req.body;
        const officeId = req.user.office?.id || req.user.officeId;
        const resolvedOfficeId = typeof officeId === 'string' ? officeId : officeId?.id;

        const budget = await prisma.budget.upsert({
            where: {
                officeId_category_month_year: {
                    officeId: resolvedOfficeId,
                    category,
                    month: parseInt(month),
                    year: parseInt(year),
                },
            },
            update: { limit },
            create: {
                officeId: resolvedOfficeId,
                category,
                month: parseInt(month),
                year: parseInt(year),
                limit,
            },
        });

        res.status(200).json({ success: true, data: budget });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get Budgets Status
// @route   GET /api/finance/budgets
exports.getBudgets = async (req, res) => {
    try {
        const { month, year } = req.query;
        const where = {};
        const officeId = req.user.office?.id || req.user.officeId;
        where.officeId = typeof officeId === 'string' ? officeId : officeId?.id;

        if (month) where.month = parseInt(month);
        if (year) where.year = parseInt(year);

        const budgets = await prisma.budget.findMany({ where });
        res.status(200).json({ success: true, data: budgets });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

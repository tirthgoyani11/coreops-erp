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

        // Resolve officeId robustly
        let officeId = req.user.office?.id || req.user.officeId;
        if (!officeId) {
            const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { officeId: true } });
            officeId = dbUser?.officeId;
        }
        if (!officeId) {
            const firstOffice = await prisma.office.findFirst({ select: { id: true } });
            officeId = firstOffice?.id;
        }

        if (type === 'EXPENSE') {
            const { detectDuplicateTransaction } = require('../utils/anomaly');
            const dupeCheck = await detectDuplicateTransaction({ vendor: description, amount, date, officeId }, prisma);
            if (dupeCheck.isDuplicate && dupeCheck.confidence > 0.8) {
                return res.status(400).json({ success: false, message: dupeCheck.message, isDuplicate: true });
            }
        }

        const transaction = await prisma.transaction.create({
            data: {
                type,
                category,
                amount,
                description,
                referenceType: referenceType || 'MANUAL',
                referenceId,
                date: date ? new Date(date) : new Date(),
                officeId: officeId || null,
                recordedById: req.user.id,
            },
        });

        // Update Budget if Expense
        if (type === 'EXPENSE') {
            const dateObj = new Date(transaction.date);
            const month = dateObj.getMonth() + 1;
            const year = dateObj.getFullYear();

            if (officeId) {
                // Try to find and update existing budget
                const budget = await prisma.budget.findUnique({
                    where: {
                        officeId_category_month_year: {
                            officeId: officeId,
                            category,
                            month,
                            year,
                        },
                    },
                });

                if (budget) {
                    const updatedBudget = await prisma.budget.update({
                        where: { id: budget.id },
                        data: { spent: { increment: amount } },
                    });

                    if (updatedBudget.spent >= updatedBudget.limit * 0.9) {
                        return res.status(201).json({
                            success: true,
                            data: transaction,
                            warning: `Budget variance alert: ${category} spending (₹${updatedBudget.spent.toLocaleString()}) has exceeded 90% of the monthly limit (₹${updatedBudget.limit.toLocaleString()}).`
                        });
                    }
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
        let officeId = req.user.office?.id || req.user.officeId;
        if (!officeId) {
            const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { officeId: true } });
            officeId = dbUser?.officeId;
        }
        if (!officeId) {
            const firstOffice = await prisma.office.findFirst({ select: { id: true } });
            officeId = firstOffice?.id;
        }
        if (!officeId) {
            return res.status(400).json({ success: false, message: 'No office found. Please assign an office to your account.' });
        }

        const budget = await prisma.budget.upsert({
            where: {
                officeId_category_month_year: {
                    officeId,
                    category,
                    month: parseInt(month),
                    year: parseInt(year),
                },
            },
            update: { limit },
            create: {
                officeId,
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
        let officeId = req.user.office?.id || req.user.officeId;
        if (!officeId) {
            const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { officeId: true } });
            officeId = dbUser?.officeId;
        }
        if (!officeId) {
            const firstOffice = await prisma.office.findFirst({ select: { id: true } });
            officeId = firstOffice?.id;
        }
        if (officeId) where.officeId = officeId;

        if (month) where.month = parseInt(month);
        if (year) where.year = parseInt(year);

        const budgets = await prisma.budget.findMany({ where });
        res.status(200).json({ success: true, data: budgets });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ─── PHASE 2: AP/AR AGING + GST ────────────────────────────────

// @desc    Accounts Payable Aging Report
// @route   GET /api/finance/ap-aging
exports.getAPAging = async (req, res) => {
    try {
        const now = new Date();

        // Get all invoices with outstanding amounts (type: PURCHASE/EXPENSE)
        const invoices = await prisma.invoice.findMany({
            where: {
                status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] },
                ...(req.user.role !== 'SUPER_ADMIN' ? { officeId: req.user.officeId } : {}),
            },
            orderBy: { dueDate: 'asc' },
        });

        // Bucket into aging periods
        const buckets = { current: [], days30: [], days60: [], days90: [], over90: [] };
        let totalOutstanding = 0;

        for (const inv of invoices) {
            const outstanding = (inv.totalAmount || 0) - (inv.paidAmount || 0);
            if (outstanding <= 0) continue;

            totalOutstanding += outstanding;
            const daysOverdue = Math.floor((now - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));

            const item = {
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                vendorName: inv.vendorName,
                totalAmount: inv.totalAmount,
                outstanding,
                dueDate: inv.dueDate,
                daysOverdue: Math.max(0, daysOverdue),
            };

            if (daysOverdue <= 0) buckets.current.push(item);
            else if (daysOverdue <= 30) buckets.days30.push(item);
            else if (daysOverdue <= 60) buckets.days60.push(item);
            else if (daysOverdue <= 90) buckets.days90.push(item);
            else buckets.over90.push(item);
        }

        res.json({
            success: true,
            data: {
                buckets,
                summary: {
                    current: buckets.current.reduce((s, i) => s + i.outstanding, 0),
                    '1-30': buckets.days30.reduce((s, i) => s + i.outstanding, 0),
                    '31-60': buckets.days60.reduce((s, i) => s + i.outstanding, 0),
                    '61-90': buckets.days90.reduce((s, i) => s + i.outstanding, 0),
                    '90+': buckets.over90.reduce((s, i) => s + i.outstanding, 0),
                    total: totalOutstanding,
                },
                count: invoices.length,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Accounts Receivable Aging Report
// @route   GET /api/finance/ar-aging
exports.getARAging = async (req, res) => {
    try {
        const now = new Date();

        // Get outstanding income-related transactions (receivables)
        const transactions = await prisma.transaction.findMany({
            where: {
                type: 'INCOME',
                status: 'PENDING',
                ...(req.user.role !== 'SUPER_ADMIN' ? { officeId: req.user.officeId } : {}),
            },
            orderBy: { date: 'asc' },
        });

        const buckets = { current: [], days30: [], days60: [], days90: [], over90: [] };
        let totalReceivable = 0;

        for (const txn of transactions) {
            totalReceivable += txn.amount;
            const daysOld = Math.floor((now - new Date(txn.date)) / (1000 * 60 * 60 * 24));

            const item = {
                id: txn.id,
                description: txn.description,
                amount: txn.amount,
                category: txn.category,
                date: txn.date,
                daysOld,
            };

            if (daysOld <= 30) buckets.current.push(item);
            else if (daysOld <= 60) buckets.days30.push(item);
            else if (daysOld <= 90) buckets.days60.push(item);
            else if (daysOld <= 120) buckets.days90.push(item);
            else buckets.over90.push(item);
        }

        res.json({
            success: true,
            data: {
                buckets,
                summary: {
                    '0-30': buckets.current.reduce((s, i) => s + i.amount, 0),
                    '31-60': buckets.days30.reduce((s, i) => s + i.amount, 0),
                    '61-90': buckets.days60.reduce((s, i) => s + i.amount, 0),
                    '91-120': buckets.days90.reduce((s, i) => s + i.amount, 0),
                    '120+': buckets.over90.reduce((s, i) => s + i.amount, 0),
                    total: totalReceivable,
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    GST Summary for a period
// @route   GET /api/finance/gst-summary
exports.getGSTSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const now = new Date();
        const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = endDate ? new Date(endDate) : now;

        const officeFilter = req.user.role !== 'SUPER_ADMIN'
            ? { officeId: req.user.officeId }
            : {};

        // Get all transactions in period
        const transactions = await prisma.transaction.findMany({
            where: {
                date: { gte: start, lte: end },
                status: 'CLEARED',
                ...officeFilter,
            },
        });

        // Calculate GST at 18% (standard Indian GST rate)
        const gstRate = 0.18;
        const income = transactions.filter(t => t.type === 'INCOME');
        const expenses = transactions.filter(t => t.type === 'EXPENSE');

        const totalSales = income.reduce((s, t) => s + t.amount, 0);
        const totalPurchases = expenses.reduce((s, t) => s + t.amount, 0);

        // GST collected on sales (output GST)
        const outputGST = totalSales * gstRate / (1 + gstRate); // GST included in price
        // GST paid on purchases (input GST credit)
        const inputGST = totalPurchases * gstRate / (1 + gstRate);
        // Net GST payable
        const netGST = outputGST - inputGST;

        res.json({
            success: true,
            data: {
                period: { startDate: start, endDate: end },
                sales: {
                    total: Math.round(totalSales * 100) / 100,
                    taxableValue: Math.round((totalSales / (1 + gstRate)) * 100) / 100,
                    cgst: Math.round((outputGST / 2) * 100) / 100,
                    sgst: Math.round((outputGST / 2) * 100) / 100,
                    igst: 0,
                    totalGST: Math.round(outputGST * 100) / 100,
                },
                purchases: {
                    total: Math.round(totalPurchases * 100) / 100,
                    taxableValue: Math.round((totalPurchases / (1 + gstRate)) * 100) / 100,
                    cgst: Math.round((inputGST / 2) * 100) / 100,
                    sgst: Math.round((inputGST / 2) * 100) / 100,
                    igst: 0,
                    totalGST: Math.round(inputGST * 100) / 100,
                },
                netLiability: {
                    cgst: Math.round(((outputGST - inputGST) / 2) * 100) / 100,
                    sgst: Math.round(((outputGST - inputGST) / 2) * 100) / 100,
                    igst: 0,
                    total: Math.round(netGST * 100) / 100,
                },
                transactionCount: transactions.length,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};


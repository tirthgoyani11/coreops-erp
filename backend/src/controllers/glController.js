const prisma = require('../config/prisma');

// ═══════════════════════════════════════════════════════════════
// General Ledger Controller — Phase 2 Finance Deep
// Pattern: SAP/ERPNext/Odoo 3-tier GL (CoA → JE header → JE lines)
// ═══════════════════════════════════════════════════════════════

// ─── CHART OF ACCOUNTS ─────────────────────────────────────────

// @desc    Get chart of accounts (tree structure)
// @route   GET /api/gl/accounts
exports.getAccounts = async (req, res) => {
    try {
        const where = { isActive: true };
        if (req.user.role !== 'SUPER_ADMIN') {
            where.OR = [
                { officeId: req.user.officeId },
                { officeId: null }, // shared/global accounts
            ];
        }

        const accounts = await prisma.gLAccount.findMany({
            where,
            orderBy: { code: 'asc' },
            include: {
                children: { select: { id: true, code: true, name: true, type: true, balance: true } },
            },
        });

        // Build tree structure
        const roots = accounts.filter(a => !a.parentId);
        const buildTree = (parent) => ({
            ...parent,
            children: accounts
                .filter(a => a.parentId === parent.id)
                .map(buildTree),
        });
        const tree = roots.map(buildTree);

        res.json({ success: true, count: accounts.length, data: accounts, tree });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Create GL account
// @route   POST /api/gl/accounts
exports.createAccount = async (req, res) => {
    try {
        const { code, name, type, parentId, description, normalSide, officeId } = req.body;

        if (!code || !name || !type) {
            return res.status(400).json({ success: false, message: 'code, name, and type are required' });
        }

        const existing = await prisma.gLAccount.findUnique({ where: { code } });
        if (existing) {
            return res.status(400).json({ success: false, message: `Account code ${code} already exists` });
        }

        const account = await prisma.gLAccount.create({
            data: {
                code,
                name,
                type,
                parentId: parentId || null,
                description,
                normalSide: normalSide || ((['ASSET', 'EXPENSE'].includes(type)) ? 'DEBIT' : 'CREDIT'),
                officeId: officeId || req.user.officeId,
            },
        });

        res.status(201).json({ success: true, data: account });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Update GL account
// @route   PUT /api/gl/accounts/:id
exports.updateAccount = async (req, res) => {
    try {
        const { name, description, isActive, parentId } = req.body;

        const account = await prisma.gLAccount.update({
            where: { id: req.params.id },
            data: { name, description, isActive, parentId },
        });

        res.json({ success: true, data: account });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

// ─── JOURNAL ENTRIES ───────────────────────────────────────────

// @desc    Create journal entry (double-entry enforced)
// @route   POST /api/gl/journal
exports.createJournalEntry = async (req, res) => {
    try {
        const { date, description, reference, referenceType, lines } = req.body;

        if (!lines || !Array.isArray(lines) || lines.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Journal entry requires at least 2 lines (debit + credit)',
            });
        }

        // Double-entry validation: total debits MUST equal total credits
        const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
        const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return res.status(400).json({
                success: false,
                message: `Debits (${totalDebit.toFixed(2)}) must equal Credits (${totalCredit.toFixed(2)})`,
                totalDebit,
                totalCredit,
            });
        }

        // Generate entry number
        const count = await prisma.journalEntry.count();
        const year = new Date().getFullYear();
        const entryNumber = `JE-${year}-${String(count + 1).padStart(4, '0')}`;

        // Create in transaction to ensure atomicity
        const entry = await prisma.$transaction(async (tx) => {
            const je = await tx.journalEntry.create({
                data: {
                    entryNumber,
                    date: date ? new Date(date) : new Date(),
                    description,
                    reference,
                    referenceType,
                    status: 'POSTED',
                    totalAmount: totalDebit,
                    officeId: req.user.officeId,
                    createdById: req.user.id,
                    lines: {
                        create: lines.map(l => ({
                            accountId: l.accountId,
                            debit: parseFloat(l.debit) || 0,
                            credit: parseFloat(l.credit) || 0,
                            description: l.description,
                            transactionId: l.transactionId || null,
                        })),
                    },
                },
                include: {
                    lines: { include: { account: { select: { code: true, name: true, type: true } } } },
                    createdBy: { select: { id: true, name: true } },
                },
            });

            // Update GL account balances
            for (const line of lines) {
                const amount = (parseFloat(line.debit) || 0) - (parseFloat(line.credit) || 0);
                await tx.gLAccount.update({
                    where: { id: line.accountId },
                    data: { balance: { increment: amount } },
                });
            }

            return je;
        });

        res.status(201).json({ success: true, data: entry });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get journal entries
// @route   GET /api/gl/journal
exports.getJournalEntries = async (req, res) => {
    try {
        const { startDate, endDate, status, accountId, limit = 50 } = req.query;
        const where = {};

        if (req.user.role !== 'SUPER_ADMIN') {
            where.officeId = req.user.officeId;
        }
        if (status) where.status = status;
        if (startDate && endDate) {
            where.date = { gte: new Date(startDate), lte: new Date(endDate) };
        }
        if (accountId) {
            where.lines = { some: { accountId } };
        }

        const entries = await prisma.journalEntry.findMany({
            where,
            orderBy: { date: 'desc' },
            take: parseInt(limit),
            include: {
                lines: {
                    include: { account: { select: { code: true, name: true, type: true } } },
                },
                createdBy: { select: { id: true, name: true } },
            },
        });

        res.json({ success: true, count: entries.length, data: entries });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ─── FINANCIAL REPORTS ─────────────────────────────────────────

// @desc    Trial Balance (all accounts with debit/credit totals)
// @route   GET /api/gl/trial-balance
exports.getTrialBalance = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const where = { isActive: true };

        if (req.user.role !== 'SUPER_ADMIN') {
            where.OR = [{ officeId: req.user.officeId }, { officeId: null }];
        }

        const accounts = await prisma.gLAccount.findMany({
            where,
            orderBy: { code: 'asc' },
        });

        // Get journal line totals per account for the period
        const lineWhere = { journalEntry: { status: 'POSTED' } };
        if (startDate && endDate) {
            lineWhere.journalEntry.date = { gte: new Date(startDate), lte: new Date(endDate) };
        }

        const lineTotals = await prisma.journalEntryLine.groupBy({
            by: ['accountId'],
            where: lineWhere,
            _sum: { debit: true, credit: true },
        });

        const totalsMap = {};
        for (const t of lineTotals) {
            totalsMap[t.accountId] = { debit: t._sum.debit || 0, credit: t._sum.credit || 0 };
        }

        const rows = accounts.map(a => ({
            accountId: a.id,
            code: a.code,
            name: a.name,
            type: a.type,
            debit: totalsMap[a.id]?.debit || 0,
            credit: totalsMap[a.id]?.credit || 0,
            balance: a.balance,
        }));

        const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
        const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

        res.json({
            success: true,
            data: {
                rows,
                totals: { debit: totalDebit, credit: totalCredit },
                isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
                period: { startDate, endDate },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Profit & Loss Statement
// @route   GET /api/gl/profit-loss
exports.getProfitLoss = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const now = new Date();
        const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = endDate ? new Date(endDate) : now;

        const lineWhere = {
            journalEntry: { status: 'POSTED', date: { gte: start, lte: end } },
        };

        // Revenue accounts (credits increase revenue)
        const revenueLines = await prisma.journalEntryLine.groupBy({
            by: ['accountId'],
            where: { ...lineWhere, account: { type: 'REVENUE' } },
            _sum: { debit: true, credit: true },
        });

        // Expense accounts (debits increase expenses)
        const expenseLines = await prisma.journalEntryLine.groupBy({
            by: ['accountId'],
            where: { ...lineWhere, account: { type: 'EXPENSE' } },
            _sum: { debit: true, credit: true },
        });

        // Get account names
        const accountIds = [...revenueLines, ...expenseLines].map(l => l.accountId);
        const accounts = await prisma.gLAccount.findMany({
            where: { id: { in: accountIds } },
            select: { id: true, code: true, name: true, type: true },
        });
        const accountMap = Object.fromEntries(accounts.map(a => [a.id, a]));

        const revenue = revenueLines.map(l => ({
            ...accountMap[l.accountId],
            amount: (l._sum.credit || 0) - (l._sum.debit || 0),
        }));

        const expenses = expenseLines.map(l => ({
            ...accountMap[l.accountId],
            amount: (l._sum.debit || 0) - (l._sum.credit || 0),
        }));

        const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
        const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);
        const netIncome = totalRevenue - totalExpenses;

        // Also pull from existing Transaction model for comparison
        const txnTotals = await prisma.transaction.groupBy({
            by: ['type'],
            where: { date: { gte: start, lte: end }, status: 'CLEARED' },
            _sum: { amount: true },
        });
        const txnIncome = txnTotals.find(t => t.type === 'INCOME')?._sum.amount || 0;
        const txnExpense = txnTotals.find(t => t.type === 'EXPENSE')?._sum.amount || 0;

        res.json({
            success: true,
            data: {
                period: { startDate: start, endDate: end },
                revenue: { items: revenue, total: totalRevenue },
                expenses: { items: expenses, total: totalExpenses },
                netIncome,
                profitMargin: totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : 0,
                // Legacy transaction-based comparison
                transactionSummary: {
                    income: txnIncome,
                    expense: txnExpense,
                    net: txnIncome - txnExpense,
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Balance Sheet (Assets = Liabilities + Equity)
// @route   GET /api/gl/balance-sheet
exports.getBalanceSheet = async (req, res) => {
    try {
        const accounts = await prisma.gLAccount.findMany({
            where: { isActive: true, type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] } },
            orderBy: { code: 'asc' },
        });

        const assets = accounts.filter(a => a.type === 'ASSET');
        const liabilities = accounts.filter(a => a.type === 'LIABILITY');
        const equity = accounts.filter(a => a.type === 'EQUITY');

        const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
        const totalLiabilities = liabilities.reduce((s, a) => s + Math.abs(a.balance), 0);
        const totalEquity = equity.reduce((s, a) => s + Math.abs(a.balance), 0);

        // Calculate retained earnings from P&L
        const revenueAccounts = await prisma.gLAccount.findMany({ where: { type: 'REVENUE' } });
        const expenseAccounts = await prisma.gLAccount.findMany({ where: { type: 'EXPENSE' } });
        const retainedEarnings =
            revenueAccounts.reduce((s, a) => s + Math.abs(a.balance), 0) -
            expenseAccounts.reduce((s, a) => s + Math.abs(a.balance), 0);

        res.json({
            success: true,
            data: {
                assets: { items: assets.map(a => ({ id: a.id, code: a.code, name: a.name, balance: a.balance })), total: totalAssets },
                liabilities: { items: liabilities.map(a => ({ id: a.id, code: a.code, name: a.name, balance: Math.abs(a.balance) })), total: totalLiabilities },
                equity: {
                    items: [
                        ...equity.map(a => ({ id: a.id, code: a.code, name: a.name, balance: Math.abs(a.balance) })),
                        { id: 'retained-earnings', code: 'RE', name: 'Retained Earnings', balance: retainedEarnings },
                    ],
                    total: totalEquity + retainedEarnings,
                },
                isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity + retainedEarnings)) < 0.01,
                asOfDate: new Date(),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Cash Flow Summary (30/60/90 day projections)
// @route   GET /api/gl/cash-flow
exports.getCashFlow = async (req, res) => {
    try {
        const now = new Date();
        const periods = [30, 60, 90];

        // Historical cash flow from transactions
        const results = {};
        for (const days of periods) {
            const start = new Date(now);
            start.setDate(start.getDate() - days);

            const txns = await prisma.transaction.groupBy({
                by: ['type'],
                where: {
                    date: { gte: start, lte: now },
                    status: 'CLEARED',
                    ...(req.user.role !== 'SUPER_ADMIN' ? { officeId: req.user.officeId } : {}),
                },
                _sum: { amount: true },
            });

            const income = txns.find(t => t.type === 'INCOME')?._sum.amount || 0;
            const expense = txns.find(t => t.type === 'EXPENSE')?._sum.amount || 0;

            results[`last${days}Days`] = {
                income,
                expense,
                net: income - expense,
                dailyAvgIncome: days > 0 ? income / days : 0,
                dailyAvgExpense: days > 0 ? expense / days : 0,
            };
        }

        // Projections based on 30-day averages
        const base = results.last30Days;
        const projections = {};
        for (const days of periods) {
            projections[`next${days}Days`] = {
                projectedIncome: Math.round(base.dailyAvgIncome * days * 100) / 100,
                projectedExpense: Math.round(base.dailyAvgExpense * days * 100) / 100,
                projectedNet: Math.round((base.dailyAvgIncome - base.dailyAvgExpense) * days * 100) / 100,
            };
        }

        // Monthly breakdown (last 6 months)
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

            const txns = await prisma.transaction.groupBy({
                by: ['type'],
                where: {
                    date: { gte: monthStart, lte: monthEnd },
                    status: 'CLEARED',
                    ...(req.user.role !== 'SUPER_ADMIN' ? { officeId: req.user.officeId } : {}),
                },
                _sum: { amount: true },
            });

            const income = txns.find(t => t.type === 'INCOME')?._sum.amount || 0;
            const expense = txns.find(t => t.type === 'EXPENSE')?._sum.amount || 0;

            monthlyData.push({
                month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
                income,
                expense,
                net: income - expense,
            });
        }

        res.json({
            success: true,
            data: { historical: results, projections, monthly: monthlyData },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

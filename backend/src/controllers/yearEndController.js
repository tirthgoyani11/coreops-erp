const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/errorHandler');

// ── Year End Closing Controller ────────────────────────────────

// @desc    Get Year End Preview (Net Profit/Loss)
// @route   GET /api/finance-ext/year-end
exports.getYearEndPreview = asyncHandler(async (req, res) => {
    // To close a year, we need the total balance of all REVENUE and EXPENSE accounts
    const revenueAccounts = await prisma.gLAccount.findMany({ where: { type: 'REVENUE', isActive: true } });
    const expenseAccounts = await prisma.gLAccount.findMany({ where: { type: 'EXPENSE', isActive: true } });

    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalExpense = expenseAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

    // Simplification: In a real ERP, credit balances on revenue are positive income, 
    // debit balances on expenses are positive expenses. We'll assume balance is absolute.
    const netIncome = totalRevenue - totalExpense;

    res.json({
        success: true,
        data: {
            revenueAccounts: revenueAccounts.map(a => ({ id: a.id, code: a.code, name: a.name, balance: a.balance })),
            expenseAccounts: expenseAccounts.map(a => ({ id: a.id, code: a.code, name: a.name, balance: a.balance })),
            totalRevenue,
            totalExpense,
            netIncome
        }
    });
});

// @desc    Execute Year End Close
// @route   POST /api/finance-ext/year-end
exports.closeYear = asyncHandler(async (req, res) => {
    const { year, notes } = req.body;

    if (!year) {
        return res.status(400).json({ success: false, message: 'Please provide the fiscal year to close.' });
    }

    // 1. Calculate Net Income
    const revenueAccounts = await prisma.gLAccount.findMany({ where: { type: 'REVENUE', isActive: true } });
    const expenseAccounts = await prisma.gLAccount.findMany({ where: { type: 'EXPENSE', isActive: true } });

    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalExpense = expenseAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const netIncome = totalRevenue - totalExpense;

    // 2. Find or Create Retained Earnings Account
    let retainedEarnings = await prisma.gLAccount.findFirst({
        where: { code: 'RE' } // Standard Retained Earnings
    });

    if (!retainedEarnings) {
        retainedEarnings = await prisma.gLAccount.create({
            data: {
                code: 'RE',
                name: 'Retained Earnings',
                type: 'EQUITY',
                normalSide: 'CREDIT',
                description: 'System generated Retained Earnings',
                officeId: req.user.officeId
            }
        });
    }

    // 3. Perform Closing Entry inside a Transaction
    await prisma.$transaction(async (tx) => {
        // Zero out all revenue accounts
        for (const account of revenueAccounts) {
            await tx.gLAccount.update({
                where: { id: account.id },
                data: { balance: 0 } // Reset for new year
            });
        }

        // Zero out all expense accounts
        for (const account of expenseAccounts) {
            await tx.gLAccount.update({
                where: { id: account.id },
                data: { balance: 0 } // Reset for new year
            });
        }

        // Add Net Income to Retained Earnings
        await tx.gLAccount.update({
            where: { id: retainedEarnings.id },
            data: { balance: { increment: netIncome } }
        });

        // Create a Journal Entry for audit trailing
        const jeLines = [];
        revenueAccounts.forEach(a => jeLines.push({ accountId: a.id, debit: a.balance, credit: 0, description: `Closing Entry ${year}` }));
        expenseAccounts.forEach(a => jeLines.push({ accountId: a.id, debit: 0, credit: a.balance, description: `Closing Entry ${year}` }));

        if (netIncome > 0) {
            jeLines.push({ accountId: retainedEarnings.id, debit: 0, credit: netIncome, description: `Net Income Transfer ${year}` });
        } else if (netIncome < 0) {
            jeLines.push({ accountId: retainedEarnings.id, debit: Math.abs(netIncome), credit: 0, description: `Net Loss Transfer ${year}` });
        }

        await tx.journalEntry.create({
            data: {
                entryNumber: `YE-${year}-CLOSE`,
                date: new Date(),
                description: `Financial Year ${year} Closing Entry. ${notes || ''}`,
                reference: `YE-${year}`,
                status: 'POSTED',
                totalAmount: totalRevenue, // Just an indicative amount for the JE
                createdById: req.user.id,
                lines: { create: jeLines }
            }
        });
    });

    res.json({
        success: true,
        message: `Financial Year ${year} successfully closed. Net Income of ${netIncome} transferred to Retained Earnings.`,
        netIncome
    });
});

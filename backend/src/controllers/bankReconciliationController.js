const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/errorHandler');

// ── Bank Reconciliation Controller ─────────────────────────────────

// @desc    Upload Bank Statement & Create Entries
// @route   POST /api/finance-ext/bank-statements
exports.uploadBankStatement = asyncHandler(async (req, res) => {
    // In a real scenario, we'd parse a CSV/OFX file here.
    // For this implementation, we expect a JSON payload with parsed entries.
    const { accountId, statementDate, endingBalance, entries } = req.body;

    if (!accountId || !statementDate || !entries) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const statement = await prisma.bankStatement.create({
        data: {
            accountId,
            statementDate: new Date(statementDate),
            endingBalance,
            uploadedById: req.user.id,
            entries: {
                create: entries.map(e => ({
                    date: new Date(e.date),
                    description: e.description,
                    amount: e.amount, // positive for credit, negative for debit
                    reference: e.reference,
                    isReconciled: false
                }))
            }
        },
        include: { entries: true }
    });

    res.status(201).json({ success: true, data: statement });
});

// @desc    Get Bank Statements
// @route   GET /api/finance-ext/bank-statements
exports.getBankStatements = asyncHandler(async (req, res) => {
    const statements = await prisma.bankStatement.findMany({
        orderBy: { statementDate: 'desc' },
        include: { _count: { select: { entries: true } } }
    });

    // Also attach account details
    const accountIds = [...new Set(statements.map(s => s.accountId))];
    const accounts = await prisma.gLAccount.findMany({
        where: { id: { in: accountIds } },
        select: { id: true, name: true, code: true }
    });
    const accMap = Object.fromEntries(accounts.map(a => [a.id, a]));

    const mapped = statements.map(s => ({
        ...s,
        account: accMap[s.accountId]
    }));

    res.json({ success: true, data: mapped });
});

// @desc    Get Statement Entries & suggest matches
// @route   GET /api/finance-ext/bank-statements/:id/reconcile
exports.getReconciliationData = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const statement = await prisma.bankStatement.findUnique({
        where: { id },
        include: { entries: true }
    });

    if (!statement) return res.status(404).json({ success: false, message: 'Statement not found' });

    // Fetch uncleared system transactions for the same account roughly around the statement date
    const thirtyDaysAgo = new Date(statement.statementDate);
    thirtyDaysAgo.setDate(statement.statementDate.getDate() - 30);

    const systemTxns = await prisma.transaction.findMany({
        where: {
            accountId: statement.accountId,
            status: { in: ['PENDING', 'FAILED'] },
            date: { gte: thirtyDaysAgo }
        }
    });

    // Simple Auto-Matching Logic
    const matches = [];
    const unmatchedEntries = [];
    const unmatchedTxns = [...systemTxns];

    statement.entries.forEach(entry => {
        if (entry.isReconciled) return; // Skip already reconciled

        // Try to find a matching system transaction by amount and roughly same date
        const matchIdx = unmatchedTxns.findIndex(t => {
            // Note: entry.amount is positive (credit/deposit) or negative (debit/withdrawal)
            // System transaction usually has amount > 0 and type = PENDING/CLEARED.
            // Let's assume transaction 'amount' is absolute, and 'type' defines direction.
            // Or if systemTxns is a mix, we must compare correctly.
            const absTxnAmount = t.amount;
            const absEntryAmount = Math.abs(entry.amount);

            // Allow 1% wiggle room or exact match
            const isAmountMatch = Math.abs(absTxnAmount - absEntryAmount) < 0.01;

            // Check direction: if entry > 0 it's a deposit (INCOME/RECEIPT). If entry < 0 it's a withdrawal (EXPENSE/PAYMENT).
            let isTypeMatch = false;
            if (entry.amount > 0 && ['INCOME'].includes(t.type)) isTypeMatch = true;
            if (entry.amount < 0 && ['EXPENSE'].includes(t.type)) isTypeMatch = true;

            const daysDiff = Math.abs(new Date(t.date).getTime() - new Date(entry.date).getTime()) / (1000 * 3600 * 24);
            const isDateMatch = daysDiff <= 3; // within 3 days

            return isAmountMatch && isTypeMatch && isDateMatch;
        });

        if (matchIdx !== -1) {
            matches.push({
                bankEntry: entry,
                systemTxn: unmatchedTxns[matchIdx],
                confidence: 'HIGH'
            });
            unmatchedTxns.splice(matchIdx, 1);
        } else {
            unmatchedEntries.push(entry);
        }
    });

    res.json({
        success: true,
        data: {
            statement,
            suggestedMatches: matches,
            unmatchedBankEntries: unmatchedEntries,
            unmatchedSystemTxns: unmatchedTxns
        }
    });
});

// @desc    Confirm Reconciliation Match
// @route   POST /api/finance-ext/bank-statements/:id/reconcile
exports.reconcileMatch = asyncHandler(async (req, res) => {
    const { matches } = req.body; // array of { bankEntryId, systemTxnId }

    if (!matches || !Array.isArray(matches)) {
        return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    await prisma.$transaction(async (tx) => {
        for (const match of matches) {
            await tx.bankEntry.update({
                where: { id: match.bankEntryId },
                data: { isReconciled: true, matchedTxnId: match.systemTxnId }
            });

            await tx.transaction.update({
                where: { id: match.systemTxnId },
                data: { status: 'CLEARED' } // Cleared means it showed up in bank
            });
        }
    });

    res.json({ success: true, message: `Reconciled ${matches.length} entries successfully` });
});

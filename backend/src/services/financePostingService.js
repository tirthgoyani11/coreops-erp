const prisma = require('../config/prisma');

const CORE_ACCOUNTS = {
    cash: { code: '1100', name: 'Cash and Bank', type: 'ASSET', normalSide: 'DEBIT' },
    receivable: { code: '1200', name: 'Accounts Receivable', type: 'ASSET', normalSide: 'DEBIT' },
    revenue: { code: '4100', name: 'Sales Revenue', type: 'REVENUE', normalSide: 'CREDIT' },
    expense: { code: '5100', name: 'Operating Expense', type: 'EXPENSE', normalSide: 'DEBIT' },
};

async function getNextEntryNumber(tx) {
    const year = new Date().getFullYear();
    for (let i = 0; i < 50; i++) {
        const counter = await tx.counter.upsert({
            where: { name: `JE_${year}` },
            update: { sequence: { increment: 1 } },
            create: {
                name: `JE_${year}`,
                prefix: `JE-${year}-`,
                sequence: 1,
            },
        });

        const entryNumber = `${counter.prefix || `JE-${year}-`}${String(counter.sequence).padStart(4, '0')}`;
        const exists = await tx.journalEntry.findUnique({
            where: { entryNumber },
            select: { id: true },
        });
        if (!exists) return entryNumber;
    }

    throw new Error('Unable to allocate a unique journal entry number');
}

async function ensureCoreAccount(tx, accountDef, officeId) {
    const existing = await tx.gLAccount.findUnique({ where: { code: accountDef.code } });
    if (existing) return existing;

    return tx.gLAccount.create({
        data: {
            code: accountDef.code,
            name: accountDef.name,
            type: accountDef.type,
            normalSide: accountDef.normalSide,
            isActive: true,
            officeId: officeId || null,
        },
    });
}

async function ensureCoreAccounts(tx, officeId) {
    const [cash, receivable, revenue, expense] = await Promise.all([
        ensureCoreAccount(tx, CORE_ACCOUNTS.cash, officeId),
        ensureCoreAccount(tx, CORE_ACCOUNTS.receivable, officeId),
        ensureCoreAccount(tx, CORE_ACCOUNTS.revenue, officeId),
        ensureCoreAccount(tx, CORE_ACCOUNTS.expense, officeId),
    ]);

    return { cash, receivable, revenue, expense };
}

async function createBalancedJournalEntry(tx, { officeId, userId, description, referenceType, reference, lines }) {
    const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Auto-posting blocked: debits (${totalDebit.toFixed(2)}) != credits (${totalCredit.toFixed(2)})`);
    }

    let entry = null;
    for (let i = 0; i < 5; i++) {
        const entryNumber = await getNextEntryNumber(tx);
        try {
            entry = await tx.journalEntry.create({
                data: {
                    entryNumber,
                    date: new Date(),
                    description,
                    referenceType,
                    reference,
                    status: 'POSTED',
                    totalAmount: totalDebit,
                    officeId: officeId || null,
                    createdById: userId || null,
                    lines: {
                        create: lines.map((line) => ({
                            accountId: line.accountId,
                            debit: Number(line.debit) || 0,
                            credit: Number(line.credit) || 0,
                            description: line.description,
                            transactionId: line.transactionId || null,
                        })),
                    },
                },
            });
            break;
        } catch (err) {
            if (!(err && err.code === 'P2002')) throw err;
        }
    }

    if (!entry) {
        throw new Error('Failed to create journal entry after retries due to entry number collisions');
    }

    for (const line of lines) {
        const delta = (Number(line.debit) || 0) - (Number(line.credit) || 0);
        await tx.gLAccount.update({
            where: { id: line.accountId },
            data: { balance: { increment: delta } },
        });
    }

    return entry;
}

async function postTransactionToGL({ tx, transaction, userId }) {
    const db = tx || prisma;
    const amount = Number(transaction?.amount || 0);

    if (!transaction?.id || amount <= 0) {
        throw new Error('Auto-posting requires a persisted transaction with positive amount');
    }

    const existing = await db.journalEntry.findFirst({
        where: {
            referenceType: 'TRANSACTION',
            reference: transaction.id,
            status: 'POSTED',
        },
        select: { id: true },
    });
    if (existing) return existing;

    const { cash, revenue, expense } = await ensureCoreAccounts(db, transaction.officeId || null);

    const isExpense = transaction.type === 'EXPENSE';
    const lines = isExpense
        ? [
            {
                accountId: expense.id,
                debit: amount,
                credit: 0,
                description: transaction.description || 'Expense auto-posted',
                transactionId: transaction.id,
            },
            {
                accountId: cash.id,
                debit: 0,
                credit: amount,
                description: 'Offset entry (cash/bank)',
                transactionId: transaction.id,
            },
        ]
        : [
            {
                accountId: cash.id,
                debit: amount,
                credit: 0,
                description: transaction.description || 'Income auto-posted',
                transactionId: transaction.id,
            },
            {
                accountId: revenue.id,
                debit: 0,
                credit: amount,
                description: 'Offset entry (revenue)',
                transactionId: transaction.id,
            },
        ];

    return createBalancedJournalEntry(db, {
        officeId: transaction.officeId,
        userId,
        description: `Auto-posted from ${transaction.type} transaction (${transaction.category || 'GENERAL'})`,
        referenceType: 'TRANSACTION',
        reference: transaction.id,
        lines,
    });
}

async function postARInvoiceToGL({ tx, invoice, userId }) {
    const db = tx || prisma;
    const amount = Number(invoice?.totalAmount || 0);

    if (!invoice?.id || amount <= 0) {
        throw new Error('Auto-posting requires a persisted AR invoice with positive totalAmount');
    }

    const existing = await db.journalEntry.findFirst({
        where: {
            referenceType: 'AR_INVOICE',
            reference: invoice.id,
            status: 'POSTED',
        },
        select: { id: true },
    });
    if (existing) return existing;

    const { receivable, revenue } = await ensureCoreAccounts(db, invoice.officeId || null);

    return createBalancedJournalEntry(db, {
        officeId: invoice.officeId,
        userId,
        description: `Auto-posted from AR invoice ${invoice.invoiceNumber}`,
        referenceType: 'AR_INVOICE',
        reference: invoice.id,
        lines: [
            {
                accountId: receivable.id,
                debit: amount,
                credit: 0,
                description: `Invoice raised ${invoice.invoiceNumber}`,
            },
            {
                accountId: revenue.id,
                debit: 0,
                credit: amount,
                description: 'Revenue recognition',
            },
        ],
    });
}

module.exports = {
    postTransactionToGL,
    postARInvoiceToGL,
};

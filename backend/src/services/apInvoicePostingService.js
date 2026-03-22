/**
 * AP Invoice Posting Service
 * Handles automatic GL posting for AP invoices with tax calculations
 * Pattern: Odoo/ERPNext standard posting rules
 */

const prisma = require('../config/prisma');

// ─── Core Accounts for AP ──────────────────────────────────────

const AP_CORE_ACCOUNTS = {
  accountsPayable: {
    code: '2100',
    name: 'Accounts Payable',
    type: 'LIABILITY',
    normalSide: 'CREDIT'
  },
  purchaseExpense: {
    code: '5000',
    name: 'Purchase - Goods/Services',
    type: 'EXPENSE',
    normalSide: 'DEBIT'
  },
  gstPayableIGST: {
    code: '2300',
    name: 'IGST Payable',
    type: 'LIABILITY',
    normalSide: 'CREDIT'
  },
  gstPayableSGST: {
    code: '2301',
    name: 'SGST Payable',
    type: 'LIABILITY',
    normalSide: 'CREDIT'
  },
  gstPayableCGST: {
    code: '2302',
    name: 'CGST Payable',
    type: 'LIABILITY',
    normalSide: 'CREDIT'
  },
  gstInput: {
    code: '1400',
    name: 'GST Input Credit',
    type: 'ASSET',
    normalSide: 'DEBIT'
  },
};

// ─── Helper: Ensure Account Exists ────────────────────────────

async function ensureAccount(tx, accountDef, officeId) {
  const existing = await tx.gLAccount.findUnique({
    where: { code: accountDef.code },
  });
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

// ─── Helper: Get Next JE Number ────────────────────────────────

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

// ─── Helper: Create Balanced Journal Entry ─────────────────────

async function createBalancedJournalEntry(tx, args) {
  const { officeId, userId, description, referenceType, reference, lines } = args;

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `Journal entry imbalanced: debits (${totalDebit.toFixed(2)}) != credits (${totalCredit.toFixed(2)})`
    );
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
          referenceType: referenceType || 'AP_INVOICE',
          reference: reference || '',
          status: 'POSTED',
          totalAmount: totalDebit,
          officeId: officeId || null,
          createdById: userId || null,
          lines: {
            create: lines.map((line) => ({
              accountId: line.accountId,
              debit: Number(line.debit) || 0,
              credit: Number(line.credit) || 0,
              description: line.description || '',
            })),
          },
        },
        include: { lines: true },
      });
      break;
    } catch (err) {
      if (!(err && err.code === 'P2002')) throw err;
    }
  }

  if (!entry) {
    throw new Error('Failed to create journal entry after retries due to entry number collisions');
  }

  // Update GL account balances
  for (const line of lines) {
    const delta = (Number(line.debit) || 0) - (Number(line.credit) || 0);
    await tx.gLAccount.update({
      where: { id: line.accountId },
      data: { balance: { increment: delta } },
    });
  }

  return entry;
}

// ─── Main: Post AP Invoice to GL ───────────────────────────────

/**
 * Post an AP invoice to GL with breakdown:
 * 1. Accounts Payable (credit)
 * 2. Purchase Expense (debit) - net of tax
 * 3. GST/Tax Accounts (debit input credit, credit payable)
 *
 * Posting logic (Indian GST context):
 * Dr. Purchase Account (line amount)
 * Dr. IGST Input (if IGST applicable)
 * Dr. SGST Input (if SGST applicable)
 * Dr. CGST Input (if CGST applicable)
 *   Cr. Accounts Payable (invoice total)
 */
async function postAPInvoiceToGL({ apInvoiceId, userId }) {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch invoice with lines
    const invoice = await tx.aPInvoice.findUnique({
      where: { id: apInvoiceId },
      include: {
        lines: true,
        office: true,
      },
    });

    if (!invoice) {
      throw new Error(`AP Invoice not found: ${apInvoiceId}`);
    }

    if (!invoice.lines || invoice.lines.length === 0) {
      throw new Error(`AP Invoice has no line items: ${invoice.invoiceNumber}`);
    }

    // 2. Check if already posted
    const existingJE = await tx.journalEntry.findFirst({
      where: {
        referenceType: 'AP_INVOICE',
        reference: apInvoiceId,
        status: 'POSTED',
      },
    });

    if (existingJE) {
      return existingJE; // Already posted
    }

    // 3. Ensure core accounts exist
    const [apAccount, purchaseAccount, igstPayable, sgstPayable, cgstPayable, gstInput] =
      await Promise.all([
        ensureAccount(tx, AP_CORE_ACCOUNTS.accountsPayable, invoice.officeId),
        ensureAccount(tx, AP_CORE_ACCOUNTS.purchaseExpense, invoice.officeId),
        ensureAccount(tx, AP_CORE_ACCOUNTS.gstPayableIGST, invoice.officeId),
        ensureAccount(tx, AP_CORE_ACCOUNTS.gstPayableSGST, invoice.officeId),
        ensureAccount(tx, AP_CORE_ACCOUNTS.gstPayableCGST, invoice.officeId),
        ensureAccount(tx, AP_CORE_ACCOUNTS.gstInput, invoice.officeId),
      ]);

    // 4. Build JE lines from invoice lines
    const jeLines = [];
    const taxSummary = {
      igst: 0,
      sgst: 0,
      cgst: 0,
    };

    for (const iline of invoice.lines) {
      // Debit: Purchase account for line amount (net of tax)
      jeLines.push({
        accountId: iline.glAccountId || purchaseAccount.id,
        debit: iline.lineAmount || 0,
        credit: 0,
        description: `Purchase: ${iline.description}`,
      });

      // Tax breakdown: assume tax code tells us which tax type
      // GST tax codes: "GST18", "IGST12", "SGST9", "CGST9", etc.
      if (iline.taxCode && iline.taxAmount > 0) {
        const taxCode = iline.taxCode.toUpperCase();
        if (taxCode.includes('IGST')) {
          taxSummary.igst += iline.taxAmount;
        } else if (taxCode.includes('SGST')) {
          taxSummary.sgst += iline.taxAmount;
        } else if (taxCode.includes('CGST')) {
          taxSummary.cgst += iline.taxAmount;
        }
      }
    }

    // 5. Add tax lines
    if (taxSummary.igst > 0) {
      jeLines.push({
        accountId: gstInput.id,
        debit: taxSummary.igst,
        credit: 0,
        description: `IGST Input Credit - ${invoice.invoiceNumber}`,
      });
      jeLines.push({
        accountId: igstPayable.id,
        debit: 0,
        credit: taxSummary.igst,
        description: `IGST Payable - ${invoice.invoiceNumber}`,
      });
    }

    if (taxSummary.sgst > 0) {
      jeLines.push({
        accountId: gstInput.id,
        debit: taxSummary.sgst,
        credit: 0,
        description: `SGST Input Credit - ${invoice.invoiceNumber}`,
      });
      jeLines.push({
        accountId: sgstPayable.id,
        debit: 0,
        credit: taxSummary.sgst,
        description: `SGST Payable - ${invoice.invoiceNumber}`,
      });
    }

    if (taxSummary.cgst > 0) {
      jeLines.push({
        accountId: gstInput.id,
        debit: taxSummary.cgst,
        credit: 0,
        description: `CGST Input Credit - ${invoice.invoiceNumber}`,
      });
      jeLines.push({
        accountId: cgstPayable.id,
        debit: 0,
        credit: taxSummary.cgst,
        description: `CGST Payable - ${invoice.invoiceNumber}`,
      });
    }

    // 6. Add offset: credit AP
    jeLines.push({
      accountId: apAccount.id,
      debit: 0,
      credit: invoice.totalAmount || 0,
      description: `AP: ${invoice.invoiceNumber} - ${invoice.vendor?.name || 'Unknown'}`,
    });

    // 7. Create balanced journal entry
    const je = await createBalancedJournalEntry(tx, {
      officeId: invoice.officeId,
      userId: userId || null,
      description: `AP Invoice: ${invoice.invoiceNumber}`,
      referenceType: 'AP_INVOICE',
      reference: apInvoiceId,
      lines: jeLines,
    });

    // 8. Link invoice to journal entry
    await tx.aPInvoice.update({
      where: { id: apInvoiceId },
      data: {
        journalEntryId: je.id,
        status: 'APPROVED', // Mark as approved/posted
      },
    });

    return je;
  });
}

// ─── Helper: Post AP Payment to GL ────────────────────────────

/**
 * Post AP Payment as offset:
 * Dr. Accounts Payable
 *   Cr. Cash/Bank
 */
async function postAPPaymentToGL({ apPaymentId, userId }) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.apPayment.findUnique({
      where: { id: apPaymentId },
      include: {
        invoice: {
          include: { office: true },
        },
      },
    });

    if (!payment) {
      throw new Error(`AP Payment not found: ${apPaymentId}`);
    }

    // Check if already posted
    const existingJE = await tx.journalEntry.findFirst({
      where: {
        referenceType: 'AP_PAYMENT',
        reference: apPaymentId,
        status: 'POSTED',
      },
    });

    if (existingJE) {
      return existingJE;
    }

    // Ensure accounts
    const [apAccount, cashAccount] = await Promise.all([
      ensureAccount(tx, AP_CORE_ACCOUNTS.accountsPayable, payment.invoice.office.id),
      ensureAccount(
        tx,
        {
          code: '1100',
          name: 'Cash and Bank',
          type: 'ASSET',
          normalSide: 'DEBIT',
        },
        payment.invoice.office.id
      ),
    ]);

    const je = await createBalancedJournalEntry(tx, {
      officeId: payment.invoice.office.id,
      userId: userId || null,
      description: `AP Payment: ${payment.paymentNumber}`,
      referenceType: 'AP_PAYMENT',
      reference: apPaymentId,
      lines: [
        {
          accountId: apAccount.id,
          debit: payment.amount,
          credit: 0,
          description: `Payment against ${payment.invoice.invoiceNumber}`,
        },
        {
          accountId: cashAccount.id,
          debit: 0,
          credit: payment.amount,
          description: `Cash/Bank outflow - ${payment.paymentNumber}`,
        },
      ],
    });

    // Link payment to JE
    await tx.apPayment.update({
      where: { id: apPaymentId },
      data: {
        journalEntryId: je.id,
        status: 'PROCESSED',
      },
    });

    return je;
  });
}

module.exports = {
  postAPInvoiceToGL,
  postAPPaymentToGL,
  AP_CORE_ACCOUNTS,
};

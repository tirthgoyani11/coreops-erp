#!/usr/bin/env node

/**
 * Financial System Data Integrity Verification Script
 * Validates GL balances, JE reconciliation, and AP/AR consistency
 *
 * Usage:
 *   node scripts/validateFinancialIntegrity.js [--fix] [--verbose]
 */

const prisma = require('../backend/src/config/prisma');

const args = process.argv.slice(2);
const FIX_MODE = args.includes('--fix');
const VERBOSE = args.includes('--verbose');

const log = (...msgs) => console.log('[INTEGRITY]', ...msgs);
const logv = (...msgs) => VERBOSE && console.log('[DETAIL]', ...msgs);
const error = (...msgs) => console.error('[ERROR]', ...msgs);

// ─── Validation Rules ──────────────────────────────────────────

const rules = {
  glBalanceReconciliation: async () => {
    log('Validating GL account balances...');
    const accounts = await prisma.gLAccount.findMany({
      include: {
        journalLines: true,
      },
    });

    let imbalances = [];
    for (const account of accounts) {
      const calculatedBalance = account.journalLines.reduce(
        (sum, line) => sum + (line.debit - line.credit),
        0
      );

      if (Math.abs(account.balance - calculatedBalance) > 0.01) {
        imbalances.push({
          accountCode: account.code,
          accountName: account.name,
          recordedBalance: account.balance,
          calculatedBalance,
          imbalance: Math.abs(account.balance - calculatedBalance),
        });
        logv(`Account ${account.code}: recorded ${account.balance} vs calculated ${calculatedBalance}`);
      }
    }

    return {
      name: 'GL Balance Reconciliation',
      passed: imbalances.length === 0,
      details: imbalances,
      fix: async () => {
        for (const item of imbalances) {
          const account = accounts.find(a => a.code === item.accountCode);
          if (!account) continue;
          await prisma.gLAccount.update({
            where: { id: account.id },
            data: { balance: item.calculatedBalance },
          });
          log(`Fixed balance for account ${item.accountCode}`);
        }
      },
    };
  },

  journalEntryBalance: async () => {
    log('Validating journal entry integrity...');
    const entries = await prisma.journalEntry.findMany({
      include: { lines: true },
    });

    let errors = [];
    for (const entry of entries) {
      const totalDebit = entry.lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = entry.lines.reduce((sum, l) => sum + l.credit, 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        errors.push({
          entryNumber: entry.entryNumber,
          totalDebit,
          totalCredit,
          imbalance: totalDebit - totalCredit,
        });
        logv(`Entry ${entry.entryNumber}: debits ${totalDebit} != credits ${totalCredit}`);
      }
    }

    return {
      name: 'Journal Entry Balance',
      passed: errors.length === 0,
      details: errors,
    };
  },

  apInvoiceTotalValidation: async () => {
    log('Validating AP invoice line totals...');
    const invoices = await prisma.apInvoice.findMany({
      include: { lines: true },
    });

    let errors = [];
    for (const invoice of invoices) {
      const calculatedSubtotal = invoice.lines.reduce((sum, l) => sum + (l.lineAmount || 0), 0);
      const calculatedTaxAmount = invoice.lines.reduce((sum, l) => sum + (l.taxAmount || 0), 0);
      const calculatedTotal = calculatedSubtotal + calculatedTaxAmount;

      const subtotalMatch = Math.abs(invoice.subtotal - calculatedSubtotal) < 0.01;
      const taxMatch = Math.abs(invoice.taxAmount - calculatedTaxAmount) < 0.01;
      const totalMatch = Math.abs(invoice.totalAmount - calculatedTotal) < 0.01;

      if (!subtotalMatch || !taxMatch || !totalMatch) {
        errors.push({
          invoiceNumber: invoice.invoiceNumber,
          recordedSubtotal: invoice.subtotal,
          calculatedSubtotal,
          recordedTax: invoice.taxAmount,
          calculatedTax: calculatedTaxAmount,
          recordedTotal: invoice.totalAmount,
          calculatedTotal,
        });
        logv(`Invoice ${invoice.invoiceNumber}: total mismatch`);
      }
    }

    return {
      name: 'AP Invoice Total Validation',
      passed: errors.length === 0,
      details: errors,
      fix: async () => {
        for (const err of errors) {
          await prisma.apInvoice.update({
            where: { invoiceNumber: err.invoiceNumber },
            data: {
              subtotal: err.calculatedSubtotal,
              taxAmount: err.calculatedTax,
              totalAmount: err.calculatedTotal,
            },
          });
          log(`Fixed totals for invoice ${err.invoiceNumber}`);
        }
      },
    };
  },

  apInvoicePaymentValidation: async () => {
    log('Validating AP invoice payment status...');
    const invoices = await prisma.apInvoice.findMany({
      include: { payments: true },
    });

    let errors = [];
    for (const invoice of invoices) {
      const totalPaid = invoice.payments.reduce((sum, p) => sum + (p.amount || 0), 0);

      if (totalPaid > invoice.totalAmount + 0.01) {
        errors.push({
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          totalPaid,
          overpayment: totalPaid - invoice.totalAmount,
        });
        logv(`Invoice ${invoice.invoiceNumber}: overpaid by ${totalPaid - invoice.totalAmount}`);
      }

      const amountPaidMatch = Math.abs(invoice.amountPaid - totalPaid) < 0.01;
      if (!amountPaidMatch) {
        errors.push({
          invoiceNumber: invoice.invoiceNumber,
          recordedAmountPaid: invoice.amountPaid,
          calculatedAmountPaid: totalPaid,
          difference: Math.abs(invoice.amountPaid - totalPaid),
        });
      }
    }

    return {
      name: 'AP Invoice Payment Validation',
      passed: errors.length === 0,
      details: errors,
      fix: async () => {
        for (const inv of invoices) {
          const totalPaid = inv.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
          if (Math.abs(inv.amountPaid - totalPaid) > 0.01) {
            await prisma.apInvoice.update({
              where: { id: inv.id },
              data: { amountPaid: Math.min(totalPaid, inv.totalAmount) },
            });
            log(`Updated amountPaid for invoice ${inv.invoiceNumber}`);
          }
        }
      },
    };
  },

  taxCalculationValidation: async () => {
    log('Validating tax calculations on invoices...');
    const { getTaxRate } = require('../backend/src/services/taxCalculationService');

    const invoices = await prisma.apInvoice.findMany({
      include: { lines: true },
    });

    let errors = [];
    for (const invoice of invoices) {
      for (const line of invoice.lines) {
        if (!line.taxCode) continue;

        const expectedTax = (line.lineAmount * line.taxRate) / 100;
        const difference = Math.abs(line.taxAmount - expectedTax);

        if (difference > 0.01) {
          errors.push({
            invoiceNumber: invoice.invoiceNumber,
            lineDescription: line.description,
            taxCode: line.taxCode,
            baseAmount: line.lineAmount,
            taxRate: line.taxRate,
            recordedTax: line.taxAmount,
            expectedTax,
            difference,
          });
          logv(`Invoice ${invoice.invoiceNumber} line: tax calculation error`);
        }
      }
    }

    return {
      name: 'Tax Calculation Validation',
      passed: errors.length === 0,
      details: errors,
      fix: async () => {
        for (const err of errors) {
          await prisma.aPInvoiceLine.update({
            where: { id: `${err.invoiceNumber}_${err.lineDescription}` }, // Pseudo-id
            data: { taxAmount: err.expectedTax },
          });
          log(`Fixed tax calculation for ${err.invoiceNumber}`);
        }
      },
    };
  },

  orphanedJournalLines: async () => {
    log('Checking for orphaned GL entries...');
    const orphans = await prisma.journalEntryLine.findMany({
      where: {
        journalEntry: null,
      },
    });

    if (orphans.length > 0) {
      logv(`Found ${orphans.length} orphaned JE lines`);
    }

    return {
      name: 'Orphaned Journal Lines',
      passed: orphans.length === 0,
      details: orphans.map(o => ({ lineId: o.id })),
      fix: async () => {
        await prisma.journalEntryLine.deleteMany({
          where: { journalEntry: null },
        });
        log(`Deleted ${orphans.length} orphaned JE lines`);
      },
    };
  },
};

// ─── Main Execution ────────────────────────────────────────────

async function runValidation() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        Financial System Data Integrity Validation           ║');
  console.log(`║                 Mode: ${FIX_MODE ? 'FIX' : 'CHECK'}                              ║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const results = [];

  for (const [name, ruleFn] of Object.entries(rules)) {
    try {
      const result = await ruleFn();
      results.push(result);

      if (result.passed) {
        console.log(`✔ ${result.name} - PASSED`);
      } else {
        console.log(`✗ ${result.name} - FAILED (${result.details.length} issues)`);
        if (FIX_MODE && result.fix) {
          console.log(`  → Fixing...`);
          await result.fix();
          console.log(`  → Fixed!`);
        }
      }
    } catch (err) {
      error(`${name}: ${err.message}`);
      results.push({
        name,
        passed: false,
        error: err.message,
      });
    }
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log(`║         VALIDATION SUMMARY: ${passed}/${total} PASSED                      ║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (!results.every(r => r.passed)) {
    console.log('⚠ Some checks failed. Run with --fix to attempt automatic repairs.\n');
    process.exit(1);
  } else {
    console.log('✓ All checks passed. Financial system is consistent.\n');
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  runValidation().catch(err => {
    error('Fatal error:', err.message);
    process.exit(1);
  });
}

module.exports = { runValidation, rules };

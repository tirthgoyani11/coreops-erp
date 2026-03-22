/**
 * Tax Calculation & Reporting Service
 * Handles GST (Indian), VAT, and other multi-tax scenarios
 * Supports IGST (Interstate), SGST (State), CGST (Central), and VAT
 */

const prisma = require('../config/prisma');

// ─── Tax Type Definitions ──────────────────────────────────────

const TAX_TYPES = {
  GST_18: { code: 'GST18', rate: 18, type: 'GST', components: ['IGST'] },
  GST_12: { code: 'GST12', rate: 12, type: 'GST', components: ['IGST'] },
  GST_5: { code: 'GST5', rate: 5, type: 'GST', components: ['IGST'] },
  SGST_9: { code: 'SGST9', rate: 9, type: 'SGST', components: ['SGST', 'CGST'] },
  SGST_6: { code: 'SGST6', rate: 6, type: 'SGST', components: ['SGST', 'CGST'] },
  SGST_2_5: { code: 'SGST2.5', rate: 2.5, type: 'SGST', components: ['SGST', 'CGST'] },
  VAT_5: { code: 'VAT5', rate: 5, type: 'VAT', components: ['VAT'] },
};

// ─── Tax Rate Lookup & Calculation ─────────────────────────────

/**
 * Get tax rate from database or fallback to defaults
 */
async function getTaxRate(taxCode) {
  if (!taxCode) return null;

  const rate = await prisma.taxRate.findFirst({
    where: { code: taxCode, isActive: true },
  });

  if (rate) {
    return {
      code: rate.code,
      rate: rate.rate,
      type: rate.type,
      name: rate.name,
    };
  }

  // Fallback to TAX_TYPES
  return TAX_TYPES[taxCode] || null;
}

/**
 * Calculate tax amount for a line item
 * Returns: { taxCode, taxRate, taxAmount, breakdown }
 */
async function calculateLineTax(lineAmount, taxCode) {
  if (!taxCode || !lineAmount) return null;

  const taxDef = await getTaxRate(taxCode);
  if (!taxDef) {
    throw new Error(`Unknown tax code: ${taxCode}`);
  }

  const taxAmount = (lineAmount * taxDef.rate) / 100;

  // Breakdown for composite taxes (SGST + CGST)
  let breakdown = {};
  if (taxDef.type === 'SGST' && taxDef.components.includes('SGST')) {
    breakdown.sgst = taxAmount / 2;
    breakdown.cgst = taxAmount / 2;
  } else if (taxDef.type === 'GST') {
    breakdown.igst = taxAmount;
  } else if (taxDef.type === 'VAT') {
    breakdown.vat = taxAmount;
  }

  return {
    taxCode,
    taxRate: taxDef.rate,
    taxAmount: Math.round(taxAmount * 100) / 100,
    breakdown,
  };
}

// ─── Invoice Tax Summary ───────────────────────────────────────

/**
 * Calculate complete tax summary for an invoice
 * Groups by tax code and calculates input credits
 */
async function getInvoiceTaxSummary(invoiceId, invoiceType = 'AP') {
  const invoice = await prisma[invoiceType === 'AP' ? 'aPInvoice' : 'aRInvoice'].findUnique({
    where: { id: invoiceId },
    include: { lines: true },
  });

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  const taxSummary = {};
  let totalTax = 0;

  for (const line of invoice.lines) {
    if (!line.taxCode) continue;

    if (!taxSummary[line.taxCode]) {
      const taxDef = await getTaxRate(line.taxCode);
      taxSummary[line.taxCode] = {
        code: line.taxCode,
        rate: line.taxRate || (taxDef ? taxDef.rate : 0),
        lines: 0,
        baseAmount: 0,
        taxAmount: 0,
        breakdown: {},
        isInput: invoiceType === 'AP',
      };
    }

    const taxEntry = taxSummary[line.taxCode];
    taxEntry.lines++;
    taxEntry.baseAmount += line.lineAmount || 0;
    taxEntry.taxAmount += line.taxAmount || 0;
    totalTax += line.taxAmount || 0;

    // Update breakdown
    if (line.taxCode.includes('SGST')) {
      taxEntry.breakdown.sgst = (taxEntry.breakdown.sgst || 0) + (line.taxAmount || 0) / 2;
      taxEntry.breakdown.cgst = (taxEntry.breakdown.cgst || 0) + (line.taxAmount || 0) / 2;
    } else if (line.taxCode.includes('IGST') || line.taxCode.includes('GST')) {
      taxEntry.breakdown.igst = (taxEntry.breakdown.igst || 0) + (line.taxAmount || 0);
    } else if (line.taxCode.includes('VAT')) {
      taxEntry.breakdown.vat = (taxEntry.breakdown.vat || 0) + (line.taxAmount || 0);
    }
  }

  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceType,
    taxSummary: Object.values(taxSummary),
    totalTaxAmount: Math.round(totalTax * 100) / 100,
  };
}

// ─── Tax Reconciliation Report ────────────────────────────────

/**
 * Generate tax reconciliation by period
 * Groups invoices by tax type and compares input/output
 */
async function getTaxReconciliationReport({ startDate, endDate, officeId, taxType }) {
  const apDateFilter = {
    invoiceDate: {
      gte: new Date(startDate),
      lte: new Date(endDate),
    },
  };

  const arDateFilter = {
    createdAt: {
      gte: new Date(startDate),
      lte: new Date(endDate),
    },
  };

  const where = { ...apDateFilter };
  const arWhere = { ...arDateFilter };
  if (officeId) {
    where.officeId = officeId;
    arWhere.officeId = officeId;
  }

  // AP Invoices (Input tax)
  const apInvoices = await prisma.aPInvoice.findMany({
    where: { ...where, status: { in: ['APPROVED', 'MATCHED', 'PAID'] } },
    include: { lines: true },
  });

  // AR Invoices (Output tax)
  const arInvoices = await prisma.aRInvoice.findMany({
    where: { ...arWhere, status: { in: ['ISSUED', 'PARTIALLY_PAID', 'PAID'] } },
    include: { lines: true },
  });

  const taxLines = {};

  // Summarize AP (Input)
  for (const inv of apInvoices) {
    for (const line of inv.lines) {
      if (!line.taxCode) continue;
      if (taxType && line.taxCode !== taxType) continue;

      if (!taxLines[line.taxCode]) {
        taxLines[line.taxCode] = {
          code: line.taxCode,
          rate: line.taxRate,
          inputBase: 0,
          inputTax: 0,
          outputBase: 0,
          outputTax: 0,
          netTax: 0,
        };
      }

      taxLines[line.taxCode].inputBase += line.lineAmount || 0;
      taxLines[line.taxCode].inputTax += line.taxAmount || 0;
    }
  }

  // Summarize AR (Output)
  for (const inv of arInvoices) {
    for (const line of inv.lines) {
      if (!line.taxCode) continue;
      if (taxType && line.taxCode !== taxType) continue;

      if (!taxLines[line.taxCode]) {
        taxLines[line.taxCode] = {
          code: line.taxCode,
          rate: line.taxRate,
          inputBase: 0,
          inputTax: 0,
          outputBase: 0,
          outputTax: 0,
          netTax: 0,
        };
      }

      taxLines[line.taxCode].outputBase += line.lineAmount || 0;
      taxLines[line.taxCode].outputTax += line.taxAmount || 0;
    }
  }

  // Calculate net tax liability per tax type
  for (const code in taxLines) {
    const line = taxLines[code];
    line.netTax = line.outputTax - line.inputTax;
  }

  return {
    period: { startDate, endDate },
    summary: Object.values(taxLines),
    totals: {
      totalInputBase: Object.values(taxLines).reduce((s, l) => s + l.inputBase, 0),
      totalInputTax: Object.values(taxLines).reduce((s, l) => s + l.inputTax, 0),
      totalOutputBase: Object.values(taxLines).reduce((s, l) => s + l.outputBase, 0),
      totalOutputTax: Object.values(taxLines).reduce((s, l) => s + l.outputTax, 0),
      totalNetTax: Object.values(taxLines).reduce((s, l) => s + l.netTax, 0),
    },
  };
}

// ─── GST-Specific Report ──────────────────────────────────────

/**
 * Generate GST reconciliation (IGST, SGST, CGST breakdown)
 * India-specific GST compliance
 */
async function getGSTReconciliation({ startDate, endDate, officeId, state }) {
  const apDateFilter = {
    invoiceDate: {
      gte: new Date(startDate),
      lte: new Date(endDate),
    },
  };

  const arDateFilter = {
    createdAt: {
      gte: new Date(startDate),
      lte: new Date(endDate),
    },
  };

  const where = { ...apDateFilter };
  const arWhere = { ...arDateFilter };
  if (officeId) {
    where.officeId = officeId;
    arWhere.officeId = officeId;
  }

  const apInvoices = await prisma.aPInvoice.findMany({
    where: { ...where, status: { in: ['APPROVED', 'MATCHED', 'PAID'] } },
    include: { lines: true },
  });

  const arInvoices = await prisma.aRInvoice.findMany({
    where: { ...arWhere, status: { in: ['ISSUED', 'PARTIALLY_PAID', 'PAID'] } },
    include: { lines: true },
  });

  const gstSummary = {
    igst: { credit: 0, liability: 0, net: 0 },
    sgst: { credit: 0, liability: 0, net: 0 },
    cgst: { credit: 0, liability: 0, net: 0 },
  };

  // Input (AP)
  for (const inv of apInvoices) {
    for (const line of inv.lines) {
      if (!line.taxCode) continue;

      if (line.taxCode.includes('IGST')) {
        gstSummary.igst.credit += line.taxAmount || 0;
      } else if (line.taxCode.includes('SGST')) {
        gstSummary.sgst.credit += (line.taxAmount || 0) / 2;
        gstSummary.cgst.credit += (line.taxAmount || 0) / 2;
      }
    }
  }

  // Output (AR)
  for (const inv of arInvoices) {
    for (const line of inv.lines) {
      if (!line.taxCode) continue;

      if (line.taxCode.includes('IGST')) {
        gstSummary.igst.liability += line.taxAmount || 0;
      } else if (line.taxCode.includes('SGST')) {
        gstSummary.sgst.liability += (line.taxAmount || 0) / 2;
        gstSummary.cgst.liability += (line.taxAmount || 0) / 2;
      }
    }
  }

  // Calculate net
  for (const type in gstSummary) {
    gstSummary[type].net = gstSummary[type].liability - gstSummary[type].credit;
  }

  return {
    period: { startDate, endDate },
    state,
    gstSummary,
    totalLiability: gstSummary.igst.liability + gstSummary.sgst.liability + gstSummary.cgst.liability,
    totalCredit: gstSummary.igst.credit + gstSummary.sgst.credit + gstSummary.cgst.credit,
    netPayable:
      (gstSummary.igst.net + gstSummary.sgst.net + gstSummary.cgst.net),
  };
}

module.exports = {
  getTaxRate,
  calculateLineTax,
  getInvoiceTaxSummary,
  getTaxReconciliationReport,
  getGSTReconciliation,
  TAX_TYPES,
};

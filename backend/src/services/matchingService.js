/**
 * Invoice Matching Service
 * Implements 3-way matching: PO → GRN → AP Invoice
 * Pattern: SAP/ERPNext matching with variance tolerance
 */

const prisma = require('../config/prisma');

const DEFAULT_TOLERANCE = 0.005; // 0.5% default tolerance

// ─── Match AP Invoice Against PO & GRN ─────────────────────────

/**
 * Perform 3-way matching:
 * 1. Match invoice lines to PO items (quantity, price)
 * 2. Match to GRN receipts (received quantity)
 * 3. Check for over-receipts or pending invoices
 *
 * Returns: match status and variance details
 */
async function matchAPInvoiceToOrder({
  apInvoiceId,
  poId,
  grnId,
  tolerance = DEFAULT_TOLERANCE
}) {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch invoice
    const invoice = await tx.aPInvoice.findUnique({
      where: { id: apInvoiceId },
      include: { lines: true, po: { include: { items: true } }, grn: { include: { items: true } } },
    });

    if (!invoice) {
      throw new Error(`Invoice not found: ${apInvoiceId}`);
    }

    // Initialize match log
    const matchLog = [];
    let overallStatus = 'MATCHED';

    // 2. If PO provided, match quantities and prices
    if (poId || invoice.poId) {
      const po = invoice.po || await tx.purchaseOrder.findUnique({
        where: { id: poId },
        include: { items: true },
      });

      if (po) {
        for (const iline of invoice.lines) {
          const matched = po.items.find(pi => pi.description === iline.description);
          if (!matched) {
            matchLog.push({
              matchType: 'PO_MATCH',
              status: 'MISMATCH',
              description: `Invoice line "${iline.description}" not found in PO`,
            });
            overallStatus = 'PARTIALLY_MATCHED';
            continue;
          }

          // Check quantity variance
          const qtyVariance = Math.abs(iline.quantity - matched.quantity);
          const qtyVariancePercent =  qtyVariance / matched.quantity;
          if (qtyVariancePercent > tolerance) {
            matchLog.push({
              matchType: 'QTY_VARIANCE',
              status: 'MISMATCH',
              description: `PO: ${matched.quantity}, Invoice: ${iline.quantity}`,
              variance: qtyVariance,
              toleranceLimit: tolerance,
            });
            overallStatus = 'PARTIALLY_MATCHED';
          } else {
            matchLog.push({
              matchType: 'QTY_VARIANCE',
              status: 'SUCCESS',
              variance: qtyVariance,
            });
          }

          // Check price variance
          const priceVariance = Math.abs(iline.unitPrice - matched.unitPrice);
          const priceVariancePercent = priceVariance / matched.unitPrice;
          if (priceVariancePercent > tolerance) {
            matchLog.push({
              matchType: 'PRICE_VARIANCE',
              status: 'MISMATCH',
              description: `PO: ${matched.unitPrice}, Invoice: ${iline.unitPrice}`,
              variance: priceVariance,
              toleranceLimit: tolerance,
            });
            overallStatus = 'PARTIALLY_MATCHED';
          } else {
            matchLog.push({
              matchType: 'PRICE_VARIANCE',
              status: 'SUCCESS',
              variance: priceVariance,
            });
          }
        }
      }
    }

    // 3. If GRN provided, match against receipts
    if (grnId || invoice.grnId) {
      const grn = invoice.grn || await tx.goodsReceipt.findUnique({
        where: { id: grnId },
        include: { items: true },
      });

      if (grn) {
        for (const iline of invoice.lines) {
          const grnItem = grn.items.find(gi => gi.poItemId === iline.id);
          if (!grnItem) {
            matchLog.push({
              matchType: 'GRN_MATCH',
              status: 'MISMATCH',
              description: `Invoice line not found in GRN`,
            });
            overallStatus = 'PARTIALLY_MATCHED';
            continue;
          }

          // Check against accepted quantity
          const accepted = grnItem.quantityAccepted || grnItem.quantityReceived;
          const qtyVariance = Math.abs(iline.quantity - accepted);
          const qtyVariancePercent = qtyVariance / accepted;
          if (qtyVariancePercent > tolerance) {
            matchLog.push({
              matchType: 'GRN_QTY_VARIANCE',
              status: 'TOLERANCE_EXCEEDED',
              description: `GRN accepted: ${accepted}, Invoice: ${iline.quantity}`,
              variance: qtyVariance,
            });
            overallStatus = 'PARTIALLY_MATCHED';
          }
        }
      }
    }

    // 4. Log all matches
    if (matchLog.length > 0) {
      await tx.invoiceMatchLog.createMany({
        data: matchLog.map(m => ({
          invoiceId: apInvoiceId,
          ...m,
        })),
      });
    }

    // 5. Update invoice match status
    await tx.aPInvoice.update({
      where: { id: apInvoiceId },
      data: {
        matchStatus: overallStatus === 'SUCCESS' ? 'MATCHED' : overallStatus,
      },
    });

    return {
      invoiceId: apInvoiceId,
      status: overallStatus,
      matchLog,
    };
  });
}

// ─── Calculate Invoice Match Status ────────────────────────────

async function calculateInvoiceMatchStatus(apInvoiceId) {
  const matchLogs = await prisma.invoiceMatchLog.findMany({
    where: { invoiceId: apInvoiceId },
  });

  if (matchLogs.length === 0) return 'UNMATCHED';

  const mismatches = matchLogs.filter(m => m.status !== 'SUCCESS');
  if (mismatches.length === 0) return 'MATCHED';
  if (mismatches.length < matchLogs.length / 2) return 'PARTIALLY_MATCHED';
  if (mismatches.some(m => m.status === 'TOLERANCE_EXCEEDED'))
    return 'OVER_MATCHED';
  return 'ERROR';
}

// ─── Get Matching Status for Multiple Invoices ─────────────────

async function getMatchingReport({ officeId, status, poId, grnId }) {
  const where = {};
  if (officeId) where.officeId = officeId;
  if (status) where.matchStatus = status;
  if (poId) where.poId = poId;
  if (grnId) where.grnId = grnId;

  const invoices = await prisma.aPInvoice.findMany({
    where,
    include: {
      lines: true,
      vendor: { select: { name: true } },
      matchLog: true,
    },
  });

  return invoices.map(inv => ({
    invoiceNumber: inv.invoiceNumber,
    vendor: inv.vendor.name,
    totalAmount: inv.totalAmount,
    matchStatus: inv.matchStatus,
    variances: inv.matchLog.filter(m => m.status !== 'SUCCESS').length,
    criticalVariances: inv.matchLog.filter(m => m.status === 'TOLERANCE_EXCEEDED').length,
  }));
}

module.exports = {
  matchAPInvoiceToOrder,
  calculateInvoiceMatchStatus,
  getMatchingReport,
  DEFAULT_TOLERANCE,
};

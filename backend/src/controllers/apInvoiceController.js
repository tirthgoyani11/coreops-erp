/**
 * AP Invoice Controller
 * Handles AP invoice creation, approval, matching, and GL posting
 */

const prisma = require('../config/prisma');
const { postAPInvoiceToGL, postAPPaymentToGL } = require('../services/apInvoicePostingService');
const { calculateInvoiceMatchStatus } = require('../services/matchingService');

// ─── GET AP INVOICES ───────────────────────────────────────────

exports.getAPInvoices = async (req, res) => {
  try {
    const { vendorId, status, officeId, page = 1, limit = 50, search } = req.query;
    const where = {};

    const take = Math.min(parseInt(limit) || 50, 200);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

    // Scope to user's office unless super admin
    if (req.user.role !== 'SUPER_ADMIN') {
      where.officeId = req.user.officeId;
    } else if (officeId) {
      where.officeId = officeId;
    }

    if (vendorId) where.vendorId = vendorId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { vendor: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.aPInvoice.findMany({
        where,
        include: {
          vendor: { select: { id: true, name: true, vendorCode: true } },
          po: { select: { id: true, poNumber: true } },
          grn: { select: { id: true, grnNumber: true } },
          lines: true,
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { invoiceDate: 'desc' },
        skip,
        take,
      }),
      prisma.aPInvoice.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      count: invoices.length,
      total,
      page: Math.max(parseInt(page) || 1, 1),
      totalPages: Math.ceil(total / take),
      data: invoices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AP invoices',
      error: error.message,
    });
  }
};

// ─── GET AP INVOICE BY ID ──────────────────────────────────────

exports.getAPInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.aPInvoice.findUnique({
      where: { id },
      include: {
        vendor: true,
        po: { include: { items: true } },
        grn: { include: { items: true } },
        lines: { include: { glAccount: true } },
        payments: true,
        journalEntry: { include: { lines: { include: { account: true } } } },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true } },
        matchLog: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'AP Invoice not found',
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AP invoice',
      error: error.message,
    });
  }
};

// ─── CREATE AP INVOICE ─────────────────────────────────────────

exports.createAPInvoice = async (req, res) => {
  try {
    const {
      invoiceNumber,
      poId,
      vendorId,
      grnId,
      invoiceDate,
      dueDate,
      subtotal,
      taxAmount,
      totalAmount,
      currency = 'INR',
      description,
      lines,
    } = req.body;

    // Validation
    if (!invoiceNumber || !vendorId || !invoiceDate || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'invoiceNumber, vendorId, invoiceDate, and dueDate are required',
      });
    }

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice must have at least one line item',
      });
    }

    // Check duplicate invoice number
    const existing = await prisma.aPInvoice.findUnique({
      where: { invoiceNumber },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Invoice number ${invoiceNumber} already exists`,
      });
    }

    // Create invoice in transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // Calculate totals if not provided
      let calcSubtotal = subtotal || 0;
      let calcTaxAmount = taxAmount || 0;

      if (!subtotal || !taxAmount) {
        for (const line of lines) {
          const lineAmount = (line.quantity || 1) * (line.unitPrice || 0);
          const lineTax = lineAmount * ((line.taxRate || 0) / 100);
          calcSubtotal += lineAmount;
          calcTaxAmount += lineTax;
        }
      }

      const calcTotal = (parseFloat(calcSubtotal) || 0) + (parseFloat(calcTaxAmount) || 0);

      const created = await tx.aPInvoice.create({
        data: {
          invoiceNumber,
          vendorId,
          officeId: req.user.officeId,
          poId: poId || null,
          grnId: grnId || null,
          invoiceDate: new Date(invoiceDate),
          dueDate: new Date(dueDate),
          subtotal: calcSubtotal,
          taxAmount: calcTaxAmount,
          totalAmount: calcTotal,
          currency,
          description,
          status: 'DRAFT',
          matchStatus: 'UNMATCHED',
          createdById: req.user.id,
          lines: {
            create: lines.map((line) => ({
              description: line.description,
              quantity: line.quantity || 1,
              unitPrice: line.unitPrice || 0,
              lineAmount: (line.quantity || 1) * (line.unitPrice || 0),
              taxCode: line.taxCode || null,
              taxRate: line.taxRate || 0,
              taxAmount: ((line.quantity || 1) * (line.unitPrice || 0) * ((line.taxRate || 0) / 100)),
              glAccountId: line.glAccountId || null,
            })),
          },
        },
        include: { lines: true, vendor: true },
      });

      return created;
    });

    res.status(201).json({
      success: true,
      message: 'AP Invoice created successfully',
      data: invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create AP invoice',
      error: error.message,
    });
  }
};

// ─── APPROVE AP INVOICE ────────────────────────────────────────

exports.approveAPInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const invoice = await prisma.aPInvoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'AP Invoice not found',
      });
    }

    if (invoice.status !== 'DRAFT' && invoice.status !== 'SUBMITTED') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve invoice in ${invoice.status} status`,
      });
    }

    // Update status and mark as approved
    const updated = await prisma.aPInvoice.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: req.user.id,
        approvalDate: new Date(),
        notes: notes || invoice.notes,
      },
      include: { lines: true, vendor: true },
    });

    res.status(200).json({
      success: true,
      message: 'AP Invoice approved',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve AP invoice',
      error: error.message,
    });
  }
};

// ─── POST AP INVOICE TO GL ────────────────────────────────────

exports.postAPInvoiceToGL = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.aPInvoice.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'AP Invoice not found',
      });
    }

    if (invoice.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Only APPROVED invoices can be posted to GL',
      });
    }

    // Post to GL
    const je = await postAPInvoiceToGL({
      apInvoiceId: id,
      userId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: 'AP Invoice posted to GL',
      data: {
        journalEntryId: je.id,
        entryNumber: je.entryNumber,
        totalDebits: je.totalAmount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to post AP invoice to GL',
      error: error.message,
    });
  }
};

// ─── GET AP AGING REPORT ──────────────────────────────────────

exports.getAPAging = async (req, res) => {
  try {
    const { officeId, asOf = new Date() } = req.query;
    const where = {
      status: { in: ['APPROVED', 'MATCHED', 'PARTIALLY_PAID'] },
      dueDate: { lte: new Date(asOf) },
    };

    if (req.user.role !== 'SUPER_ADMIN') {
      where.officeId = req.user.officeId;
    } else if (officeId) {
      where.officeId = officeId;
    }

    const invoices = await prisma.aPInvoice.findMany({
      where,
      include: { vendor: true, payments: true },
      orderBy: { dueDate: 'asc' },
    });

    // Group by aging bucket
    const refDate = new Date(asOf);
    const buckets = {
      current: { label: 'Current (0-30 days)', amount: 0, count: 0, invoices: [] },
      thirtyDays: { label: '30-60 days', amount: 0, count: 0, invoices: [] },
      sixtyDays: { label: '60-90 days', amount: 0, count: 0, invoices: [] },
      ninetyDays: { label: '90+ days', amount: 0, count: 0, invoices: [] },
    };

    for (const inv of invoices) {
      const remaining = inv.totalAmount - (inv.amountPaid || 0);
      if (remaining <= 0) continue;

      const daysDue = Math.ceil((refDate - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));

      if (daysDue <= 30) {
        buckets.current.amount += remaining;
        buckets.current.count++;
        buckets.current.invoices.push({ invoiceNumber: inv.invoiceNumber, amount: remaining });
      } else if (daysDue <= 60) {
        buckets.thirtyDays.amount += remaining;
        buckets.thirtyDays.count++;
        buckets.thirtyDays.invoices.push({ invoiceNumber: inv.invoiceNumber, amount: remaining });
      } else if (daysDue <= 90) {
        buckets.sixtyDays.amount += remaining;
        buckets.sixtyDays.count++;
        buckets.sixtyDays.invoices.push({ invoiceNumber: inv.invoiceNumber, amount: remaining });
      } else {
        buckets.ninetyDays.amount += remaining;
        buckets.ninetyDays.count++;
        buckets.ninetyDays.invoices.push({ invoiceNumber: inv.invoiceNumber, amount: remaining });
      }
    }

    const totalOutstanding = Object.values(buckets).reduce((sum, b) => sum + b.amount, 0);

    res.status(200).json({
      success: true,
      asOf,
      totalOutstanding,
      buckets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate AP aging report',
      error: error.message,
    });
  }
};

module.exports = {
  getAPInvoices: exports.getAPInvoices,
  getAPInvoiceById: exports.getAPInvoiceById,
  createAPInvoice: exports.createAPInvoice,
  approveAPInvoice: exports.approveAPInvoice,
  postAPInvoiceToGL: exports.postAPInvoiceToGL,
  getAPAging: exports.getAPAging,
};

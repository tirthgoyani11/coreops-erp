const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/errorHandler');

// Helper to calculate aging buckets
const calculateAging = (invoices) => {
    const today = new Date();

    const buckets = {
        current: 0,
        thirtyDays: 0,
        sixtyDays: 0,
        ninetyDays: 0,
        overNinetyDays: 0,
        total: 0
    };

    const details = [];

    invoices.forEach(inv => {
        const remaining = inv.totalAmount - (inv.amountPaid || 0); // Assuming full amount if amountPaid is not present, wait, Invoice model only has totalAmount. We'll use totalAmount for simple aging.
        const amount = inv.totalAmount;

        buckets.total += amount;

        let bucket = 'current';
        if (inv.dueDate && new Date(inv.dueDate) < today) {
            const diffTime = Math.abs(today - new Date(inv.dueDate));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 30) {
                bucket = 'thirtyDays';
                buckets.thirtyDays += amount;
            } else if (diffDays <= 60) {
                bucket = 'sixtyDays';
                buckets.sixtyDays += amount;
            } else if (diffDays <= 90) {
                bucket = 'ninetyDays';
                buckets.ninetyDays += amount;
            } else {
                bucket = 'overNinetyDays';
                buckets.overNinetyDays += amount;
            }
        } else {
            buckets.current += amount;
        }

        details.push({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            dueDate: inv.dueDate,
            amount,
            bucket
        });
    });

    return { buckets, details };
};

// ── AP AGING (Purchase Invoices) ──────────────────────────────────
exports.getAPAging = asyncHandler(async (req, res) => {
    // AP = Accounts Payable = PURCHASE invoices that are not PAID
    const invoices = await prisma.invoice.findMany({
        where: {
            type: 'PURCHASE',
            status: { in: ['PENDING', 'OVERDUE'] }
        },
        include: {
            // Include vendor if we had a full vendor relation in Invoice, but vendorId is just a string. 
            // We'll group by vendorId in JS.
        }
    });

    // We might have vendor details in Vendor table, let's fetch Vendors
    const vendorIds = [...new Set(invoices.map(i => i.vendorId).filter(Boolean))];
    const vendors = await prisma.vendor.findMany({
        where: { id: { in: vendorIds } },
        select: { id: true, name: true }
    });
    const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v.name]));

    const grouped = {};
    const overallTotals = {
        current: 0, thirtyDays: 0, sixtyDays: 0, ninetyDays: 0, overNinetyDays: 0, total: 0
    };

    invoices.forEach(inv => {
        const vId = inv.vendorId || 'UNKNOWN';
        if (!grouped[vId]) grouped[vId] = [];
        grouped[vId].push(inv);
    });

    const report = Object.keys(grouped).map(vId => {
        const vendorName = vendorMap[vId] || 'Unknown Vendor';
        const { buckets, details } = calculateAging(grouped[vId]);

        // Add to overall totals
        Object.keys(overallTotals).forEach(key => {
            overallTotals[key] += buckets[key];
        });

        return {
            vendorId: vId,
            vendorName,
            buckets,
            invoices: details
        };
    });

    res.status(200).json({
        success: true,
        data: {
            summary: overallTotals,
            vendors: report
        }
    });
});

// ── AR AGING (Sales Invoices) ─────────────────────────────────────
exports.getARAging = asyncHandler(async (req, res) => {
    // AR = Accounts Receivable = SALES invoices that are not PAID
    const invoices = await prisma.invoice.findMany({
        where: {
            type: 'SALES',
            status: { in: ['PENDING', 'OVERDUE'] }
        }
    });

    // In a real system, there would be a Customer model, but since we don't have one, we just group by customerId
    const grouped = {};
    const overallTotals = {
        current: 0, thirtyDays: 0, sixtyDays: 0, ninetyDays: 0, overNinetyDays: 0, total: 0
    };

    invoices.forEach(inv => {
        const cId = inv.customerId || 'UNKNOWN';
        if (!grouped[cId]) grouped[cId] = [];
        grouped[cId].push(inv);
    });

    const report = Object.keys(grouped).map(cId => {
        const { buckets, details } = calculateAging(grouped[cId]);

        Object.keys(overallTotals).forEach(key => {
            overallTotals[key] += buckets[key];
        });

        return {
            customerId: cId,
            customerName: cId === 'UNKNOWN' ? 'Unknown Customer' : `Customer ${cId.substring(0, 4)}`,
            buckets,
            invoices: details
        };
    });

    res.status(200).json({
        success: true,
        data: {
            summary: overallTotals,
            customers: report
        }
    });
});

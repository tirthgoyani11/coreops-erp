const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const prisma = require('../config/prisma');

/**
 * 3-Way Matching Routes (Prisma)
 * Matches PO items vs GRN (received quantities) vs Invoice amounts.
 */

const TOLERANCES = {
    quantityPercent: 5,
    pricePercent: 2,
};

// POST /api/procurement/match/:poId
router.post('/match/:poId', protect, async (req, res) => {
    try {
        const { invoiceItems } = req.body;

        if (!invoiceItems || !Array.isArray(invoiceItems)) {
            return res.status(400).json({ success: false, message: 'invoiceItems array is required' });
        }

        const po = await prisma.purchaseOrder.findUnique({
            where: { id: req.params.poId },
            include: {
                vendor: { select: { id: true, name: true } },
                items: true,
            },
        });

        if (!po) return res.status(404).json({ success: false, message: 'Purchase Order not found' });

        const matchResults = [];
        let overallStatus = 'MATCHED';

        for (const poItem of po.items) {
            const invoiceItem = invoiceItems.find(
                inv => inv.name?.toLowerCase() === poItem.name?.toLowerCase()
            );

            const result = {
                poItem: {
                    name: poItem.name,
                    orderedQty: poItem.quantity,
                    unitPrice: poItem.unitPrice,
                    totalPrice: poItem.totalPrice,
                },
                receivedQty: poItem.receivedQuantity || 0,
                invoiceItem: invoiceItem || null,
                matches: {
                    poToGrn: { status: 'N/A', detail: '' },
                    poToInvoice: { status: 'N/A', detail: '' },
                    grnToInvoice: { status: 'N/A', detail: '' },
                },
                overallMatch: 'UNMATCHED',
            };

            // Match 1: PO → GRN (Quantity)
            const grnQtyDiff = Math.abs(poItem.quantity - (poItem.receivedQuantity || 0));
            const grnQtyPct = poItem.quantity > 0 ? (grnQtyDiff / poItem.quantity) * 100 : 0;

            if (grnQtyDiff === 0) {
                result.matches.poToGrn = { status: 'EXACT', detail: 'Quantities match exactly' };
            } else if (grnQtyPct <= TOLERANCES.quantityPercent) {
                result.matches.poToGrn = { status: 'WITHIN_TOLERANCE', detail: `${grnQtyPct.toFixed(1)}% variance (tolerance: ${TOLERANCES.quantityPercent}%)` };
            } else {
                result.matches.poToGrn = { status: 'MISMATCH', detail: `${grnQtyPct.toFixed(1)}% variance exceeds ${TOLERANCES.quantityPercent}% tolerance. Ordered: ${poItem.quantity}, Received: ${poItem.receivedQuantity || 0}` };
                overallStatus = 'PARTIAL_MATCH';
            }

            // Match 2 & 3: Invoice comparisons
            if (invoiceItem) {
                const priceDiff = Math.abs(poItem.unitPrice - invoiceItem.unitPrice);
                const pricePct = poItem.unitPrice > 0 ? (priceDiff / poItem.unitPrice) * 100 : 0;

                if (priceDiff === 0) {
                    result.matches.poToInvoice = { status: 'EXACT', detail: 'Unit prices match exactly' };
                } else if (pricePct <= TOLERANCES.pricePercent) {
                    result.matches.poToInvoice = { status: 'WITHIN_TOLERANCE', detail: `${pricePct.toFixed(1)}% price variance` };
                } else {
                    result.matches.poToInvoice = { status: 'MISMATCH', detail: `Price variance ${pricePct.toFixed(1)}% exceeds ${TOLERANCES.pricePercent}% tolerance. PO: ₹${poItem.unitPrice}, Invoice: ₹${invoiceItem.unitPrice}` };
                    overallStatus = 'MISMATCH';
                }

                const invQtyDiff = Math.abs((poItem.receivedQuantity || 0) - invoiceItem.quantity);
                const invQtyPct = invoiceItem.quantity > 0 ? (invQtyDiff / invoiceItem.quantity) * 100 : 0;

                if (invQtyDiff === 0) {
                    result.matches.grnToInvoice = { status: 'EXACT', detail: 'Invoice qty matches received qty' };
                } else if (invQtyPct <= TOLERANCES.quantityPercent) {
                    result.matches.grnToInvoice = { status: 'WITHIN_TOLERANCE', detail: `${invQtyPct.toFixed(1)}% quantity variance` };
                } else {
                    result.matches.grnToInvoice = { status: 'MISMATCH', detail: `Received: ${poItem.receivedQuantity || 0}, Invoiced: ${invoiceItem.quantity}` };
                    overallStatus = 'MISMATCH';
                }

                const allExact = Object.values(result.matches).every(m => m.status === 'EXACT');
                const anyMismatch = Object.values(result.matches).some(m => m.status === 'MISMATCH');
                result.overallMatch = allExact ? 'EXACT' : anyMismatch ? 'MISMATCH' : 'WITHIN_TOLERANCE';
            } else {
                result.matches.poToInvoice = { status: 'MISSING', detail: 'No matching invoice line item found' };
                result.matches.grnToInvoice = { status: 'MISSING', detail: 'No matching invoice line item found' };
                result.overallMatch = 'UNMATCHED';
                overallStatus = 'MISMATCH';
            }

            matchResults.push(result);
        }

        const poTotal = po.items.reduce((sum, i) => sum + (i.totalPrice || 0), 0);
        const invoiceTotal = invoiceItems.reduce((sum, i) => sum + (i.totalPrice || i.quantity * i.unitPrice || 0), 0);
        const totalDiff = Math.abs(poTotal - invoiceTotal);
        const totalPct = poTotal > 0 ? (totalDiff / poTotal) * 100 : 0;

        res.json({
            success: true,
            data: {
                poNumber: po.poNumber,
                vendor: po.vendor?.name,
                overallStatus,
                tolerances: TOLERANCES,
                grandTotal: {
                    po: poTotal,
                    invoice: invoiceTotal,
                    variancePercent: Math.round(totalPct * 100) / 100,
                    status: totalPct <= TOLERANCES.pricePercent ? 'WITHIN_TOLERANCE' : 'MISMATCH',
                },
                lineItems: matchResults,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

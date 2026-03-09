/**
 * Inventory Valuation Service — FIFO, LIFO, Weighted Average Cost
 */
const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/errorHandler');

// ── FIFO Valuation ─────────────────────────────────────
function calculateFIFO(batches) {
    // Sort by received date ascending (first in)
    const sorted = [...batches].sort((a, b) => new Date(a.receivedDate) - new Date(b.receivedDate));
    let totalValue = 0;
    let totalQuantity = 0;

    for (const batch of sorted) {
        if (batch.remainingQuantity > 0 && batch.costPerUnit) {
            totalValue += batch.remainingQuantity * batch.costPerUnit;
            totalQuantity += batch.remainingQuantity;
        }
    }

    return { method: 'FIFO', totalQuantity, totalValue, avgCostPerUnit: totalQuantity > 0 ? totalValue / totalQuantity : 0 };
}

// ── LIFO Valuation ─────────────────────────────────────
function calculateLIFO(batches) {
    // Sort by received date descending (last in)
    const sorted = [...batches].sort((a, b) => new Date(b.receivedDate) - new Date(a.receivedDate));
    let totalValue = 0;
    let totalQuantity = 0;

    for (const batch of sorted) {
        if (batch.remainingQuantity > 0 && batch.costPerUnit) {
            totalValue += batch.remainingQuantity * batch.costPerUnit;
            totalQuantity += batch.remainingQuantity;
        }
    }

    return { method: 'LIFO', totalQuantity, totalValue, avgCostPerUnit: totalQuantity > 0 ? totalValue / totalQuantity : 0 };
}

// ── Weighted Average Cost ──────────────────────────────
function calculateWAC(batches) {
    let totalValue = 0;
    let totalQuantity = 0;

    for (const batch of batches) {
        if (batch.remainingQuantity > 0 && batch.costPerUnit) {
            totalValue += batch.remainingQuantity * batch.costPerUnit;
            totalQuantity += batch.remainingQuantity;
        }
    }

    return { method: 'WAC', totalQuantity, totalValue, avgCostPerUnit: totalQuantity > 0 ? totalValue / totalQuantity : 0 };
}

// ── API: Get Valuation for Single Item ─────────────────
exports.getItemValuation = asyncHandler(async (req, res) => {
    const { inventoryId } = req.params;
    const method = (req.query.method || 'WAC').toUpperCase();

    const batches = await prisma.inventoryBatch.findMany({
        where: { inventoryId, status: 'AVAILABLE', remainingQuantity: { gt: 0 } },
    });

    let result;
    switch (method) {
        case 'FIFO': result = calculateFIFO(batches); break;
        case 'LIFO': result = calculateLIFO(batches); break;
        default: result = calculateWAC(batches);
    }

    res.status(200).json({ success: true, data: result });
});

// ── API: Get Full Inventory Valuation Report ───────────
exports.getValuationReport = asyncHandler(async (req, res) => {
    const method = (req.query.method || 'WAC').toUpperCase();
    const where = {};
    if (req.user.role !== 'SUPER_ADMIN') {
        where.officeId = req.user.officeId;
    }

    const inventoryItems = await prisma.inventory.findMany({
        where: { ...where, isActive: true },
        include: {
            batches: { where: { status: 'AVAILABLE', remainingQuantity: { gt: 0 } } },
            office: { select: { name: true } },
        },
    });

    const calculator = method === 'FIFO' ? calculateFIFO : method === 'LIFO' ? calculateLIFO : calculateWAC;

    const items = inventoryItems.map(item => {
        const valuation = calculator(item.batches);
        return {
            id: item.id,
            name: item.name,
            sku: item.sku,
            category: item.category,
            office: item.office?.name,
            currentQuantity: item.currentQuantity,
            ...valuation,
        };
    });

    const totals = items.reduce((acc, item) => ({
        totalQuantity: acc.totalQuantity + item.totalQuantity,
        totalValue: acc.totalValue + item.totalValue,
    }), { totalQuantity: 0, totalValue: 0 });

    res.status(200).json({
        success: true,
        data: {
            method,
            ...totals,
            itemCount: items.length,
            items,
        },
    });
});

module.exports.calculateFIFO = calculateFIFO;
module.exports.calculateLIFO = calculateLIFO;
module.exports.calculateWAC = calculateWAC;

const prisma = require('../config/prisma');

/**
 * Analytics Controller (Prisma)
 * Dashboard statistics and reports for ERP insights.
 */

function getOfficeWhere(user) {
    if (user.role === 'SUPER_ADMIN') return {};
    const oid = user.office?.id || user.officeId;
    return { officeId: typeof oid === 'object' ? oid.id : oid };
}

// GET /api/analytics/dashboard
exports.getDashboardStats = async (req, res) => {
    try {
        const where = getOfficeWhere(req.user);

        const [
            totalAssets, activeAssets, maintenanceAssets, retiredAssets,
            totalInventory, openTickets, pendingApprovals, vendorCount,
            assetValueAgg,
        ] = await Promise.all([
            prisma.asset.count({ where }),
            prisma.asset.count({ where: { ...where, status: 'ACTIVE' } }),
            prisma.asset.count({ where: { ...where, status: 'MAINTENANCE' } }),
            prisma.asset.count({ where: { ...where, status: { in: ['RETIRED', 'SOLD', 'DECOMMISSIONED'] } } }),
            prisma.inventory.count({ where }),
            prisma.maintenanceTicket.count({ where: { ...where, status: { in: ['REQUESTED', 'IN_PROGRESS', 'APPROVED'] } } }),
            prisma.maintenanceTicket.count({ where: { ...where, approvalStatus: 'PENDING' } }),
            prisma.vendor.count({ where: { isBlacklisted: false } }),
            prisma.asset.aggregate({ where: { ...where, status: 'ACTIVE' }, _sum: { currentBookValue: true } }),
        ]);

        // Low stock items
        const allInv = await prisma.inventory.findMany({
            where,
            select: { currentQuantity: true, reorderPoint: true },
        });
        const lowStockCount = allInv.filter(i => i.currentQuantity <= i.reorderPoint).length;

        // Monthly transactions
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const incomeAgg = await prisma.transaction.aggregate({
            where: { ...where, type: 'INCOME', date: { gte: oneMonthAgo } },
            _sum: { amount: true }, _count: { id: true },
        });
        const expenseAgg = await prisma.transaction.aggregate({
            where: { ...where, type: 'EXPENSE', date: { gte: oneMonthAgo } },
            _sum: { amount: true }, _count: { id: true },
        });

        res.json({
            success: true,
            data: {
                assets: {
                    total: totalAssets, active: activeAssets,
                    byStatus: [
                        { _id: 'ACTIVE', count: activeAssets },
                        { _id: 'MAINTENANCE', count: maintenanceAssets },
                        { _id: 'RETIRED', count: retiredAssets },
                    ],
                    totalValue: assetValueAgg._sum.currentBookValue || 0,
                },
                inventory: { total: totalInventory, lowStock: lowStockCount },
                maintenance: { openTickets, pendingApprovals },
                vendors: { total: vendorCount },
                finance: {
                    monthlyTransactions: [
                        { _id: 'INCOME', total: incomeAgg._sum.amount || 0, count: incomeAgg._count.id },
                        { _id: 'EXPENSE', total: expenseAgg._sum.amount || 0, count: expenseAgg._count.id },
                    ],
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats', error: error.message });
    }
};

// GET /api/analytics/assets/by-category
exports.getAssetsByCategory = async (req, res) => {
    try {
        const where = { ...getOfficeWhere(req.user), status: 'ACTIVE' };

        const result = await prisma.asset.groupBy({
            by: ['category'],
            where,
            _count: { id: true },
            _sum: { currentBookValue: true, purchasePrice: true },
        });

        res.json({
            success: true,
            data: result.map(r => ({
                _id: r.category,
                count: r._count.id,
                totalValue: r._sum.currentBookValue || 0,
                totalPurchasePrice: r._sum.purchasePrice || 0,
            })).sort((a, b) => b.totalValue - a.totalValue),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch asset categories', error: error.message });
    }
};

// GET /api/analytics/assets/depreciation
exports.getDepreciationSummary = async (req, res) => {
    try {
        const where = { ...getOfficeWhere(req.user), status: 'ACTIVE' };

        const assets = await prisma.asset.findMany({
            where,
            select: { category: true, purchasePrice: true, currentBookValue: true },
        });

        const byCategory = {};
        for (const asset of assets) {
            const cat = asset.category || 'UNKNOWN';
            if (!byCategory[cat]) byCategory[cat] = { assetCount: 0, totalPurchasePrice: 0, totalBookValue: 0 };
            byCategory[cat].assetCount++;
            byCategory[cat].totalPurchasePrice += asset.purchasePrice || 0;
            byCategory[cat].totalBookValue += asset.currentBookValue || 0;
        }

        const result = Object.entries(byCategory).map(([cat, data]) => ({
            _id: cat,
            ...data,
            totalDepreciation: data.totalPurchasePrice - data.totalBookValue,
        })).sort((a, b) => b.totalDepreciation - a.totalDepreciation);

        const totals = result.reduce((acc, c) => ({
            totalPurchasePrice: acc.totalPurchasePrice + c.totalPurchasePrice,
            totalBookValue: acc.totalBookValue + c.totalBookValue,
            totalDepreciation: acc.totalDepreciation + c.totalDepreciation,
        }), { totalPurchasePrice: 0, totalBookValue: 0, totalDepreciation: 0 });

        res.json({ success: true, data: { byCategory: result, totals } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch depreciation summary', error: error.message });
    }
};

// GET /api/analytics/maintenance/trends
exports.getMaintenanceTrends = async (req, res) => {
    try {
        const { months = 6 } = req.query;
        const where = getOfficeWhere(req.user);
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - parseInt(months));

        const tickets = await prisma.maintenanceTicket.findMany({
            where: { ...where, createdAt: { gte: startDate }, status: 'COMPLETED' },
            select: { createdAt: true, actualCost: true },
        });

        // Group by month
        const monthMap = {};
        for (const t of tickets) {
            const d = new Date(t.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!monthMap[key]) monthMap[key] = { ticketCount: 0, totalCost: 0 };
            monthMap[key].ticketCount++;
            monthMap[key].totalCost += t.actualCost || 0;
        }

        const data = Object.entries(monthMap).sort().map(([period, v]) => ({
            period,
            ticketCount: v.ticketCount,
            totalCost: Math.round(v.totalCost * 100) / 100,
            avgCost: Math.round((v.totalCost / v.ticketCount) * 100) / 100,
        }));

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch maintenance trends', error: error.message });
    }
};

// GET /api/analytics/inventory/status
exports.getInventoryStatus = async (req, res) => {
    try {
        const where = getOfficeWhere(req.user);

        const items = await prisma.inventory.findMany({
            where,
            select: { id: true, name: true, sku: true, type: true, category: true, currentQuantity: true, reorderPoint: true, costPrice: true, unitCost: true },
        });

        const byType = {};
        const byCategory = {};

        for (const item of items) {
            const t = item.type || 'PRODUCT';
            if (!byType[t]) byType[t] = { count: 0, totalQuantity: 0, totalValue: 0 };
            byType[t].count++;
            byType[t].totalQuantity += item.currentQuantity;
            byType[t].totalValue += item.currentQuantity * (item.costPrice || item.unitCost || 0);

            const c = item.category || 'UNCATEGORIZED';
            if (!byCategory[c]) byCategory[c] = { count: 0, totalQuantity: 0 };
            byCategory[c].count++;
            byCategory[c].totalQuantity += item.currentQuantity;
        }

        const lowStockItems = items
            .filter(i => i.currentQuantity <= i.reorderPoint)
            .slice(0, 10)
            .map(i => ({ name: i.name, sku: i.sku, currentQuantity: i.currentQuantity, reorderPoint: i.reorderPoint }));

        const totalInventoryValue = Object.values(byType).reduce((s, t) => s + t.totalValue, 0);

        res.json({
            success: true,
            data: {
                byType: Object.entries(byType).map(([k, v]) => ({ _id: k, ...v })),
                byCategory: Object.entries(byCategory).map(([k, v]) => ({ _id: k, ...v })).sort((a, b) => b.count - a.count).slice(0, 10),
                lowStockItems,
                totalInventoryValue,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch inventory status', error: error.message });
    }
};

// GET /api/analytics/finance/summary
exports.getFinanceSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const where = getOfficeWhere(req.user);

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }

        const transactions = await prisma.transaction.findMany({
            where,
            select: { type: true, category: true, amount: true },
        });

        // Group by type -> category
        const groups = {};
        for (const t of transactions) {
            if (!groups[t.type]) groups[t.type] = { categories: {}, typeTotal: 0 };
            if (!groups[t.type].categories[t.category]) groups[t.type].categories[t.category] = { total: 0, count: 0 };
            groups[t.type].categories[t.category].total += t.amount;
            groups[t.type].categories[t.category].count++;
            groups[t.type].typeTotal += t.amount;
        }

        const result = Object.entries(groups).map(([type, data]) => ({
            _id: type,
            typeTotal: data.typeTotal,
            categories: Object.entries(data.categories).map(([cat, v]) => ({ category: cat, ...v })),
        }));

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch finance summary', error: error.message });
    }
};

// GET /api/analytics/vendors/performance
exports.getVendorPerformance = async (req, res) => {
    try {
        const vendors = await prisma.vendor.findMany({
            where: { isBlacklisted: false },
            select: { id: true, vendorCode: true, name: true, reliabilityScore: true, performanceMetrics: true },
            orderBy: { name: 'asc' },
        });

        // Top vendors by reliability
        const topVendors = [...vendors]
            .sort((a, b) => {
                const aScore = typeof a.reliabilityScore === 'object' ? a.reliabilityScore?.overallScore || 0 : 0;
                const bScore = typeof b.reliabilityScore === 'object' ? b.reliabilityScore?.overallScore || 0 : 0;
                return bScore - aScore;
            })
            .slice(0, 5)
            .map(v => ({
                vendorCode: v.vendorCode,
                name: v.name,
                overallScore: typeof v.reliabilityScore === 'object' ? v.reliabilityScore?.overallScore || 0 : 0,
            }));

        res.json({
            success: true,
            data: {
                totalVendors: vendors.length,
                topVendors,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch vendor performance', error: error.message });
    }
};

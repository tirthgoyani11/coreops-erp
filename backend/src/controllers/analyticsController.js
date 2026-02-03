const Asset = require('../models/Asset');
const Inventory = require('../models/Inventory');
const Maintenance = require('../models/Maintenance');
const FinanceLog = require('../models/FinanceLog');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const PurchaseOrder = require('../models/PurchaseOrder');
const Office = require('../models/Office');

/**
 * Analytics Controller
 * 
 * Provides dashboard statistics and reports for ERP insights.
 */

/**
 * Get main dashboard statistics
 * GET /api/analytics/dashboard
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const officeFilter = req.user.role === 'SUPER_ADMIN'
            ? {}
            : { officeId: req.user.officeId };

        // Get counts in parallel
        const [
            totalAssets,
            activeAssets,
            assetsByStatus,
            totalInventory,
            lowStockItems,
            openTickets,
            pendingApprovals,
            vendorCount,
            totalAssetValue,
            monthlyTransactions,
        ] = await Promise.all([
            Asset.countDocuments(officeFilter),
            Asset.countDocuments({ ...officeFilter, status: 'ACTIVE' }),
            Asset.aggregate([
                { $match: officeFilter },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            Inventory.countDocuments({ ...officeFilter, isActive: true }),
            Inventory.countDocuments({
                ...officeFilter,
                isActive: true,
                'stock.currentQuantity': { $lte: { $ifNull: ['$stock.reorderPoint', 10] } },
            }),
            Maintenance.countDocuments({
                ...officeFilter,
                status: { $in: ['OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL'] },
            }),
            Maintenance.countDocuments({
                ...officeFilter,
                status: 'PENDING_APPROVAL',
            }),
            Vendor.countDocuments({ isActive: true }),
            Asset.aggregate([
                { $match: { ...officeFilter, status: 'ACTIVE' } },
                { $group: { _id: null, total: { $sum: '$depreciation.currentBookValue' } } },
            ]),
            FinanceLog.aggregate([
                {
                    $match: {
                        ...officeFilter,
                        date: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
                    },
                },
                {
                    $group: {
                        _id: '$type',
                        total: { $sum: '$baseCurrencyAmount' },
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        res.json({
            success: true,
            data: {
                assets: {
                    total: totalAssets,
                    active: activeAssets,
                    byStatus: assetsByStatus,
                    totalValue: totalAssetValue[0]?.total || 0,
                },
                inventory: {
                    total: totalInventory,
                    lowStock: lowStockItems,
                },
                maintenance: {
                    openTickets,
                    pendingApprovals,
                },
                vendors: {
                    total: vendorCount,
                },
                finance: {
                    monthlyTransactions,
                },
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard stats',
            error: error.message,
        });
    }
};

/**
 * Get asset value by category
 * GET /api/analytics/assets/by-category
 */
exports.getAssetsByCategory = async (req, res) => {
    try {
        const officeFilter = req.user.role === 'SUPER_ADMIN'
            ? {}
            : { officeId: req.user.officeId };

        const result = await Asset.aggregate([
            { $match: { ...officeFilter, status: 'ACTIVE' } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$depreciation.currentBookValue' },
                    totalPurchasePrice: { $sum: '$purchaseInfo.purchasePrice' },
                },
            },
            { $sort: { totalValue: -1 } },
        ]);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch asset categories',
            error: error.message,
        });
    }
};

/**
 * Get asset depreciation summary
 * GET /api/analytics/assets/depreciation
 */
exports.getDepreciationSummary = async (req, res) => {
    try {
        const officeFilter = req.user.role === 'SUPER_ADMIN'
            ? {}
            : { officeId: req.user.officeId };

        const result = await Asset.aggregate([
            { $match: { ...officeFilter, status: 'ACTIVE' } },
            {
                $project: {
                    category: 1,
                    purchasePrice: '$purchaseInfo.purchasePrice',
                    currentBookValue: '$depreciation.currentBookValue',
                    depreciation: {
                        $subtract: ['$purchaseInfo.purchasePrice', '$depreciation.currentBookValue'],
                    },
                },
            },
            {
                $group: {
                    _id: '$category',
                    assetCount: { $sum: 1 },
                    totalPurchasePrice: { $sum: '$purchasePrice' },
                    totalBookValue: { $sum: '$currentBookValue' },
                    totalDepreciation: { $sum: '$depreciation' },
                },
            },
            { $sort: { totalDepreciation: -1 } },
        ]);

        const totals = result.reduce(
            (acc, cat) => ({
                totalPurchasePrice: acc.totalPurchasePrice + cat.totalPurchasePrice,
                totalBookValue: acc.totalBookValue + cat.totalBookValue,
                totalDepreciation: acc.totalDepreciation + cat.totalDepreciation,
            }),
            { totalPurchasePrice: 0, totalBookValue: 0, totalDepreciation: 0 }
        );

        res.json({
            success: true,
            data: {
                byCategory: result,
                totals,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch depreciation summary',
            error: error.message,
        });
    }
};

/**
 * Get maintenance cost trends
 * GET /api/analytics/maintenance/trends
 */
exports.getMaintenanceTrends = async (req, res) => {
    try {
        const { months = 6 } = req.query;
        const officeFilter = req.user.role === 'SUPER_ADMIN'
            ? {}
            : { officeId: req.user.officeId };

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - parseInt(months));

        const result = await Maintenance.aggregate([
            {
                $match: {
                    ...officeFilter,
                    createdAt: { $gte: startDate },
                    status: 'COMPLETED',
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                    },
                    ticketCount: { $sum: 1 },
                    totalCost: { $sum: '$actualCost' },
                    avgCost: { $avg: '$actualCost' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        res.json({
            success: true,
            data: result.map(r => ({
                period: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
                ticketCount: r.ticketCount,
                totalCost: Math.round(r.totalCost * 100) / 100,
                avgCost: Math.round(r.avgCost * 100) / 100,
            })),
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch maintenance trends',
            error: error.message,
        });
    }
};

/**
 * Get inventory status overview
 * GET /api/analytics/inventory/status
 */
exports.getInventoryStatus = async (req, res) => {
    try {
        const officeFilter = req.user.role === 'SUPER_ADMIN'
            ? {}
            : { officeId: req.user.officeId };

        const [byType, byCategory, lowStock, totalValue] = await Promise.all([
            Inventory.aggregate([
                { $match: { ...officeFilter, isActive: true } },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        totalQuantity: { $sum: '$stock.currentQuantity' },
                        totalValue: { $sum: { $multiply: ['$stock.currentQuantity', '$pricing.costPrice'] } },
                    },
                },
            ]),
            Inventory.aggregate([
                { $match: { ...officeFilter, isActive: true } },
                {
                    $group: {
                        _id: '$category',
                        count: { $sum: 1 },
                        totalQuantity: { $sum: '$stock.currentQuantity' },
                    },
                },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
            Inventory.find({
                ...officeFilter,
                isActive: true,
            })
                .where('stock.currentQuantity')
                .lte(10)
                .select('name sku stock.currentQuantity stock.reorderPoint')
                .limit(10)
                .lean(),
            Inventory.aggregate([
                { $match: { ...officeFilter, isActive: true } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$stock.currentQuantity', '$pricing.costPrice'] } },
                    },
                },
            ]),
        ]);

        res.json({
            success: true,
            data: {
                byType,
                byCategory,
                lowStockItems: lowStock,
                totalInventoryValue: totalValue[0]?.total || 0,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch inventory status',
            error: error.message,
        });
    }
};

/**
 * Get financial summary
 * GET /api/analytics/finance/summary
 */
exports.getFinanceSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const officeFilter = req.user.role === 'SUPER_ADMIN'
            ? {}
            : { officeId: req.user.officeId };

        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);

        const match = { ...officeFilter };
        if (Object.keys(dateFilter).length > 0) {
            match.date = dateFilter;
        }

        const result = await FinanceLog.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { type: '$type', category: '$category' },
                    total: { $sum: '$baseCurrencyAmount' },
                    count: { $sum: 1 },
                },
            },
            {
                $group: {
                    _id: '$_id.type',
                    categories: {
                        $push: {
                            category: '$_id.category',
                            total: '$total',
                            count: '$count',
                        },
                    },
                    typeTotal: { $sum: '$total' },
                },
            },
        ]);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch finance summary',
            error: error.message,
        });
    }
};

/**
 * Get vendor performance overview
 * GET /api/analytics/vendors/performance
 */
exports.getVendorPerformance = async (req, res) => {
    try {
        const result = await Vendor.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    avgReliabilityScore: { $avg: '$reliabilityScore.overallScore' },
                    avgDeliveryRate: { $avg: '$performanceMetrics.onTimeDeliveries' },
                },
            },
        ]);

        const topVendors = await Vendor.find({ isActive: true })
            .sort({ 'reliabilityScore.overallScore': -1 })
            .limit(5)
            .select('vendorCode name type reliabilityScore.overallScore')
            .lean();

        res.json({
            success: true,
            data: {
                byType: result,
                topVendors,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vendor performance',
            error: error.message,
        });
    }
};

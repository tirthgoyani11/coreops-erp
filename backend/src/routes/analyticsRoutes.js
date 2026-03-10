const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

/**
 * Analytics Routes
 * 
 * Provides dashboard statistics and reports.
 * Most routes require at least STAFF role.
 */

// Dashboard (cache for 60 seconds to prevent DB spikes on reload)
router.get('/dashboard', verifyToken, cacheMiddleware(60), analyticsController.getDashboardStats);

// Asset analytics
router.get('/assets/by-category', verifyToken, cacheMiddleware(60), analyticsController.getAssetsByCategory);
router.get('/assets/depreciation', verifyToken, cacheMiddleware(3600), analyticsController.getDepreciationSummary); // Cache for 1 hour

// Maintenance analytics
router.get('/maintenance/trends', verifyToken, cacheMiddleware(300), analyticsController.getMaintenanceTrends); // Cache for 5 mins

// Inventory analytics
router.get('/inventory/status', verifyToken, cacheMiddleware(60), analyticsController.getInventoryStatus);

// Finance analytics (managers only)
router.get('/finance/summary', verifyToken, authorize('SUPER_ADMIN', 'MANAGER'), cacheMiddleware(300), analyticsController.getFinanceSummary);

// Vendor analytics
router.get('/vendors/performance', verifyToken, cacheMiddleware(3600), analyticsController.getVendorPerformance); // Cache for 1 hour

// Unified Pending Approvals (Maintenance + PO + Expense Claims)
router.get('/pending-approvals', verifyToken, authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), analyticsController.getPendingApprovals);

module.exports = router;

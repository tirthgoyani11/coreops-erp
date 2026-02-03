const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

/**
 * Analytics Routes
 * 
 * Provides dashboard statistics and reports.
 * Most routes require at least STAFF role.
 */

// Dashboard
router.get('/dashboard', verifyToken, analyticsController.getDashboardStats);

// Asset analytics
router.get('/assets/by-category', verifyToken, analyticsController.getAssetsByCategory);
router.get('/assets/depreciation', verifyToken, analyticsController.getDepreciationSummary);

// Maintenance analytics
router.get('/maintenance/trends', verifyToken, analyticsController.getMaintenanceTrends);

// Inventory analytics
router.get('/inventory/status', verifyToken, analyticsController.getInventoryStatus);

// Finance analytics (managers only)
router.get('/finance/summary', verifyToken, authorize('SUPER_ADMIN', 'MANAGER'), analyticsController.getFinanceSummary);

// Vendor analytics
router.get('/vendors/performance', verifyToken, analyticsController.getVendorPerformance);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
    getInventory,
    getItem,
    createItem,
    updateItem,
    adjustStock,
    transferStock,
    getLowStock,
    getStockValuation,
    getDemandForecast,
    getReorderCalc,
    getConsumptionReport,
    getInventoryOverview,
    getInventoryInsights,
    reorderFromRisk,
    fixToReorderPoint,
    deleteItem,
} = require('../controllers/inventoryController');

const protect = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const { writeLimiter } = require('../middleware/rateLimiter');
const { idempotencyMiddleware } = require('../middleware/idempotency');

router.use(protect);

router.route('/')
    .get(getInventory)
    .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), writeLimiter, idempotencyMiddleware({ namespace: 'inventory.create' }), createItem);

router.route('/alerts/low-stock')
    .get(getLowStock);

router.get('/overview', getInventoryOverview);
router.get('/insights', getInventoryInsights);

router.route('/reports/valuation')
    .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), getStockValuation);

router.route('/transfer')
    .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), idempotencyMiddleware({ namespace: 'inventory.transfer' }), transferStock);

// Phase 2 — Inventory Intelligence
router.get('/reorder-calc', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), getReorderCalc);
router.get('/consumption-report', getConsumptionReport);
router.get('/forecast/:id', getDemandForecast);

// Bulk Action Routes
router.post('/bulk-route', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), require('../controllers/inventoryController').bulkRouteItems);

// AI Multimodal Route
router.post('/ai-multimodal', require('../controllers/inventoryController').aiMultimodal);

router.route('/:id')
    .get(getItem)
    .put(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), idempotencyMiddleware({ namespace: 'inventory.update' }), updateItem)
    .delete(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), deleteItem);

router.route('/:id/adjust')
    .post(idempotencyMiddleware({ namespace: 'inventory.adjust' }), adjustStock);

router.post('/:id/reorder', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), idempotencyMiddleware({ namespace: 'inventory.reorder' }), reorderFromRisk);
router.post('/:id/fix-reorder-point', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), fixToReorderPoint);

module.exports = router;


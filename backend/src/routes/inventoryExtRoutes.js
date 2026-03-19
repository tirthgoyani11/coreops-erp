const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const batchController = require('../controllers/batchController');
const stocktakeController = require('../controllers/stocktakeController');
const valuationService = require('../services/valuationService');

router.use(verifyToken);

// ── Batch Tracking ─────────────────────────────────────
router.get('/batches/expiring', batchController.getExpiringBatches);
router.get('/batches/stock-summary', batchController.getBatchStockSummary);
router.get('/:inventoryId/batches', batchController.getBatches);
router.post('/:inventoryId/batches', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN', 'STAFF'), batchController.createBatch);
router.post('/:inventoryId/batches/consume', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN', 'STAFF'), batchController.consumeBatch);

// ── Serialized Units ───────────────────────────────────
router.get('/:inventoryId/serial-units', batchController.getSerializedUnits);
router.post('/:inventoryId/serial-units', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN'), batchController.addSerializedUnits);
router.post('/serial-units/issue', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN', 'STAFF'), batchController.issueSerializedUnit);

// ── Inventory Valuation ────────────────────────────────
router.get('/valuation/report', valuationService.getValuationReport);
router.get('/:inventoryId/valuation', valuationService.getItemValuation);

// ── Stocktake / Cycle Counting ─────────────────────────
router.post('/stocktake', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN'), stocktakeController.createStocktake);
router.get('/stocktake', stocktakeController.getStocktakes);
router.get('/stocktake/:id', stocktakeController.getStocktakeDetail);
router.patch('/stocktake/items/:itemId', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN', 'STAFF'), stocktakeController.updateCount);
router.post('/stocktake/:id/complete', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN'), stocktakeController.completeStocktake);

module.exports = router;

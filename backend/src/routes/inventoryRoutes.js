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
    getStockValuation
} = require('../controllers/inventoryController');

const protect = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

router.use(protect);

router.route('/')
    .get(getInventory)
    .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createItem);

router.route('/alerts/low-stock')
    .get(getLowStock);

router.route('/reports/valuation')
    .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), getStockValuation);

router.route('/transfer')
    .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), transferStock);

router.route('/:id')
    .get(getItem)
    .put(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), updateItem);

router.route('/:id/adjust')
    .post(adjustStock);

module.exports = router;

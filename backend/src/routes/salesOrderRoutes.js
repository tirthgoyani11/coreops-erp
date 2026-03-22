const express = require('express');
const router = express.Router();
const { createSalesOrder, getSalesOrders, getSalesOrder, fulfillSalesOrder } = require('../controllers/salesOrderController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const { idempotencyMiddleware } = require('../middleware/idempotency');

router.use(verifyToken);

router.route('/')
    .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), idempotencyMiddleware({ namespace: 'sales.order.create' }), createSalesOrder)
    .get(getSalesOrders);

router.route('/:id')
    .get(getSalesOrder);

router.route('/:id/fulfill')
    .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), idempotencyMiddleware({ namespace: 'sales.order.fulfill' }), fulfillSalesOrder);

module.exports = router;

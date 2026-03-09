const express = require('express');
const router = express.Router();
const {
    createPO,
    getPOs,
    getPO,
    updatePO,
    receiveGoods,
    approvePayment
} = require('../controllers/purchaseOrderController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const { writeLimiter } = require('../middleware/rateLimiter');
const auditMiddleware = require('../middleware/auditMiddleware');

router.use(verifyToken);

router.route('/')
    .get(getPOs)
    .post(writeLimiter, auditMiddleware('CREATE_PURCHASE_ORDER', 'PURCHASE_ORDER_RESOURCE'), createPO);

router.route('/:id')
    .get(getPO)
    .put(updatePO);

router.post('/:id/receive', authorize('SUPER_ADMIN', 'MANAGER'), auditMiddleware('RECEIVE_PURCHASE_ORDER', 'PURCHASE_ORDER_RESOURCE'), receiveGoods);
router.post('/:id/approve-payment', authorize('SUPER_ADMIN', 'MANAGER'), auditMiddleware('APPROVE_PURCHASE_ORDER', 'PURCHASE_ORDER_RESOURCE'), approvePayment);

module.exports = router;

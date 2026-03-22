const express = require('express');
const router = express.Router();
const {
    createPO,
    getPOs,
    getPO,
    updatePO,
    approvePO,
    rejectPO,
    receiveGoods,
    approvePayment
} = require('../controllers/purchaseOrderController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const { writeLimiter } = require('../middleware/rateLimiter');
const auditMiddleware = require('../middleware/auditMiddleware');
const { idempotencyMiddleware } = require('../middleware/idempotency');

router.use(verifyToken);

router.route('/')
    .get(getPOs)
    .post(writeLimiter, idempotencyMiddleware({ namespace: 'procurement.po.create' }), auditMiddleware('CREATE_PURCHASE_ORDER', 'PURCHASE_ORDER_RESOURCE'), createPO);

router.route('/:id')
    .get(getPO)
    .put(updatePO);

router.patch('/:id/approve', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), approvePO);
router.patch('/:id/reject', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), rejectPO);

router.post('/:id/receive', authorize('SUPER_ADMIN', 'MANAGER'), idempotencyMiddleware({ namespace: 'procurement.po.receive' }), auditMiddleware('RECEIVE_PURCHASE_ORDER', 'PURCHASE_ORDER_RESOURCE'), receiveGoods);
router.post('/:id/approve-payment', authorize('SUPER_ADMIN', 'MANAGER'), idempotencyMiddleware({ namespace: 'procurement.po.approvePayment' }), auditMiddleware('APPROVE_PURCHASE_ORDER', 'PURCHASE_ORDER_RESOURCE'), approvePayment);

module.exports = router;

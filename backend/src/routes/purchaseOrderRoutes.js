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

router.use(verifyToken);

router.route('/')
    .get(getPOs)
    .post(createPO);

router.route('/:id')
    .get(getPO)
    .put(updatePO);

router.post('/:id/receive', authorize('SUPER_ADMIN', 'MANAGER'), receiveGoods);
router.post('/:id/approve-payment', authorize('SUPER_ADMIN', 'MANAGER'), approvePayment);

module.exports = router;

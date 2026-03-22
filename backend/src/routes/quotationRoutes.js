const express = require('express');
const router = express.Router();
const { createQuotation, getQuotations, getQuotation, updateQuotationStatus } = require('../controllers/quotationController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

router.use(verifyToken);

router.route('/')
    .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createQuotation)
    .get(getQuotations);

router.route('/:id')
    .get(getQuotation)
    .patch(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), updateQuotationStatus);

module.exports = router;

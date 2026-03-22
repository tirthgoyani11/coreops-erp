const express = require('express');
const router = express.Router();

const {
    getAPInvoices,
    getAPInvoiceById,
    createAPInvoice,
    approveAPInvoice,
    postAPInvoiceToGL,
    getAPAging,
} = require('../controllers/apInvoiceController');
const {
    matchAPInvoice,
    getAPMatchingReport,
} = require('../controllers/financeRebuildController');

const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const { writeLimiter } = require('../middleware/rateLimiter');

router.use(verifyToken);

router.get('/aging', getAPAging);
router.get('/matching/report', getAPMatchingReport);

router.route('/')
    .get(getAPInvoices)
    .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), writeLimiter, createAPInvoice);

router.route('/:id')
    .get(getAPInvoiceById);

router.put('/:id/approve', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), writeLimiter, approveAPInvoice);
router.post('/:id/post-gl', authorize('SUPER_ADMIN', 'ADMIN'), writeLimiter, postAPInvoiceToGL);
router.post('/:id/match', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), writeLimiter, matchAPInvoice);

module.exports = router;

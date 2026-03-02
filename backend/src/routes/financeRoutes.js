const express = require('express');
const router = express.Router();
const {
    getTransactions,
    createTransaction,
    getBudgets,
    setBudget,
    getAPAging,
    getARAging,
    getGSTSummary,
} = require('../controllers/financeController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

router.use(verifyToken);

router.route('/transactions')
    .get(getTransactions)
    .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createTransaction);

router.route('/budgets')
    .get(getBudgets)
    .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), setBudget);

// Phase 2 — Financial Intelligence
router.get('/ap-aging', getAPAging);
router.get('/ar-aging', getARAging);
router.get('/gst-summary', getGSTSummary);

module.exports = router;


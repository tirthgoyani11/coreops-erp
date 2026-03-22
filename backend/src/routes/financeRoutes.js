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
    getAutomationFeed,
    intakeAISignal,
} = require('../controllers/financeController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const { writeLimiter } = require('../middleware/rateLimiter');
const { idempotencyMiddleware } = require('../middleware/idempotency');

router.use(verifyToken);

router.route('/transactions')
    .get(getTransactions)
    .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), writeLimiter, idempotencyMiddleware({ namespace: 'finance.transaction.create' }), createTransaction);

router.route('/budgets')
    .get(getBudgets)
    .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), writeLimiter, idempotencyMiddleware({ namespace: 'finance.budget.set' }), setBudget);

// Phase 2 — Financial Intelligence
router.get('/ap-aging', getAPAging);
router.get('/ar-aging', getARAging);
router.get('/gst-summary', getGSTSummary);
router.get('/automation-feed', getAutomationFeed);
router.post('/automation/intake', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'), idempotencyMiddleware({ namespace: 'finance.automation.intake' }), intakeAISignal);

module.exports = router;


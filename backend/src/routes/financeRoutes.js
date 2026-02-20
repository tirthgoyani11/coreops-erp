const express = require('express');
const router = express.Router();
const {
    getTransactions,
    createTransaction,
    getBudgets,
    setBudget
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

module.exports = router;

const express = require('express');
const router = express.Router();
const {
    getAccounts,
    createAccount,
    updateAccount,
    createJournalEntry,
    getJournalEntries,
    getTrialBalance,
    getProfitLoss,
    getBalanceSheet,
    getCashFlow,
} = require('../controllers/glController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

router.use(verifyToken);

// Chart of Accounts
router.route('/accounts')
    .get(getAccounts)
    .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createAccount);

router.route('/accounts/:id')
    .put(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), updateAccount);

// Journal Entries
router.route('/journal')
    .get(getJournalEntries)
    .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createJournalEntry);

// Financial Reports
router.get('/trial-balance', getTrialBalance);
router.get('/profit-loss', getProfitLoss);
router.get('/balance-sheet', getBalanceSheet);
router.get('/cash-flow', getCashFlow);

module.exports = router;

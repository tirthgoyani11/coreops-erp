const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const apArController = require('../controllers/apArController');
const bankReconController = require('../controllers/bankReconciliationController');
const yearEndController = require('../controllers/yearEndController');
const expenseController = require('../controllers/expenseController');
const orchestrationController = require('../controllers/orchestrationController');
const financeRebuildController = require('../controllers/financeRebuildController');
const financePhase1Controller = require('../controllers/financePhase1Controller');
const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/errorHandler');
const { idempotencyMiddleware } = require('../middleware/idempotency');

router.use(verifyToken);

// ── Expense Claims (accessible to all authenticated users) ──
router.get('/expense-claims', expenseController.getExpenseClaims);
router.post('/expense-claims', expenseController.createExpenseClaim);
router.put('/expense-claims/:id/status', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), expenseController.updateClaimStatus);
router.put('/expense-claims/:id/pay', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), expenseController.payClaim);

// All routes below require MANAGER+ role
router.use(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'));

// ── AP & AR Aging Reports ──────────────────────────────
router.get('/ap-aging', apArController.getAPAging);
router.get('/ar-aging', apArController.getARAging);
router.get('/exception-center', orchestrationController.getExceptionCenter);
router.get('/cockpit', orchestrationController.getExecutiveCockpit);

// ── Tax Rates ──────────────────────────────────────────
router.get('/tax-rates', asyncHandler(async (req, res) => {
    const rates = await prisma.taxRate.findMany({ where: { isActive: true } });
    res.status(200).json({ success: true, count: rates.length, data: rates });
}));

router.post('/tax-rates', asyncHandler(async (req, res) => {
    const rate = await prisma.taxRate.create({ data: req.body });
    res.status(201).json({ success: true, data: rate });
}));
router.get('/tax-reconciliation', financeRebuildController.getTaxReconciliation);
router.get('/gst-reconciliation', financeRebuildController.getGSTReconciliationReport);
router.get('/tax-summary/:invoiceType/:invoiceId', financeRebuildController.getInvoiceTaxSummaryReport);
router.post('/tax/calculate-line', financeRebuildController.calculateTaxForLine);

// ── Bank Reconciliation ────────────────────────────────
router.get('/bank-statements', bankReconController.getBankStatements);
router.post('/bank-statements', bankReconController.uploadBankStatement);
router.get('/bank-statements/:id/reconcile', bankReconController.getReconciliationData);
router.post('/bank-statements/:id/reconcile', bankReconController.reconcileMatch);

// ── Year End Closing ──────────────────────────────────
router.get('/year-end', authorize('SUPER_ADMIN', 'ADMIN'), yearEndController.getYearEndPreview);
router.post('/year-end', authorize('SUPER_ADMIN'), yearEndController.closeYear);

// ── Phase 1: Enterprise Finance Control Plane ─────────
router.get('/intercompany/entries', financePhase1Controller.getIntercompanyEntries);
router.post('/intercompany/entries', idempotencyMiddleware({ namespace: 'finance.phase1.intercompany.create' }), financePhase1Controller.createIntercompanyEntry);

router.post('/consolidation/run', idempotencyMiddleware({ namespace: 'finance.phase1.consolidation.run' }), financePhase1Controller.runConsolidation);

router.get('/revenue-recognition/schedules', financePhase1Controller.getRevenueRecognitionSchedules);
router.post('/revenue-recognition/schedules', idempotencyMiddleware({ namespace: 'finance.phase1.revrec.schedule.create' }), financePhase1Controller.createRevenueRecognitionSchedule);
router.post('/revenue-recognition/schedules/:id/recognize', idempotencyMiddleware({ namespace: 'finance.phase1.revrec.milestone.recognize' }), financePhase1Controller.recognizeRevenueMilestone);

router.get('/close-cockpit', financePhase1Controller.getCloseCockpit);
router.post('/close-cockpit/tasks/:taskKey/approve', idempotencyMiddleware({ namespace: 'finance.phase1.close.task.approve' }), financePhase1Controller.approveCloseCockpitTask);
router.post('/close-cockpit/finalize', idempotencyMiddleware({ namespace: 'finance.phase1.close.finalize' }), financePhase1Controller.finalizePeriodClose);

module.exports = router;

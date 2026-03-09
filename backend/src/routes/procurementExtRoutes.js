const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const requisitionController = require('../controllers/requisitionController');
const rfqController = require('../controllers/rfqController');
const grnController = require('../controllers/grnController');
const contractController = require('../controllers/contractController');

router.use(verifyToken);

// ── Purchase Requisitions ──────────────────────────────
router.post('/requisitions', requisitionController.createRequisition);
router.get('/requisitions', requisitionController.getRequisitions);
router.post('/requisitions/:id/submit', requisitionController.submitRequisition);
router.post('/requisitions/:id/approve', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN'), requisitionController.approveRequisition);
router.post('/requisitions/:id/convert-to-po', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN'), requisitionController.convertToPO);

// ── RFQ ────────────────────────────────────────────────
router.post('/rfq', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN'), rfqController.createRFQ);
router.get('/rfq', rfqController.getRFQs);
router.get('/rfq/:id', rfqController.getRFQDetail);
router.post('/rfq/:id/quotation', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN'), rfqController.submitQuotation);
router.get('/rfq/:id/compare', rfqController.compareQuotations);
router.post('/rfq/:id/award', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN'), rfqController.awardRFQ);

// ── GRN ────────────────────────────────────────────────
router.post('/grn', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN', 'STAFF'), grnController.createGRN);
router.get('/grn', grnController.getGRNs);
router.get('/grn/:id', grnController.getGRNDetail);

// ── Vendor Contracts ───────────────────────────────────
router.post('/contracts', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN'), contractController.createContract);
router.get('/contracts', contractController.getContracts);
router.get('/contracts/expiring', contractController.getExpiringContracts);
router.patch('/contracts/:id', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN'), contractController.updateContract);

module.exports = router;

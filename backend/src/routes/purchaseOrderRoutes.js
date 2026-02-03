const express = require('express');
const router = express.Router();
const poController = require('../controllers/purchaseOrderController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

/**
 * Purchase Order Routes
 * 
 * Full workflow: create -> submit -> approve/reject -> receive
 */

// CRUD routes
router.get('/', verifyToken, poController.getPurchaseOrders);
router.get('/:id', verifyToken, poController.getPurchaseOrder);
router.post('/', verifyToken, poController.createPurchaseOrder);
router.put('/:id', verifyToken, poController.updatePurchaseOrder);

// Workflow routes
router.post('/:id/submit', verifyToken, poController.submitForApproval);
router.post('/:id/approve', verifyToken, authorize('SUPER_ADMIN', 'MANAGER'), poController.approvePurchaseOrder);
router.post('/:id/reject', verifyToken, authorize('SUPER_ADMIN', 'MANAGER'), poController.rejectPurchaseOrder);
router.post('/:id/receive', verifyToken, poController.receiveItems);
router.post('/:id/cancel', verifyToken, poController.cancelPurchaseOrder);

module.exports = router;

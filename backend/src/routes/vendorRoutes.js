const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

/**
 * Vendor Management Routes
 * 
 * All routes require authentication.
 * Create/Update/Delete require MANAGER or SUPER_ADMIN role.
 */

// Public-ish routes (requires auth but any role)
router.get('/', verifyToken, vendorController.getVendors);
router.get('/rankings', verifyToken, vendorController.getVendorRankings);
router.get('/by-type/:type', verifyToken, vendorController.getVendorsByType);
router.get('/:id', verifyToken, vendorController.getVendor);

// Admin routes
router.post('/', verifyToken, authorize('SUPER_ADMIN', 'MANAGER'), vendorController.createVendor);
router.put('/:id', verifyToken, authorize('SUPER_ADMIN', 'MANAGER'), vendorController.updateVendor);
router.delete('/:id', verifyToken, authorize('SUPER_ADMIN', 'MANAGER'), vendorController.deleteVendor);

// Reliability scoring routes
router.post('/:id/calculate-reliability', verifyToken, authorize('SUPER_ADMIN', 'MANAGER'), vendorController.calculateReliability);
router.post('/:id/record-order', verifyToken, authorize('SUPER_ADMIN', 'MANAGER'), vendorController.recordOrder);

module.exports = router;

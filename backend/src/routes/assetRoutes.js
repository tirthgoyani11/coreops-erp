const express = require('express');
const router = express.Router();
const {
    createAsset,
    getAssets,
    getAsset,
    updateAsset,
    deleteAsset,
    getAssetStats,
    deleteMultipleAssets,
    exportAssets,
    lookupAsset,
    checkoutAsset,
    checkinAsset,
    getUsers,
    importAssets
} = require('../controllers/assetController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const { filterByOffice } = require('../middleware/filterByOffice');
const { assetValidation, paginationValidation } = require('../middleware/validation');
const auditMiddleware = require('../middleware/auditMiddleware');

// All routes require authentication
router.use(verifyToken);

// Statistical Routes (Must be before /:id to avoid conflict)
router.get('/stats', getAssetStats);

// Export & Users (Must be before /:id to avoid conflict)
router.get('/export', filterByOffice, exportAssets);
router.get('/users', getUsers);
router.get('/lookup', lookupAsset);

// Bulk Operations
router.post('/bulk-delete', authorize('MANAGER', 'SUPER_ADMIN'), deleteMultipleAssets);
router.post('/import', authorize('MANAGER', 'SUPER_ADMIN'), importAssets);

// GET routes - all authenticated users (filtered by office)
router.get('/', filterByOffice, paginationValidation, getAssets);
router.get('/:id', assetValidation.getById, getAsset);

// Mutation routes - MANAGER or higher with validation
router.post('/', authorize('MANAGER', 'SUPER_ADMIN'), assetValidation.create, auditMiddleware('CREATE_ASSET', 'ASSET_RESOURCE'), createAsset);
router.patch('/:id', authorize('MANAGER', 'SUPER_ADMIN'), assetValidation.update, auditMiddleware('UPDATE_ASSET', 'ASSET_RESOURCE'), updateAsset);
router.delete('/:id', authorize('MANAGER', 'SUPER_ADMIN'), assetValidation.getById, auditMiddleware('DELETE_ASSET', 'ASSET_RESOURCE'), deleteAsset);

// Check-in / Check-out
router.post('/:id/checkout', authorize('MANAGER', 'SUPER_ADMIN'), checkoutAsset);
router.post('/:id/checkin', authorize('MANAGER', 'SUPER_ADMIN'), checkinAsset);

// Predictive Maintenance
const predictiveService = require('../services/predictiveService');
router.get('/fleet-risk', predictiveService.getFleetRisk);
router.get('/:id/predictions', predictiveService.getAssetPredictions);

module.exports = router;

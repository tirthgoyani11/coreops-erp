const express = require('express');
const router = express.Router();
const {
    createAsset,
    getAssets,
    getAsset,
    updateAsset,
    deleteAsset,
} = require('../controllers/assetController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const { filterByOffice } = require('../middleware/filterByOffice');
const { assetValidation, paginationValidation } = require('../middleware/validation');

// All routes require authentication
router.use(verifyToken);

// GET routes - all authenticated users (filtered by office)
router.get('/', filterByOffice, paginationValidation, getAssets);
router.get('/:id', assetValidation.getById, getAsset);

// Mutation routes - MANAGER or higher with validation
router.post('/', authorize('MANAGER', 'SUPER_ADMIN'), assetValidation.create, createAsset);
router.patch('/:id', authorize('MANAGER', 'SUPER_ADMIN'), assetValidation.update, updateAsset);
router.delete('/:id', authorize('MANAGER', 'SUPER_ADMIN'), assetValidation.getById, deleteAsset);

module.exports = router;

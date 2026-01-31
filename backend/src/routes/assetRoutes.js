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
const filterByOffice = require('../middleware/filterByOffice');

// All routes require authentication
router.use(verifyToken);

// GET routes - all authenticated users (filtered by office)
router.get('/', filterByOffice, getAssets);
router.get('/:id', getAsset);

// Mutation routes - MANAGER or higher
router.post('/', authorize('MANAGER', 'SUPER_ADMIN'), createAsset);
router.patch('/:id', authorize('MANAGER', 'SUPER_ADMIN'), updateAsset);
router.delete('/:id', authorize('MANAGER', 'SUPER_ADMIN'), deleteAsset);

module.exports = router;

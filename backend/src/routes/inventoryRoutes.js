const express = require('express');
const router = express.Router();
const {
    createItem,
    getItems,
    getItem,
    updateItem,
    deleteItem,
} = require('../controllers/inventoryController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const filterByOffice = require('../middleware/filterByOffice');

// All routes require authentication
router.use(verifyToken);

// GET routes - all authenticated users (filtered by office)
router.get('/', filterByOffice, getItems);
router.get('/:id', getItem);

// Mutation routes - MANAGER or higher
router.post('/', authorize('MANAGER', 'SUPER_ADMIN'), createItem);
router.patch('/:id', authorize('MANAGER', 'SUPER_ADMIN'), updateItem);
router.delete('/:id', authorize('MANAGER', 'SUPER_ADMIN'), deleteItem);

module.exports = router;

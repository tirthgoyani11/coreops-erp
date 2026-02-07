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
const { filterByOffice } = require('../middleware/filterByOffice');
const { inventoryValidation, paginationValidation } = require('../middleware/validation');

// All routes require authentication
router.use(verifyToken);

// GET routes - all authenticated users (filtered by office)
router.get('/', filterByOffice, paginationValidation, getItems);
router.get('/:id', inventoryValidation.getById, getItem);

// Mutation routes - MANAGER or higher with validation
router.post('/', authorize('MANAGER', 'SUPER_ADMIN'), inventoryValidation.create, createItem);
router.patch('/:id', authorize('MANAGER', 'SUPER_ADMIN'), inventoryValidation.update, updateItem);
router.delete('/:id', authorize('MANAGER', 'SUPER_ADMIN'), inventoryValidation.getById, deleteItem);

module.exports = router;

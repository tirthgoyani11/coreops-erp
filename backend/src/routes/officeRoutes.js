const express = require('express');
const router = express.Router();
const {
    createOffice,
    getOffices,
    getOffice,
    updateOffice,
} = require('../controllers/officeController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const { officeValidation, paginationValidation } = require('../middleware/validation');

// Basic authentication
router.use(verifyToken);

router.route('/')
    .post(authorize('SUPER_ADMIN'), officeValidation.create, createOffice)
    .get(authorize('SUPER_ADMIN', 'MANAGER'), paginationValidation, getOffices);

router.route('/:id')
    .get(authorize('SUPER_ADMIN', 'MANAGER'), officeValidation.getById, getOffice)
    .patch(authorize('SUPER_ADMIN'), officeValidation.update, updateOffice);

module.exports = router;

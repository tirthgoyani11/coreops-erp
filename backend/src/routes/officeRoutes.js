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

// All office routes are SUPER_ADMIN only
router.use(verifyToken);
router.use(authorize('SUPER_ADMIN'));

router.route('/')
    .post(officeValidation.create, createOffice)
    .get(paginationValidation, getOffices);

router.route('/:id')
    .get(officeValidation.getById, getOffice)
    .patch(officeValidation.update, updateOffice);

module.exports = router;

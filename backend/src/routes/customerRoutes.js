const express = require('express');
const router = express.Router();
const { createCustomer, getCustomers, getCustomer, updateCustomer } = require('../controllers/customerController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

router.use(verifyToken); // Require authentication

router.route('/')
    .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createCustomer)
    .get(getCustomers);

router.route('/:id')
    .get(getCustomer)
    .patch(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), updateCustomer);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
    createVendor,
    getVendors,
    getVendor,
    updateVendor,
    deleteVendor
} = require('../controllers/vendorController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

router.use(verifyToken);

router.route('/')
    .get(getVendors)
    .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createVendor);

router.route('/:id')
    .get(getVendor)
    .put(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), updateVendor)
    .delete(authorize('SUPER_ADMIN'), deleteVendor);

module.exports = router;

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

// All office routes are SUPER_ADMIN only
router.use(verifyToken);
router.use(authorize('SUPER_ADMIN'));

router.route('/').post(createOffice).get(getOffices);
router.route('/:id').get(getOffice).patch(updateOffice);

module.exports = router;

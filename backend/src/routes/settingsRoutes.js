const express = require('express');
const router = express.Router();
const {
    getSettings,
    updateSettings,
} = require('../controllers/settingsController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

// All settings routes require SUPER_ADMIN
router.use(verifyToken);
router.use(authorize('SUPER_ADMIN'));

router.get('/', getSettings);
router.put('/', updateSettings);

module.exports = router;

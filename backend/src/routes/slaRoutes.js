const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const slaController = require('../controllers/slaController');

// All routes require authentication
router.use(verifyToken);

// SLA Policies
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), slaController.createPolicy);
router.get('/', slaController.getPolicies);
router.get('/compliance', slaController.getCompliance);
router.patch('/:id', authorize('ADMIN', 'SUPER_ADMIN'), slaController.updatePolicy);
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), slaController.deletePolicy);

module.exports = router;

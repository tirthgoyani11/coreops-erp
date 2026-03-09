const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const preventiveController = require('../controllers/preventiveController');

// All routes require authentication
router.use(verifyToken);

// Preventive Maintenance Schedules
router.post('/', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN'), preventiveController.createSchedule);
router.get('/', preventiveController.getSchedules);
router.get('/due', preventiveController.getDueSchedules);
router.patch('/:id', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN'), preventiveController.updateSchedule);
router.delete('/:id', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN'), preventiveController.deleteSchedule);
router.post('/:id/execute', authorize('MANAGER', 'ADMIN', 'SUPER_ADMIN'), preventiveController.executeSchedule);

module.exports = router;

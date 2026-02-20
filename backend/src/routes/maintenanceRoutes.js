const express = require('express');
const router = express.Router();
const {
    createTicket,
    getTickets,
    getTicket,
    updateTicket,
    addWorkLog,
    consumePart,
    getStats,
    getDigitalTwinPreview,
    checkAnomaly
} = require('../controllers/maintenanceController');

const protect = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

router.use(protect); // All routes require login

router.route('/')
    .post(createTicket)
    .get(getTickets);

router.route('/stats')
    .get(getStats);

router.route('/:id')
    .get(getTicket)
    .put(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), updateTicket);

router.route('/:id/worklog')
    .post(addWorkLog);

router.route('/:id/parts')
    .post(consumePart);

// Phase 1A — AI-powered endpoints
router.route('/:id/preview')
    .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), getDigitalTwinPreview);

router.route('/:id/anomaly-check')
    .get(checkAnomaly);

module.exports = router;

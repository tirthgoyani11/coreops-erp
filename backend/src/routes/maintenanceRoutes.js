const express = require('express');
const router = express.Router();
const {
    createTicket,
    getTickets,
    getTicket,
    updateTicket,
    approveTicket,
    rejectTicket,
    addWorkLog,
    consumePart,
    getStats,
    getDigitalTwinPreview,
    checkAnomaly
} = require('../controllers/maintenanceController');

const protect = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const { writeLimiter } = require('../middleware/rateLimiter');

router.use(protect); // All routes require login

router.route('/')
    .post(writeLimiter, createTicket)
    .get(getTickets);

router.route('/stats')
    .get(getStats);

router.route('/:id')
    .get(getTicket)
    .put(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), updateTicket);

router.patch('/:id/approve', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), approveTicket);
router.patch('/:id/reject', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), rejectTicket);

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

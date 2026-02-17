const express = require('express');
const router = express.Router();
const {
    createTicket,
    getTickets,
    getTicket,
    updateTicket,
    addWorkLog,
    consumePart,
    getStats
} = require('../controllers/maintenanceController');

const { protect, authorize } = require('../middleware/authMiddleware');

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

module.exports = router;

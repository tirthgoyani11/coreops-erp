const express = require('express');
const router = express.Router();
const {
    createRequest,
    processDecision,
    closeMaintenance,
    getMaintenance
} = require('../controllers/maintenanceController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const { maintenanceValidation, paginationValidation } = require('../middleware/validation');

// Protect all routes
router.use(verifyToken);

router.route('/')
    .post(maintenanceValidation.create, createRequest)
    .get(paginationValidation, getMaintenance);

router.post('/:id/approve',
    authorize('MANAGER', 'SUPER_ADMIN'),
    maintenanceValidation.getById,
    (req, res, next) => {
        req.params.action = 'approve';
        next();
    },
    processDecision
);

router.post('/:id/reject',
    authorize('MANAGER', 'SUPER_ADMIN'),
    maintenanceValidation.getById,
    (req, res, next) => {
        req.params.action = 'reject';
        next();
    },
    processDecision
);

router.post('/:id/close',
    authorize('MANAGER', 'SUPER_ADMIN'),
    maintenanceValidation.getById,
    closeMaintenance
);

module.exports = router;

const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const {
  createEmployee,
  getEmployees,
  getEmployee,
  createLeaveRequest,
  getLeaveRequests,
  decideLeaveRequest,
  createAttendance,
  getAttendance,
  previewPayrollRun,
  createPayrollRun,
  getPayrollRuns,
  lockPayrollRun,
  getHcmDashboardStats,
} = require('../controllers/hcmController');

router.use(verifyToken);

router.route('/employees')
  .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createEmployee)
  .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getEmployees);

router.route('/employees/:id')
  .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getEmployee);

router.route('/leave-requests')
  .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'), createLeaveRequest)
  .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getLeaveRequests);
router.put('/leave-requests/:id/decision', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), decideLeaveRequest);

router.route('/attendance')
  .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'), createAttendance)
  .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getAttendance);

router.post('/payroll-runs/preview', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), previewPayrollRun);
router.route('/payroll-runs')
  .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createPayrollRun)
  .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getPayrollRuns);
router.put('/payroll-runs/:id/lock', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), lockPayrollRun);

router.get('/dashboard-stats', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getHcmDashboardStats);

module.exports = router;

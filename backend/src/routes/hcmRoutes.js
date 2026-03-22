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
const {
  createRecruitmentPosition,
  getRecruitmentPositions,
  createCandidateApplication,
  getCandidateApplications,
  updateCandidateStage,
  createPerformanceGoal,
  getPerformanceGoals,
  updatePerformanceGoalProgress,
  createPerformanceReview,
  getPerformanceReviews,
  submitPerformanceReview,
  createObjective,
  getObjectives,
  updateKeyResult,
  createLearningCourse,
  getLearningCourses,
  requestLearningEnrollment,
  getLearningEnrollments,
  decideLearningEnrollment,
  createWorkforcePlan,
  getWorkforcePlans,
  createSelfServiceRequest,
  getSelfServiceRequests,
  decideSelfServiceRequest,
} = require('../controllers/hcmPhase2Controller');

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

router.route('/recruitment-positions')
  .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createRecruitmentPosition)
  .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getRecruitmentPositions);
router.post('/recruitment-positions/:id/applications', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'), createCandidateApplication);
router.get('/candidate-applications', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getCandidateApplications);
router.put('/candidate-applications/:id/stage', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), updateCandidateStage);

router.route('/performance-goals')
  .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createPerformanceGoal)
  .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getPerformanceGoals);
router.put('/performance-goals/:id/progress', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), updatePerformanceGoalProgress);

router.route('/performance-reviews')
  .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createPerformanceReview)
  .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getPerformanceReviews);
router.put('/performance-reviews/:id/submit', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), submitPerformanceReview);

router.route('/objectives')
  .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createObjective)
  .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getObjectives);
router.put('/key-results/:id', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), updateKeyResult);

router.route('/learning-courses')
  .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createLearningCourse)
  .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getLearningCourses);

router.route('/learning-enrollments')
  .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'), requestLearningEnrollment)
  .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getLearningEnrollments);
router.put('/learning-enrollments/:id/decision', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), decideLearningEnrollment);

router.route('/workforce-plans')
  .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createWorkforcePlan)
  .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getWorkforcePlans);

router.route('/self-service-requests')
  .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'), createSelfServiceRequest)
  .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getSelfServiceRequests);
router.put('/self-service-requests/:id/decision', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), decideSelfServiceRequest);

module.exports = router;

const express = require('express');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const {
  getArchitecture,
  getUnifiedContext,
  publishDomainEvent,
  copilotQuery,
} = require('../controllers/coreops/coreopsController');

const router = express.Router();

router.use(verifyToken);

router.get('/architecture', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getArchitecture);
router.get('/context', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getUnifiedContext);
router.post('/events/publish', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), publishDomainEvent);
router.post('/copilot/query', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), copilotQuery);

module.exports = router;

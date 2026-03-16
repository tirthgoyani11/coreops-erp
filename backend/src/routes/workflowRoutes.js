const express = require('express');
const { getRules, getRule, createRule, updateRule, deleteRule } = require('../controllers/workflowController');
const verifyToken = require('../middleware/verifyToken');
const audit = require('../middleware/auditMiddleware');

const router = express.Router();

router.use(verifyToken);

router.route('/')
    .get(getRules)
    .post(audit('CREATE_WORKFLOW_RULE', 'WORKFLOW_RESOURCE'), createRule);

router.route('/:id')
    .get(getRule)
    .put(audit('UPDATE_WORKFLOW_RULE', 'WORKFLOW_RESOURCE'), updateRule)
    .delete(audit('DELETE_WORKFLOW_RULE', 'WORKFLOW_RESOURCE'), deleteRule);

module.exports = router;

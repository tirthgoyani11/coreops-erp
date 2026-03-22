const express = require('express');
const router = express.Router();
const { createPricingRule, getPricingRules } = require('../controllers/pricingRuleController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

router.use(verifyToken);

router.route('/')
    .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createPricingRule)
    .get(getPricingRules);

module.exports = router;

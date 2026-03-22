const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const {
  createCampaign,
  getCampaigns,
  createTerritory,
  getTerritories,
  createAccountPlan,
  getAccountPlans,
  createPartnerChannel,
  getPartnerChannels,
  getCrmPhase2Summary,
} = require('../controllers/crmPhase2Controller');

router.use(verifyToken);

router.get('/summary', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getCrmPhase2Summary);

router.route('/campaigns')
  .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createCampaign)
  .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getCampaigns);

router.route('/territories')
  .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createTerritory)
  .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getTerritories);

router.route('/account-plans')
  .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createAccountPlan)
  .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getAccountPlans);

router.route('/partner-channels')
  .post(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), createPartnerChannel)
  .get(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'), getPartnerChannels);

module.exports = router;

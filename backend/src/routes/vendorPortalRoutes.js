const express = require('express');
const router = express.Router();
const rfqController = require('../controllers/rfqController');

// Public vendor portal endpoints for RFQ bidding
router.get('/rfq/:id', rfqController.getRFQPublicDetail);
router.post('/rfq/:id/bid', rfqController.submitQuotationPublic);

module.exports = router;

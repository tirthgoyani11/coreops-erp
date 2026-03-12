const express = require('express');
const router = express.Router();
const { searchAll } = require('../controllers/searchController');
const { protect } = require('../middleware/auth');

router.use(protect); // All search routes require authentication

/**
 * @route   GET /api/search?q=query
 * @desc    Global omni-search across multiple models
 * @access  Private
 */
router.get('/', searchAll);

module.exports = router;

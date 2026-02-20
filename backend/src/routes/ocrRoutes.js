const express = require('express');
const router = express.Router();
const { processInvoice, getInvoice } = require('../controllers/ocrController');
const upload = require('../middleware/upload');
const verifyToken = require('../middleware/verifyToken');

router.use(verifyToken);

router.post('/upload', upload.single('invoice'), processInvoice);
router.get('/:id', getInvoice);

module.exports = router;

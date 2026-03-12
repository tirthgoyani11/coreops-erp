const express = require('express');
const router = express.Router();
const { processInvoice, getInvoice, getInvoices } = require('../controllers/ocrController');
const upload = require('../middleware/upload');
const verifyToken = require('../middleware/verifyToken');

router.use(verifyToken);

// Upload & scan invoice (multipart, field: "invoice")
router.post('/upload', upload.single('invoice'), processInvoice);

// List all scanned invoices
router.get('/', getInvoices);

// Get single scanned invoice
router.get('/:id', getInvoice);

module.exports = router;

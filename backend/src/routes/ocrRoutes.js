const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ocrService = require('../services/ocrService');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

// Configure multer for image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files (jpg, jpeg, png) are allowed!'));
    },
});

// Ensure uploads directory exists
const fs = require('fs');
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

/**
 * @route   POST /api/ocr/scan
 * @desc    Scan invoice image and extract data
 * @access  Private (Manager only)
 */
router.post('/scan', verifyToken, authorize('SUPER_ADMIN', 'MANAGER'), upload.single('invoice'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file uploaded',
            });
        }

        const result = await ocrService.scanInvoice(req.file.path);

        res.json({
            success: true,
            data: result,
            message: 'Invoice scanned successfully',
        });
    } catch (error) {
        // Clean up file if error occurs
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        console.error('OCR Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process invoice',
            error: error.message,
        });
    }
});

module.exports = router;

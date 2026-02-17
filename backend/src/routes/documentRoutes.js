const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    getDocuments,
    getDocument,
    uploadDocuments,
    updateDocument,
    deleteDocument,
    downloadDocument,
} = require('../controllers/documentController');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

// Multer config — memory storage (compatible with both local and Cloudinary)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'text/plain',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/svg+xml',
            'image/webp',
            'application/zip',
            'application/x-zip-compressed',
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} is not allowed`), false);
        }
    },
});

// All routes require authentication
router.use(verifyToken);

// List & search documents
router.get('/', getDocuments);

// Get single document
router.get('/:id', getDocument);

// Upload documents (up to 10 files at once)
router.post(
    '/upload',
    authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'),
    upload.array('files', 10),
    uploadDocuments
);

// Update document metadata
router.put('/:id', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'), updateDocument);

// Delete document
router.delete('/:id', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), deleteDocument);

// Download/stream file
router.get('/:id/download', downloadDocument);

module.exports = router;

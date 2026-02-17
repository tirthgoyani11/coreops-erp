const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    getProfile,
    updateProfile,
    updateAvatar,
    changePassword,
} = require('../controllers/profileController');
const verifyToken = require('../middleware/verifyToken');

// Multer config for avatar upload (memory storage for cloud compatibility)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
        }
    },
});

// All profile routes require authentication
router.use(verifyToken);

router.get('/', getProfile);
router.put('/', updateProfile);
router.put('/avatar', upload.single('avatar'), updateAvatar);
router.put('/password', changePassword);

module.exports = router;

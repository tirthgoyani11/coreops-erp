const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');

const BCRYPT_ROUNDS = 12;

/**
 * @desc    Get current user's full profile
 * @route   GET /api/profile
 * @access  Private
 */
exports.getProfile = asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { office: { select: { id: true, name: true } } },
    });

    const { password, passwordResetToken, passwordResetExpires, ...safe } = user;

    res.json({ success: true, data: safe });
});

/**
 * @desc    Update profile (name, phone, preferences)
 * @route   PUT /api/profile
 * @access  Private
 */
exports.updateProfile = asyncHandler(async (req, res) => {
    const allowedFields = ['name', 'firstName', 'lastName', 'phone', 'preferences'];
    const updates = {};

    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    }

    // Merge nested preferences
    if (updates.preferences && typeof updates.preferences === 'object') {
        const current = await prisma.user.findUnique({ where: { id: req.user.id }, select: { preferences: true } });
        const currentPrefs = (typeof current.preferences === 'object' && current.preferences) || {};
        updates.preferences = {
            ...currentPrefs,
            ...updates.preferences,
            notifications: {
                ...(currentPrefs.notifications || {}),
                ...(updates.preferences.notifications || {}),
            },
        };
    }

    const user = await prisma.user.update({
        where: { id: req.user.id },
        data: updates,
        include: { office: { select: { id: true, name: true } } },
    });

    const { password, passwordResetToken, passwordResetExpires, ...safe } = user;

    res.json({ success: true, message: 'Profile updated successfully', data: safe });
});

/**
 * @desc    Upload/change avatar
 * @route   PUT /api/profile/avatar
 * @access  Private
 */
exports.updateAvatar = asyncHandler(async (req, res, next) => {
    if (!req.file) return next(new AppError('Please upload an image file', 400));

    const storageService = require('../services/storageService');
    const result = await storageService.upload(req.file, 'avatars');

    // Delete old avatar
    const current = await prisma.user.findUnique({ where: { id: req.user.id }, select: { avatar: true } });
    if (current.avatar) {
        try { await storageService.delete(current.avatar); } catch (e) { /* ignore */ }
    }

    await prisma.user.update({
        where: { id: req.user.id },
        data: { avatar: result.url },
    });

    res.json({ success: true, message: 'Avatar updated successfully', data: { avatar: result.url } });
});

/**
 * @desc    Change password
 * @route   PUT /api/profile/password
 * @access  Private
 */
exports.changePassword = asyncHandler(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) return next(new AppError('Please provide current and new password', 400));
    if (newPassword.length < 8) return next(new AppError('New password must be at least 8 characters', 400));

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return next(new AppError('Current password is incorrect', 401));

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await prisma.user.update({
        where: { id: req.user.id },
        data: { password: hashedPassword, passwordChangedAt: new Date() },
    });

    res.json({ success: true, message: 'Password changed successfully' });
});

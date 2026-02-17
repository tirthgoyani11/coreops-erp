const User = require('../models/User');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const path = require('path');
const fs = require('fs');

/**
 * Profile Controller
 * Handles user profile management (view, update, avatar, password change)
 */

/**
 * @desc    Get current user's full profile
 * @route   GET /api/profile
 * @access  Private
 */
exports.getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .populate('officeId', 'name city')
        .lean();

    res.json({
        success: true,
        data: user,
    });
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

    // Merge nested preferences instead of replacing
    if (updates.preferences && typeof updates.preferences === 'object') {
        const currentUser = await User.findById(req.user._id).lean();
        updates.preferences = {
            ...currentUser.preferences,
            ...updates.preferences,
            notifications: {
                ...(currentUser.preferences?.notifications || {}),
                ...(updates.preferences.notifications || {}),
            },
        };
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true, runValidators: true }
    ).populate('officeId', 'name city');

    res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user,
    });
});

/**
 * @desc    Upload/change avatar
 * @route   PUT /api/profile/avatar
 * @access  Private
 */
exports.updateAvatar = asyncHandler(async (req, res, next) => {
    if (!req.file) {
        return next(new AppError('Please upload an image file', 400));
    }

    const storageService = require('../services/storageService');
    const result = await storageService.upload(req.file, 'avatars');

    // Delete old avatar if exists
    const currentUser = await User.findById(req.user._id);
    if (currentUser.avatar) {
        try {
            await storageService.delete(currentUser.avatar);
        } catch (e) {
            // Ignore deletion errors for old avatar
        }
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { avatar: result.url },
        { new: true }
    );

    res.json({
        success: true,
        message: 'Avatar updated successfully',
        data: { avatar: user.avatar },
    });
});

/**
 * @desc    Change password (requires current password)
 * @route   PUT /api/profile/password
 * @access  Private
 */
exports.changePassword = asyncHandler(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return next(new AppError('Please provide current and new password', 400));
    }

    if (newPassword.length < 8) {
        return next(new AppError('New password must be at least 8 characters', 400));
    }

    // Get user with password field
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        return next(new AppError('Current password is incorrect', 401));
    }

    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    res.json({
        success: true,
        message: 'Password changed successfully',
    });
});

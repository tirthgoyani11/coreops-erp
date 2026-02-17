const Settings = require('../models/Settings');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * Settings Controller — SUPER_ADMIN only
 * Global system configuration management
 */

/**
 * @desc    Get system settings
 * @route   GET /api/settings
 * @access  SUPER_ADMIN
 */
exports.getSettings = asyncHandler(async (req, res) => {
    const settings = await Settings.getSettings();

    res.json({
        success: true,
        data: settings,
    });
});

/**
 * @desc    Update system settings
 * @route   PUT /api/settings
 * @access  SUPER_ADMIN
 */
exports.updateSettings = asyncHandler(async (req, res) => {
    const allowedFields = [
        'companyName',
        'companyLogo',
        'defaultCurrency',
        'defaultTimezone',
        'maintenanceMode',
        'sessionTimeout',
        'passwordPolicy',
    ];

    const updates = {};
    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    }

    // Merge nested passwordPolicy
    if (updates.passwordPolicy && typeof updates.passwordPolicy === 'object') {
        const current = await Settings.getSettings();
        updates.passwordPolicy = {
            ...current.passwordPolicy?.toObject?.() || current.passwordPolicy,
            ...updates.passwordPolicy,
        };
    }

    let settings = await Settings.getSettings();
    Object.assign(settings, updates);
    await settings.save();

    res.json({
        success: true,
        message: 'Settings updated successfully',
        data: settings,
    });
});

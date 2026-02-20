const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * Settings Controller — SUPER_ADMIN only
 */

exports.getSettings = asyncHandler(async (req, res) => {
    // Upsert to ensure settings always exist (singleton pattern)
    let settings = await prisma.settings.findFirst();

    if (!settings) {
        settings = await prisma.settings.create({
            data: {
                companyName: 'CoreOps ERP',
                defaultCurrency: 'INR',
                defaultTimezone: 'Asia/Kolkata',
            },
        });
    }

    res.json({ success: true, data: settings });
});

exports.updateSettings = asyncHandler(async (req, res) => {
    const allowedFields = [
        'companyName', 'companyLogo', 'defaultCurrency', 'defaultTimezone',
        'maintenanceMode', 'sessionTimeout', 'passwordPolicy',
    ];

    const updates = {};
    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    }

    // Merge nested passwordPolicy
    if (updates.passwordPolicy && typeof updates.passwordPolicy === 'object') {
        const current = await prisma.settings.findFirst();
        const currentPolicy = (typeof current.passwordPolicy === 'object' && current.passwordPolicy) || {};
        updates.passwordPolicy = { ...currentPolicy, ...updates.passwordPolicy };
    }

    let settings = await prisma.settings.findFirst();

    if (!settings) {
        settings = await prisma.settings.create({ data: updates });
    } else {
        settings = await prisma.settings.update({
            where: { id: settings.id },
            data: updates,
        });
    }

    res.json({ success: true, message: 'Settings updated successfully', data: settings });
});

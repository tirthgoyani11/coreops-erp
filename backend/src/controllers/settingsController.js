const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * Settings Controller — SUPER_ADMIN only
 */

const SETTINGS_KEY = 'system_settings';

const DEFAULT_SETTINGS = {
    companyName: 'CoreOps ERP',
    companyLogo: '',
    defaultCurrency: 'INR',
    defaultTimezone: 'Asia/Kolkata',
    maintenanceMode: false,
    sessionTimeout: 60,
    passwordPolicy: {
        minLength: 8,
        requireSpecialChar: true,
        requireNumber: true,
    },
};

const sanitizeSettingsPatch = (payload = {}) => {
    const patch = {};

    if (payload.companyName !== undefined) patch.companyName = String(payload.companyName || '').trim();
    if (payload.companyLogo !== undefined) patch.companyLogo = String(payload.companyLogo || '').trim();
    if (payload.defaultCurrency !== undefined) patch.defaultCurrency = String(payload.defaultCurrency || 'INR').toUpperCase().trim();
    if (payload.defaultTimezone !== undefined) patch.defaultTimezone = String(payload.defaultTimezone || 'Asia/Kolkata').trim();
    if (payload.maintenanceMode !== undefined) patch.maintenanceMode = Boolean(payload.maintenanceMode);

    if (payload.sessionTimeout !== undefined) {
        const timeout = Number(payload.sessionTimeout);
        if (Number.isFinite(timeout)) {
            patch.sessionTimeout = Math.min(1440, Math.max(5, Math.round(timeout)));
        }
    }

    if (payload.passwordPolicy && typeof payload.passwordPolicy === 'object') {
        const policyPatch = {};
        if (payload.passwordPolicy.minLength !== undefined) {
            const minLength = Number(payload.passwordPolicy.minLength);
            if (Number.isFinite(minLength)) {
                policyPatch.minLength = Math.min(64, Math.max(6, Math.round(minLength)));
            }
        }
        if (payload.passwordPolicy.requireSpecialChar !== undefined) {
            policyPatch.requireSpecialChar = Boolean(payload.passwordPolicy.requireSpecialChar);
        }
        if (payload.passwordPolicy.requireNumber !== undefined) {
            policyPatch.requireNumber = Boolean(payload.passwordPolicy.requireNumber);
        }
        patch.passwordPolicy = policyPatch;
    }

    return patch;
};

const mergeSettings = (storedValue = {}) => ({
    ...DEFAULT_SETTINGS,
    ...(storedValue || {}),
    passwordPolicy: {
        ...DEFAULT_SETTINGS.passwordPolicy,
        ...((storedValue && storedValue.passwordPolicy) || {}),
    },
});

exports.getSettings = asyncHandler(async (req, res) => {
    const settingsRow = await prisma.settings.upsert({
        where: { key: SETTINGS_KEY },
        update: {},
        create: {
            key: SETTINGS_KEY,
            value: DEFAULT_SETTINGS,
        },
    });

    const data = mergeSettings(settingsRow.value && typeof settingsRow.value === 'object' ? settingsRow.value : {});

    res.json({ success: true, data });
});

exports.updateSettings = asyncHandler(async (req, res) => {
    const patch = sanitizeSettingsPatch(req.body || {});

    const currentRow = await prisma.settings.upsert({
        where: { key: SETTINGS_KEY },
        update: {},
        create: {
            key: SETTINGS_KEY,
            value: DEFAULT_SETTINGS,
        },
    });

    const currentData = mergeSettings(currentRow.value && typeof currentRow.value === 'object' ? currentRow.value : {});
    const nextData = {
        ...currentData,
        ...patch,
        passwordPolicy: {
            ...currentData.passwordPolicy,
            ...(patch.passwordPolicy || {}),
        },
    };

    const updated = await prisma.settings.update({
        where: { key: SETTINGS_KEY },
        data: { value: nextData },
    });

    res.json({ success: true, message: 'Settings updated successfully', data: mergeSettings(updated.value) });
});

const mongoose = require('mongoose');

/**
 * Settings Schema — Singleton pattern
 * Global system configuration (SUPER_ADMIN managed)
 */
const SettingsSchema = new mongoose.Schema(
    {
        companyName: {
            type: String,
            default: 'CoreOps ERP',
            trim: true,
            maxlength: [200, 'Company name cannot exceed 200 characters'],
        },
        companyLogo: {
            type: String,
            maxlength: [500, 'Logo URL cannot exceed 500 characters'],
        },
        defaultCurrency: {
            type: String,
            default: 'INR',
            trim: true,
            maxlength: 10,
        },
        defaultTimezone: {
            type: String,
            default: 'Asia/Kolkata',
            trim: true,
            maxlength: 50,
        },
        maintenanceMode: {
            type: Boolean,
            default: false,
        },
        sessionTimeout: {
            type: Number,
            default: 30, // minutes
            min: 5,
            max: 1440,
        },
        passwordPolicy: {
            minLength: { type: Number, default: 8, min: 6, max: 32 },
            requireSpecialChar: { type: Boolean, default: true },
            requireNumber: { type: Boolean, default: true },
            requireUppercase: { type: Boolean, default: true },
        },
    },
    {
        timestamps: true,
    }
);

/**
 * Singleton: Always return the single settings document
 */
SettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('Settings', SettingsSchema);

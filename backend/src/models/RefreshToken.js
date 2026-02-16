const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Refresh Token Schema
 * Implements token family + reuse detection per doc 05 §5.3
 * 
 * Security model:
 * - Each login creates a new "token family"
 * - Each refresh rotates to a new token in the same family
 * - Reusing an already-used token → revoke the entire family (theft indicator)
 */
const RefreshTokenSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        family: {
            type: String,
            required: true,
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        isUsed: {
            type: Boolean,
            default: false,
        },
        replacedByToken: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// TTL index — auto-delete expired tokens
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Generate a cryptographically secure refresh token
 */
RefreshTokenSchema.statics.generateToken = function () {
    return crypto.randomBytes(40).toString('hex');
};

/**
 * Generate a new token family ID (created on login)
 */
RefreshTokenSchema.statics.generateFamily = function () {
    return crypto.randomBytes(16).toString('hex');
};

/**
 * Revoke all tokens in a family (security measure on reuse detection)
 */
RefreshTokenSchema.statics.revokeFamily = async function (family) {
    return this.deleteMany({ family });
};

/**
 * Revoke all tokens for a specific user (logout from all devices)
 */
RefreshTokenSchema.statics.revokeAllForUser = async function (userId) {
    return this.deleteMany({ userId });
};

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);

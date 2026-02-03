const mongoose = require('mongoose');

/**
 * Audit Log Schema
 * Comprehensive activity tracking for security, compliance, and troubleshooting
 * Per README Section 3.2 - Audit Logs Collection Schema
 */
const AuditLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },
        action: {
            type: String,
            required: [true, 'Action is required'],
            enum: {
                values: [
                    // Authentication actions
                    'login',
                    'logout',
                    'login_failed',
                    'password_change',
                    'password_reset',
                    // Asset actions
                    'create_asset',
                    'update_asset',
                    'delete_asset',
                    'transfer_asset',
                    // Maintenance actions
                    'create_ticket',
                    'approve_ticket',
                    'reject_ticket',
                    'close_ticket',
                    'assign_ticket',
                    // Inventory actions
                    'create_inventory',
                    'update_inventory',
                    'delete_inventory',
                    'stock_in',
                    'stock_out',
                    'stock_adjustment',
                    // Vendor actions
                    'create_vendor',
                    'update_vendor',
                    'delete_vendor',
                    'blacklist_vendor',
                    // Purchase Order actions
                    'create_purchase_order',
                    'update_purchase_order',
                    'approve_purchase_order',
                    'reject_purchase_order',
                    'cancel_purchase_order',
                    'receive_purchase_order',
                    // User actions
                    'create_user',
                    'update_user',
                    'delete_user',
                    'activate_user',
                    'deactivate_user',
                    // Office actions
                    'create_office',
                    'update_office',
                    'delete_office',
                    // Financial actions
                    'create_transaction',
                    'update_transaction',
                    'currency_conversion',
                    // System actions
                    'system_error',
                    'data_export',
                    'settings_change',
                ],
                message: '{VALUE} is not a valid action',
            },
        },
        resourceType: {
            type: String,
            enum: [
                'User',
                'Asset',
                'Maintenance',
                'Inventory',
                'Vendor',
                'Office',
                'FinanceLog',
                'CurrencyRate',
                'PurchaseOrder',
                'System',
            ],
        },
        resourceId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        // Track what changed
        changes: {
            before: {
                type: mongoose.Schema.Types.Mixed,
            },
            after: {
                type: mongoose.Schema.Types.Mixed,
            },
            fields: [String], // List of changed field names
        },
        // Request metadata
        ipAddress: {
            type: String,
            trim: true,
        },
        userAgent: {
            type: String,
            trim: true,
            maxlength: [500, 'User agent too long'],
        },
        // Result of the action
        status: {
            type: String,
            enum: ['success', 'failure', 'error'],
            default: 'success',
        },
        errorMessage: {
            type: String,
            trim: true,
        },
        // Additional context
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        timestamp: {
            type: Date,
            default: Date.now,
            required: true,
            index: true,
        },
        sessionId: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: false, // We use our own timestamp field
    }
);

// Indexes for efficient queries
AuditLogSchema.index({ user: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });
AuditLogSchema.index({ status: 1 });
// Optional: TTL index to auto-delete old logs after 1 year
// AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

/**
 * Static method: Log an action
 */
AuditLogSchema.statics.log = async function (data) {
    try {
        return await this.create({
            ...data,
            timestamp: new Date(),
        });
    } catch (error) {
        // Don't let audit logging failures break the application
        console.error('Audit log error:', error.message);
        return null;
    }
};

/**
 * Static method: Log authentication action
 */
AuditLogSchema.statics.logAuth = async function (action, userId, ipAddress, userAgent, success = true) {
    return await this.log({
        user: userId,
        action,
        resourceType: 'User',
        resourceId: userId,
        ipAddress,
        userAgent,
        status: success ? 'success' : 'failure',
    });
};

/**
 * Static method: Log CRUD action with changes
 */
AuditLogSchema.statics.logChange = async function (
    action,
    userId,
    resourceType,
    resourceId,
    before,
    after,
    req = null
) {
    // Calculate which fields changed
    const fields = [];
    if (before && after) {
        const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
        for (const key of allKeys) {
            if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
                fields.push(key);
            }
        }
    }

    return await this.log({
        user: userId,
        action,
        resourceType,
        resourceId,
        changes: { before, after, fields },
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.get?.('user-agent'),
        status: 'success',
    });
};

/**
 * Static method: Get recent activity for a user
 */
AuditLogSchema.statics.getRecentActivity = async function (userId, limit = 20) {
    return await this.find({ user: userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
};

/**
 * Static method: Get activity for a resource
 */
AuditLogSchema.statics.getResourceHistory = async function (resourceType, resourceId) {
    return await this.find({ resourceType, resourceId })
        .populate('user', 'name email')
        .sort({ timestamp: -1 })
        .lean();
};

/**
 * Static method: Get failed login attempts for security monitoring
 */
AuditLogSchema.statics.getFailedLogins = async function (since = null) {
    const query = { action: 'login_failed', status: 'failure' };
    if (since) {
        query.timestamp = { $gte: since };
    }
    return await this.find(query)
        .sort({ timestamp: -1 })
        .limit(100)
        .lean();
};

module.exports = mongoose.model('AuditLog', AuditLogSchema);

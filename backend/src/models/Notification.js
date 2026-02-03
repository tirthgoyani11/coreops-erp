const mongoose = require('mongoose');

/**
 * Notification Schema
 * System notifications for approvals, alerts, and important events
 * Per README Section 3.2 - Notifications Collection Schema
 */
const NotificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Recipient is required'],
            index: true,
        },
        type: {
            type: String,
            enum: {
                values: [
                    'approval_required',
                    'low_stock',
                    'ticket_assigned',
                    'ticket_completed',
                    'ticket_approved',
                    'ticket_rejected',
                    'asset_transferred',
                    'system_alert',
                    'vendor_update',
                ],
                message: '{VALUE} is not a valid notification type',
            },
            required: [true, 'Notification type is required'],
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        message: {
            type: String,
            required: [true, 'Message is required'],
            trim: true,
            maxlength: [1000, 'Message cannot exceed 1000 characters'],
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
        // Reference to related document
        relatedDocument: {
            model: {
                type: String,
                enum: ['Maintenance', 'Asset', 'Inventory', 'Vendor', 'Office', 'User'],
            },
            documentId: {
                type: mongoose.Schema.Types.ObjectId,
            },
        },
        // Action buttons for the notification
        actions: [
            {
                label: { type: String }, // e.g., 'Approve', 'View', 'Dismiss'
                action: { type: String }, // e.g., 'approve_ticket', 'view_asset'
                url: { type: String },
            },
        ],
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
        },
        sentAt: {
            type: Date,
            default: Date.now,
        },
        expiresAt: {
            type: Date,
            // Default: 30 days from creation
            default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient queries
NotificationSchema.index({ recipient: 1, isRead: 1, sentAt: -1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

/**
 * Static method: Create notification for a user
 */
NotificationSchema.statics.createNotification = async function (data) {
    return await this.create(data);
};

/**
 * Static method: Get unread count for a user
 */
NotificationSchema.statics.getUnreadCount = async function (userId) {
    return await this.countDocuments({
        recipient: userId,
        isRead: false,
    });
};

/**
 * Static method: Mark all as read for a user
 */
NotificationSchema.statics.markAllAsRead = async function (userId) {
    return await this.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true, readAt: new Date() }
    );
};

/**
 * Static method: Create approval notification
 */
NotificationSchema.statics.createApprovalNotification = async function (
    recipientId,
    ticketId,
    assetName,
    requestedBy
) {
    return await this.create({
        recipient: recipientId,
        type: 'approval_required',
        title: 'Maintenance Approval Required',
        message: `Maintenance request for "${assetName}" requires your approval. Requested by ${requestedBy}.`,
        priority: 'high',
        relatedDocument: {
            model: 'Maintenance',
            documentId: ticketId,
        },
        actions: [
            { label: 'View', action: 'view_ticket', url: `/maintenance/${ticketId}` },
            { label: 'Approve', action: 'approve_ticket' },
            { label: 'Reject', action: 'reject_ticket' },
        ],
    });
};

/**
 * Static method: Create low stock notification
 */
NotificationSchema.statics.createLowStockNotification = async function (
    recipientId,
    itemId,
    itemName,
    currentQuantity,
    minimumQuantity
) {
    return await this.create({
        recipient: recipientId,
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `"${itemName}" is running low. Current: ${currentQuantity}, Minimum: ${minimumQuantity}.`,
        priority: 'medium',
        relatedDocument: {
            model: 'Inventory',
            documentId: itemId,
        },
        actions: [
            { label: 'View Item', action: 'view_item', url: `/inventory/${itemId}` },
        ],
    });
};

/**
 * Instance method: Mark as read
 */
NotificationSchema.methods.markAsRead = function () {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
};

module.exports = mongoose.model('Notification', NotificationSchema);

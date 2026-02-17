const mongoose = require('mongoose');

/**
 * Document Schema
 * File metadata for the Document Management System
 * Actual files stored via storageService (local disk or Cloudinary)
 */
const DocumentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Document name is required'],
            trim: true,
            maxlength: [200, 'Name cannot exceed 200 characters'],
        },
        originalName: {
            type: String,
            required: true,
            trim: true,
        },
        mimeType: {
            type: String,
            required: true,
        },
        size: {
            type: Number,
            required: true,
        },
        url: {
            type: String,
            required: true,
        },
        publicId: {
            type: String, // Cloudinary public_id or local relative path
        },
        category: {
            type: String,
            enum: {
                values: ['GENERAL', 'ASSET', 'MAINTENANCE', 'INVOICE', 'CONTRACT', 'POLICY', 'OTHER'],
                message: '{VALUE} is not a valid category',
            },
            default: 'GENERAL',
        },
        tags: [{
            type: String,
            trim: true,
            lowercase: true,
        }],
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
        },
        officeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Office',
            default: null,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        linkedAsset: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Asset',
            default: null,
        },
        linkedTicket: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Maintenance',
            default: null,
        },
        version: {
            type: Number,
            default: 1,
        },
        isArchived: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
DocumentSchema.index({ officeId: 1, category: 1 });
DocumentSchema.index({ uploadedBy: 1, createdAt: -1 });
DocumentSchema.index({ tags: 1 });
DocumentSchema.index({ name: 'text', description: 'text' }); // Full-text search

/**
 * Format file size for display
 */
DocumentSchema.virtual('formattedSize').get(function () {
    const bytes = this.size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
});

module.exports = mongoose.model('Document', DocumentSchema);

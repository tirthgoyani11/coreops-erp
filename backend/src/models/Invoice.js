const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    originalFileName: String,
    filePath: String,
    uploadDate: {
        type: Date,
        default: Date.now
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Extracted Data (AI)
    extractedData: {
        invoiceNumber: String,
        date: Date,
        totalAmount: Number,
        vendorName: String,
        lineItems: [{
            description: String,
            quantity: Number,
            unitPrice: Number,
            total: Number
        }],
        confidenceScore: Number
    },

    status: {
        type: String,
        enum: ['PROCESSING', 'REVIEW_REQUIRED', 'VERIFIED', 'REJECTED'],
        default: 'PROCESSING'
    },

    linkedTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    }
});

module.exports = mongoose.model('Invoice', invoiceSchema);

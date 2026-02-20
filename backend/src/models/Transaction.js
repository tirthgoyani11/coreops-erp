const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['INCOME', 'EXPENSE'],
        required: true
    },
    category: {
        type: String,
        required: true // e.g., 'MAINTENANCE', 'PROCUREMENT', 'SALARY', 'SALES'
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    date: {
        type: Date,
        default: Date.now
    },
    description: String,

    // References
    referenceType: {
        type: String,
        enum: ['PURCHASE_ORDER', 'WORK_ORDER', 'INVOICE', 'MANUAL'],
        default: 'MANUAL'
    },
    referenceId: mongoose.Schema.Types.ObjectId, // Link to PO, WO, etc.

    officeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Office'
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    status: {
        type: String,
        enum: ['PENDING', 'CLEARED', 'CANCELLED'],
        default: 'CLEARED'
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);

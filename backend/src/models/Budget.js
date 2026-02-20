const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
    officeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Office',
        required: true
    },
    category: {
        type: String,
        required: true
    },
    period: {
        month: { type: Number, required: true }, // 1-12
        year: { type: Number, required: true }
    },
    amount: {
        limit: { type: Number, required: true },
        spent: { type: Number, default: 0 }
    },
    currency: {
        type: String,
        default: 'INR'
    },
    alerts: {
        threshold: { type: Number, default: 80 }, // Alert at 80%
        sent: { type: Boolean, default: false }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date
});

// Composite unique index
budgetSchema.index({ officeId: 1, category: 1, 'period.month': 1, 'period.year': 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);

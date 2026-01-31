const mongoose = require('mongoose');

const financeLogSchema = new mongoose.Schema({
    source: {
        type: String,
        enum: ['MAINTENANCE'],
        required: true
    },
    sourceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'sourceModel'
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true
    },
    normalizedAmount: {
        type: Number,
        required: true
    },
    officeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Office',
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('FinanceLog', financeLogSchema);

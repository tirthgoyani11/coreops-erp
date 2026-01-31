const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
    assetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset',
        required: true
    },
    officeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Office',
        required: true
    },
    issueDescription: {
        type: String,
        required: true
    },
    repairCost: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: "INR"
    },
    decision: {
        type: String,
        enum: ['REPAIR', 'REPLACE'],
        required: true
    },
    sparePartsUsed: [{
        inventoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Inventory'
        },
        quantity: {
            type: Number,
            required: true
        }
    }],
    status: {
        type: String,
        enum: ['REQUESTED', 'APPROVED', 'REJECTED', 'CLOSED'],
        default: 'REQUESTED'
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('Maintenance', maintenanceSchema);

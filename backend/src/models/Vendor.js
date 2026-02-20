const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a vendor name'],
        trim: true
    },
    vendorCode: {
        type: String,
        unique: true
    },
    type: {
        type: String,
        enum: ['MANUFACTURER', 'DISTRIBUTOR', 'SERVICE_PROVIDER', 'CONTRACTOR'],
        required: true
    },
    contactPerson: {
        name: String,
        email: String,
        phone: String
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    paymentTerms: {
        type: String, // e.g., "Net 30", "Immediate"
        default: 'Net 30'
    },
    taxId: String,

    // Performance Metrics
    performanceMetrics: {
        onTimeDeliveries: { type: Number, default: 0 }, // Percentage
        qualityRating: { type: Number, default: 0 }, // 1-5 Scale
        totalOrders: { type: Number, default: 0 }
    },
    reliabilityScore: {
        overallScore: { type: Number, default: 0 }, // Calculated 0-100
        lastUpdated: Date
    },

    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-generate Vendor Code
vendorSchema.pre('save', async function (next) {
    if (!this.vendorCode) {
        const count = await this.constructor.countDocuments();
        this.vendorCode = `VEND-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Vendor', vendorSchema);

const mongoose = require('mongoose');

/**
 * Vendor Schema
 * Stores vendor profiles with reliability scoring based on MTBF and performance metrics
 * Per README Section 3.2 - Vendors Collection Schema
 */
const VendorSchema = new mongoose.Schema(
    {
        vendorCode: {
            type: String,
            unique: true,
            uppercase: true,
            // Auto-generated in pre-save hook
        },
        name: {
            type: String,
            required: [true, 'Vendor name is required'],
            trim: true,
            maxlength: [200, 'Name cannot exceed 200 characters'],
        },
        type: {
            type: String,
            enum: {
                values: ['supplier', 'service_provider', 'both'],
                message: '{VALUE} is not a valid vendor type',
            },
            default: 'supplier',
        },
        contactInfo: {
            primaryContact: { type: String, trim: true },
            email: {
                type: String,
                required: [true, 'Email is required'],
                lowercase: true,
                trim: true,
                match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
            },
            phone: { type: String, trim: true },
            alternatePhone: { type: String, trim: true },
            website: { type: String, trim: true },
        },
        address: {
            street: { type: String, trim: true },
            city: { type: String, trim: true },
            state: { type: String, trim: true },
            country: { type: String, trim: true },
            postalCode: { type: String, trim: true },
        },
        businessInfo: {
            taxId: { type: String, trim: true },
            registrationNumber: { type: String, trim: true },
            industry: { type: String, trim: true },
            yearsInBusiness: { type: Number, min: 0 },
        },
        paymentTerms: {
            creditDays: { type: Number, default: 30, min: 0 },
            paymentMethod: {
                type: String,
                enum: ['bank_transfer', 'check', 'credit_card', 'cash'],
                default: 'bank_transfer',
            },
            currency: { type: String, default: 'INR', uppercase: true },
            discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
        },
        // Reliability scoring based on MTBF analytics
        reliabilityScore: {
            overallScore: { type: Number, min: 0, max: 100, default: 50 },
            mtbfScore: { type: Number, min: 0, max: 100, default: 50 },
            deliveryScore: { type: Number, min: 0, max: 100, default: 50 },
            qualityScore: { type: Number, min: 0, max: 100, default: 50 },
            priceScore: { type: Number, min: 0, max: 100, default: 50 },
            lastCalculated: { type: Date },
        },
        // Performance tracking metrics
        performanceMetrics: {
            totalOrders: { type: Number, default: 0, min: 0 },
            completedOrders: { type: Number, default: 0, min: 0 },
            cancelledOrders: { type: Number, default: 0, min: 0 },
            averageDeliveryDays: { type: Number, min: 0 },
            onTimeDeliveryRate: { type: Number, min: 0, max: 100 },
            defectRate: { type: Number, min: 0, max: 100 },
            totalPartsSupplied: { type: Number, default: 0, min: 0 },
            totalFailures: { type: Number, default: 0, min: 0 },
        },
        certifications: [
            {
                name: { type: String },
                issuedBy: { type: String },
                issuedDate: { type: Date },
                expiryDate: { type: Date },
                certificateNumber: { type: String },
            },
        ],
        documents: [
            {
                type: { type: String }, // contract, insurance, tax_certificate
                fileName: { type: String },
                filePath: { type: String },
                uploadedDate: { type: Date, default: Date.now },
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
        },
        blacklisted: {
            type: Boolean,
            default: false,
        },
        blacklistReason: {
            type: String,
            trim: true,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: [2000, 'Notes cannot exceed 2000 characters'],
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes (Note: unique fields already have indexes via unique:true)
VendorSchema.index({ 'contactInfo.email': 1 }); // Not enforcing unique at index level
VendorSchema.index({ name: 'text' }); // Text search
VendorSchema.index({ 'reliabilityScore.overallScore': -1 });
VendorSchema.index({ isActive: 1, blacklisted: 1 });

// Virtual: Order completion rate
VendorSchema.virtual('orderCompletionRate').get(function () {
    if (this.performanceMetrics.totalOrders === 0) return 0;
    return (
        (this.performanceMetrics.completedOrders /
            this.performanceMetrics.totalOrders) *
        100
    ).toFixed(2);
});

// Virtual: Calculate MTBF from failure data
VendorSchema.virtual('averageMTBF').get(function () {
    if (this.performanceMetrics.totalFailures === 0) return Infinity;
    // Assuming 1000 operating hours per part on average
    const totalOperatingHours = this.performanceMetrics.totalPartsSupplied * 1000;
    return Math.round(totalOperatingHours / this.performanceMetrics.totalFailures);
});

// Pre-save hook to generate vendorCode using atomic counter
VendorSchema.pre('save', async function () {
    if (this.vendorCode) return;

    const Counter = require('./Counter');
    this.vendorCode = await Counter.generateVendorCode();
});

// Method to calculate reliability score
VendorSchema.methods.calculateReliabilityScore = function () {
    const metrics = this.performanceMetrics;

    // MTBF Score (40% weight) - Higher MTBF = better score
    let mtbfScore = 50;
    if (metrics.totalPartsSupplied > 0 && metrics.totalFailures >= 0) {
        const avgMTBF = this.averageMTBF;
        // Score based on MTBF (5000 hours = 100, 0 = 0)
        mtbfScore = Math.min(100, (avgMTBF / 5000) * 100);
    }

    // Delivery Score (25% weight) - On-time delivery rate
    const deliveryScore = metrics.onTimeDeliveryRate || 50;

    // Quality Score (20% weight) - (1 - defect rate) × 100
    const qualityScore = 100 - (metrics.defectRate || 0);

    // Price Score (15% weight) - Default 50 (neutral)
    const priceScore = this.reliabilityScore.priceScore || 50;

    // Calculate weighted overall score
    const overallScore =
        mtbfScore * 0.4 +
        deliveryScore * 0.25 +
        qualityScore * 0.2 +
        priceScore * 0.15;

    this.reliabilityScore = {
        overallScore: Math.round(overallScore * 100) / 100,
        mtbfScore: Math.round(mtbfScore * 100) / 100,
        deliveryScore: Math.round(deliveryScore * 100) / 100,
        qualityScore: Math.round(qualityScore * 100) / 100,
        priceScore: Math.round(priceScore * 100) / 100,
        lastCalculated: new Date(),
    };

    return this.reliabilityScore;
};

module.exports = mongoose.model('Vendor', VendorSchema);

const mongoose = require('mongoose');

/**
 * Asset Schema (Enhanced per README Section 3.2)
 * Complete asset registry with GUAI, lifecycle tracking, and depreciation
 * 
 * PRODUCTION NOTES:
 * - Uses Counter model for atomic GUAI generation
 * - Depreciation calculation is timezone-aware
 * - All monetary values stored with 2 decimal precision
 * - Maintenance history is capped at 1000 entries for performance
 */

// Constants
const CONSTANTS = {
    MAX_NAME_LENGTH: 200,
    MAX_NOTES_LENGTH: 2000,
    MAX_MAINTENANCE_HISTORY: 1000,
    DEFAULT_USEFUL_LIFE: 5,
    DEFAULT_CURRENCY: 'INR',
};

// Category code mapping
const CATEGORY_CODES = {
    LAPTOP: 'LAPT',
    COMPUTER: 'COMP',
    FURNITURE: 'FURN',
    VEHICLE: 'VEHI',
    EQUIPMENT: 'EQUP',
    PHONE: 'PHON',
    PRINTER: 'PRNT',
    SERVER: 'SERV',
    NETWORK: 'NETW',
    MACHINERY: 'MACH',
    OTHER: 'OTHR',
};

const AssetSchema = new mongoose.Schema(
    {
        guai: {
            type: String,
            unique: true,
            uppercase: true,
            immutable: true, // GUAI should never change
        },
        name: {
            type: String,
            required: [true, 'Asset name is required'],
            trim: true,
            maxlength: [CONSTANTS.MAX_NAME_LENGTH, `Name cannot exceed ${CONSTANTS.MAX_NAME_LENGTH} characters`],
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            trim: true,
            uppercase: true,
            enum: {
                values: Object.keys(CATEGORY_CODES),
                message: '{VALUE} is not a valid category',
            },
        },
        manufacturer: {
            type: String,
            trim: true,
            maxlength: [100, 'Manufacturer cannot exceed 100 characters'],
        },
        model: {
            type: String,
            trim: true,
            maxlength: [100, 'Model cannot exceed 100 characters'],
        },
        serialNumber: {
            type: String,
            trim: true,
            maxlength: [100, 'Serial number cannot exceed 100 characters'],
        },
        // Enhanced purchase info with vendor linkage
        purchaseInfo: {
            vendor: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Vendor',
            },
            purchaseDate: {
                type: Date,
                default: Date.now,
            },
            purchasePrice: {
                type: Number,
                required: [true, 'Purchase price is required'],
                min: [0, 'Price cannot be negative'],
            },
            currency: {
                type: String,
                default: CONSTANTS.DEFAULT_CURRENCY,
                uppercase: true,
                maxlength: 3,
            },
            purchaseOrderNumber: {
                type: String,
                trim: true,
                maxlength: 50,
            },
            invoiceNumber: {
                type: String,
                trim: true,
                maxlength: 50,
            },
            warranty: {
                startDate: { type: Date },
                endDate: { type: Date },
                terms: { type: String, maxlength: 500 },
            },
        },
        // Depreciation engine per README spec
        depreciation: {
            method: {
                type: String,
                enum: ['straight_line', 'declining_balance'],
                default: 'straight_line',
            },
            usefulLife: {
                type: Number,
                default: CONSTANTS.DEFAULT_USEFUL_LIFE,
                min: [1, 'Useful life must be at least 1 year'],
                max: [50, 'Useful life cannot exceed 50 years'],
            },
            salvageValue: {
                type: Number,
                default: 0,
                min: [0, 'Salvage value cannot be negative'],
            },
            currentBookValue: {
                type: Number,
                min: 0,
            },
            depreciationRate: {
                type: Number,
                min: 0,
                max: 1,
            },
            lastCalculated: {
                type: Date,
            },
        },
        // Location info
        location: {
            building: { type: String, trim: true, maxlength: 100 },
            floor: { type: String, trim: true, maxlength: 50 },
            room: { type: String, trim: true, maxlength: 50 },
            assignedTo: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        },
        officeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Office',
            required: [true, 'Office is required'],
        },
        status: {
            type: String,
            uppercase: true,
            enum: {
                values: ['ACTIVE', 'MAINTENANCE', 'DECOMMISSIONED', 'LOST', 'SOLD', 'RETIRED'],
                message: '{VALUE} is not a valid status',
            },
            default: 'ACTIVE',
        },
        condition: {
            type: String,
            lowercase: true,
            enum: ['excellent', 'good', 'fair', 'poor'],
            default: 'good',
        },
        // Maintenance history (capped for performance)
        maintenanceHistory: {
            type: [
                {
                    ticketId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Maintenance',
                    },
                    date: { type: Date, default: Date.now },
                    type: { type: String, maxlength: 50 },
                    cost: { type: Number, min: 0 },
                    notes: { type: String, maxlength: 500 },
                },
            ],
            validate: [
                {
                    validator: function (v) {
                        return v.length <= CONSTANTS.MAX_MAINTENANCE_HISTORY;
                    },
                    message: `Maintenance history cannot exceed ${CONSTANTS.MAX_MAINTENANCE_HISTORY} entries`,
                },
            ],
        },
        // Generic History
        history: {
            type: [{
                date: { type: Date, default: Date.now },
                action: String,
                changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                details: String
            }],
            select: false
        },
        // Legacy fields for backwards compatibility
        purchaseCost: {
            type: Number,
            min: [0, 'Cost cannot be negative'],
        },
        currency: {
            type: String,
            default: CONSTANTS.DEFAULT_CURRENCY,
            uppercase: true,
            maxlength: 3,
        },
        qrCode: {
            type: String,
            maxlength: 50000, // Base64 QR codes can be large
        },
        images: {
            type: [{
                url: { type: String, required: true },
                caption: { type: String, default: '' },
                uploadedAt: { type: Date, default: Date.now }
            }],
            validate: [
                {
                    validator: function (v) {
                        return v.length <= 10;
                    },
                    message: 'Cannot have more than 10 images/documents',
                },
            ],
        },
        notes: {
            type: String,
            trim: true,
            maxlength: [CONSTANTS.MAX_NOTES_LENGTH, `Notes cannot exceed ${CONSTANTS.MAX_NOTES_LENGTH} characters`],
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes (Note: unique fields already have indexes, don't duplicate)
AssetSchema.index({ officeId: 1, status: 1 });
AssetSchema.index({ category: 1, status: 1 });
AssetSchema.index({ 'location.assignedTo': 1 });
AssetSchema.index({ serialNumber: 1 }, { sparse: true });
AssetSchema.index({ 'purchaseInfo.vendor': 1 });
AssetSchema.index({ createdAt: -1 });

// Pre-save hook to generate GUAI using atomic counter
AssetSchema.pre('save', async function () {
    // Generate GUAI if not present
    if (!this.guai) {
        const Counter = require('./Counter');
        const Office = mongoose.model('Office');

        const office = await Office.findById(this.officeId).lean();
        if (!office) {
            throw new Error('Invalid office ID');
        }

        const typeCode = CATEGORY_CODES[this.category.toUpperCase()] || 'OTHR';
        const countryCode = office.countryCode || office.country?.substring(0, 2)?.toUpperCase() || 'XX';
        const officeCode = office.code;

        // Use atomic counter for sequence generation
        this.guai = await Counter.generateGUAI(countryCode, officeCode, typeCode);
    }

    // Initialize book value if not set
    if (this.depreciation && !this.depreciation.currentBookValue) {
        this.depreciation.currentBookValue = this.purchaseInfo?.purchasePrice || this.purchaseCost || 0;
    }

    // Sync legacy fields
    if (this.purchaseInfo?.purchasePrice && !this.purchaseCost) {
        this.purchaseCost = this.purchaseInfo.purchasePrice;
    }
    if (this.purchaseInfo?.currency && !this.currency) {
        this.currency = this.purchaseInfo.currency;
    }
});

// Virtual: Total maintenance cost
AssetSchema.virtual('totalMaintenanceCost').get(function () {
    if (!this.maintenanceHistory || this.maintenanceHistory.length === 0) return 0;
    return this.maintenanceHistory.reduce((sum, record) => sum + (record.cost || 0), 0);
});

// Virtual: Age in years (precise calculation)
AssetSchema.virtual('ageInYears').get(function () {
    const purchaseDate = this.purchaseInfo?.purchaseDate || this.createdAt;
    if (!purchaseDate) return 0;
    const diffMs = Date.now() - new Date(purchaseDate).getTime();
    const years = diffMs / (1000 * 60 * 60 * 24 * 365.25); // Account for leap years
    return Math.max(0, years);
});

// Virtual: Age in years (integer)
AssetSchema.virtual('ageInYearsInt').get(function () {
    return Math.floor(this.ageInYears);
});

// Virtual: Is under warranty
AssetSchema.virtual('isUnderWarranty').get(function () {
    const warrantyEnd = this.purchaseInfo?.warranty?.endDate;
    if (!warrantyEnd) return false;
    return new Date(warrantyEnd) > new Date();
});

// Virtual: Days until warranty expires
AssetSchema.virtual('warrantyDaysRemaining').get(function () {
    const warrantyEnd = this.purchaseInfo?.warranty?.endDate;
    if (!warrantyEnd) return 0;
    const diff = new Date(warrantyEnd) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

/**
 * Method: Calculate current depreciation and book value
 * Per README - Repair-vs-Replace Algorithm needs book value
 */
AssetSchema.methods.calculateDepreciation = function () {
    const purchasePrice = this.purchaseInfo?.purchasePrice || this.purchaseCost || 0;
    const salvageValue = this.depreciation?.salvageValue || 0;
    const usefulLife = this.depreciation?.usefulLife || CONSTANTS.DEFAULT_USEFUL_LIFE;
    const method = this.depreciation?.method || 'straight_line';
    const ageInYears = this.ageInYears;

    if (purchasePrice <= 0) {
        return {
            purchasePrice: 0,
            currentBookValue: 0,
            totalDepreciation: 0,
            ageInYears,
            method,
            error: 'Invalid purchase price',
        };
    }

    let currentBookValue = purchasePrice;

    if (method === 'straight_line') {
        const annualDepreciation = (purchasePrice - salvageValue) / usefulLife;
        const totalDepreciation = Math.min(annualDepreciation * ageInYears, purchasePrice - salvageValue);
        currentBookValue = purchasePrice - totalDepreciation;
    } else if (method === 'declining_balance') {
        const rate = this.depreciation?.depreciationRate || (2 / usefulLife);
        currentBookValue = purchasePrice;
        for (let i = 0; i < Math.floor(ageInYears); i++) {
            const depreciation = currentBookValue * rate;
            currentBookValue = Math.max(currentBookValue - depreciation, salvageValue);
        }
    }

    // Ensure book value doesn't go below salvage value
    currentBookValue = Math.max(currentBookValue, salvageValue);

    // Round to 2 decimal places
    this.depreciation.currentBookValue = Math.round(currentBookValue * 100) / 100;
    this.depreciation.lastCalculated = new Date();

    return {
        purchasePrice,
        currentBookValue: this.depreciation.currentBookValue,
        totalDepreciation: Math.round((purchasePrice - this.depreciation.currentBookValue) * 100) / 100,
        annualDepreciation: Math.round(((purchasePrice - salvageValue) / usefulLife) * 100) / 100,
        ageInYears: Math.round(ageInYears * 100) / 100,
        method,
    };
};

/**
 * Method: Add maintenance record to history
 */
AssetSchema.methods.addMaintenanceRecord = async function (ticketId, type, cost, notes) {
    // Trim history if approaching limit
    if (this.maintenanceHistory.length >= CONSTANTS.MAX_MAINTENANCE_HISTORY - 1) {
        this.maintenanceHistory = this.maintenanceHistory.slice(-500); // Keep last 500
    }

    this.maintenanceHistory.push({
        ticketId,
        date: new Date(),
        type,
        cost: Math.round((cost || 0) * 100) / 100,
        notes: notes?.substring(0, 500),
    });

    return this.save();
};

// Export constants for external use
AssetSchema.statics.CONSTANTS = CONSTANTS;
AssetSchema.statics.CATEGORY_CODES = CATEGORY_CODES;

module.exports = mongoose.model('Asset', AssetSchema);

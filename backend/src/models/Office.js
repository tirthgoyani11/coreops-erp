const mongoose = require('mongoose');

/**
 * Office/Organization Schema (Enhanced per README Section 3.2)
 * Company structure, branches, locations, and organizational hierarchy
 */
const OfficeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Office name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        code: {
            type: String,
            required: [true, 'Office code is required'],
            unique: true,
            uppercase: true,
            trim: true,
            minlength: [2, 'Code must be at least 2 characters'],
            maxlength: [10, 'Code cannot exceed 10 characters'],
        },
        type: {
            type: String,
            enum: ['headquarters', 'regional_office', 'branch', 'warehouse'],
            default: 'branch',
        },
        // Hierarchical structure
        parentOrganization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Office',
            default: null, // null for headquarters
        },
        // Address per README
        address: {
            street: { type: String, trim: true },
            city: { type: String, trim: true },
            state: { type: String, trim: true },
            country: { type: String, trim: true },
            postalCode: { type: String, trim: true },
            coordinates: {
                latitude: { type: Number },
                longitude: { type: Number },
            },
        },
        // Legacy country field for backwards compatibility
        country: {
            type: String,
            trim: true,
            maxlength: [100, 'Country name cannot exceed 100 characters'],
        },
        // Contact info
        contactInfo: {
            phone: { type: String, trim: true },
            email: { type: String, trim: true, lowercase: true },
            website: { type: String, trim: true },
        },
        // Currency and locale
        baseCurrency: {
            type: String,
            default: 'INR',
            uppercase: true,
        },
        // Legacy currency field
        currency: {
            type: String,
            default: 'INR',
            uppercase: true,
            trim: true,
        },
        // Country code for GUAI generation
        countryCode: {
            type: String,
            uppercase: true,
            trim: true,
            minlength: 2,
            maxlength: 3,
        },
        // Location code for GUAI
        locationCode: {
            type: String,
            uppercase: true,
            trim: true,
            minlength: 2,
            maxlength: 5,
        },
        // Settings per README
        settings: {
            maintenanceApprovalThreshold: { type: Number, default: 5000 }, // in base currency
            autoApproveUnder: { type: Number, default: 1000 },
            lowStockThreshold: { type: Number, default: 10 },
            defaultDepreciationMethod: {
                type: String,
                enum: ['straight_line', 'declining_balance'],
                default: 'straight_line',
            },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes (Note: unique fields already have indexes, don't duplicate)
OfficeSchema.index({ name: 1, country: 1 });
OfficeSchema.index({ parentOrganization: 1 });
OfficeSchema.index({ type: 1, isActive: 1 });
OfficeSchema.index({ locationCode: 1 }, { sparse: true });

// Pre-save: Set locationCode to code if not provided
OfficeSchema.pre('save', function () {
    if (!this.locationCode) {
        this.locationCode = this.code;
    }
    // Sync baseCurrency with legacy currency field
    if (this.currency && !this.baseCurrency) {
        this.baseCurrency = this.currency;
    }
    // Sync address.country with legacy country field
    if (this.country && !this.address?.country) {
        if (!this.address) this.address = {};
        this.address.country = this.country;
    }
});

// Virtual: Get child offices
OfficeSchema.virtual('childOffices', {
    ref: 'Office',
    localField: '_id',
    foreignField: 'parentOrganization',
});

// Virtual: Full address string
OfficeSchema.virtual('fullAddress').get(function () {
    const parts = [];
    if (this.address?.street) parts.push(this.address.street);
    if (this.address?.city) parts.push(this.address.city);
    if (this.address?.state) parts.push(this.address.state);
    if (this.address?.country) parts.push(this.address.country);
    if (this.address?.postalCode) parts.push(this.address.postalCode);
    return parts.join(', ');
});

// Static: Get office hierarchy
OfficeSchema.statics.getHierarchy = async function (officeId = null) {
    const query = officeId ? { parentOrganization: officeId } : { parentOrganization: null };
    const offices = await this.find(query).lean();

    // Recursively get children
    for (const office of offices) {
        office.children = await this.getHierarchy(office._id);
    }

    return offices;
};

module.exports = mongoose.model('Office', OfficeSchema);

const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema(
    {
        guai: {
            type: String,
            unique: true,
            uppercase: true,
            // Will be auto-generated in pre-save hook
        },
        name: {
            type: String,
            required: [true, 'Asset name is required'],
            trim: true,
            maxlength: [200, 'Name cannot exceed 200 characters'],
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            trim: true,
            // Examples: Laptop, Furniture, Vehicle, Equipment
        },
        purchaseCost: {
            type: Number,
            required: [true, 'Purchase cost is required'],
            min: [0, 'Cost cannot be negative'],
        },
        currency: {
            type: String,
            default: 'INR',
            uppercase: true,
        },
        officeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Office',
            required: [true, 'Office is required'],
        },
        status: {
            type: String,
            enum: {
                values: ['ACTIVE', 'MAINTENANCE', 'RETIRED'],
                message: '{VALUE} is not a valid status',
            },
            default: 'ACTIVE',
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Pre-save hook to generate GUAI (Mongoose 9 async pattern)
AssetSchema.pre('save', async function () {
    if (this.guai) return; // Already has GUAI

    const Office = mongoose.model('Office');
    const Asset = mongoose.model('Asset');

    const office = await Office.findById(this.officeId);
    if (!office) {
        throw new Error('Invalid office ID');
    }

    // Map category to 4-char code
    const categoryMap = {
        laptop: 'LAPT',
        computer: 'COMP',
        furniture: 'FURN',
        vehicle: 'VEHI',
        equipment: 'EQUP',
        phone: 'PHON',
        printer: 'PRNT',
        server: 'SERV',
        network: 'NETW',
        other: 'OTHR',
    };

    const categoryLower = this.category.toLowerCase();
    const typeCode = categoryMap[categoryLower] || 'OTHR';

    // Find max sequence for this office + type combination
    const lastAsset = await Asset.findOne({
        officeId: this.officeId,
        guai: { $regex: `^CORP-${office.country}-${office.code}-${typeCode}-` },
    })
        .sort({ guai: -1 })
        .select('guai');

    let sequence = 1;
    if (lastAsset && lastAsset.guai) {
        const parts = lastAsset.guai.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
            sequence = lastSeq + 1;
        }
    }

    // Format: CORP-IN-SUR-LAPT-001
    this.guai = `CORP-${office.country}-${office.code}-${typeCode}-${String(sequence).padStart(3, '0')}`;
});

module.exports = mongoose.model('Asset', AssetSchema);

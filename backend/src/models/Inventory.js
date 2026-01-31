const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: {
                values: ['PRODUCT', 'SPARE'],
                message: '{VALUE} is not a valid inventory type',
            },
            required: [true, 'Inventory type is required'],
        },
        name: {
            type: String,
            required: [true, 'Item name is required'],
            trim: true,
            maxlength: [200, 'Name cannot exceed 200 characters'],
        },
        sku: {
            type: String,
            unique: true,
            uppercase: true,
            trim: true,
            sparse: true, // Allows multiple null values
        },
        quantity: {
            type: Number,
            default: 0,
            min: [0, 'Quantity cannot be negative'],
        },
        unitCost: {
            type: Number,
            required: [true, 'Unit cost is required'],
            min: [0, 'Cost cannot be negative'],
        },
        officeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Office',
            required: [true, 'Office is required'],
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

// Generate SKU if not provided (Mongoose 9 async pattern)
InventorySchema.pre('save', async function () {
    if (this.sku) return;

    const Office = mongoose.model('Office');
    const Inventory = mongoose.model('Inventory');

    const office = await Office.findById(this.officeId);
    if (!office) {
        throw new Error('Invalid office ID');
    }

    const typePrefix = this.type === 'PRODUCT' ? 'PRD' : 'SPR';

    // Find max sequence
    const lastItem = await Inventory.findOne({
        officeId: this.officeId,
        sku: { $regex: `^${typePrefix}-${office.code}-` },
    })
        .sort({ sku: -1 })
        .select('sku');

    let sequence = 1;
    if (lastItem && lastItem.sku) {
        const parts = lastItem.sku.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
            sequence = lastSeq + 1;
        }
    }

    // Format: PRD-SUR-0001 or SPR-SUR-0001
    this.sku = `${typePrefix}-${office.code}-${String(sequence).padStart(4, '0')}`;
});

module.exports = mongoose.model('Inventory', InventorySchema);

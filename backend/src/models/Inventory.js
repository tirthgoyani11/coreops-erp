const mongoose = require('mongoose');

/**
 * Inventory Schema (Enhanced per README Section 3.2)
 * Dual-stream inventory: Products (revenue) and Spare Parts (cost-center)
 */
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
        // Common fields
        name: {
            type: String,
            required: [true, 'Item name is required'],
            trim: true,
            maxlength: [200, 'Name cannot exceed 200 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
        },
        sku: {
            type: String,
            unique: true,
            uppercase: true,
            trim: true,
            sparse: true,
        },
        partNumber: {
            type: String,
            trim: true,
            // For spare parts
        },
        category: {
            type: String,
            trim: true,
        },
        subcategory: {
            type: String,
            trim: true,
        },
        // Location
        officeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Office',
            required: [true, 'Office is required'],
        },
        warehouse: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Office',
        },
        storage: {
            location: { type: String },
            bin: { type: String },
            shelf: { type: String },
        },
        // Advanced Tracking
        trackingType: {
            type: String,
            enum: ['QUANTITY', 'SERIAL', 'BATCH'],
            default: 'QUANTITY',
        },
        // For Serialized Items (e.g., high-value spares)
        serials: [{
            serialNumber: { type: String, unique: true, sparse: true },
            status: { type: String, enum: ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'SOLD', 'DEFECTIVE'], default: 'AVAILABLE' },
            location: { type: String }, // Specific bin if different
            purchaseDate: { type: Date },
            notes: String
        }],
        // For Batch/Lot Items (e.g., chemicals, perishable)
        batches: [{
            batchNumber: { type: String },
            quantity: { type: Number },
            expiryDate: { type: Date },
            receivedDate: { type: Date, default: Date.now },
            supplier: String
        }],
        // Stock levels
        stock: {
            currentQuantity: { type: Number, default: 0, min: 0 },
            reorderPoint: { type: Number, default: 10 },
            reorderQuantity: { type: Number, default: 50 },
            maxQuantity: { type: Number },
            minimumQuantity: { type: Number, default: 5 },
            unit: { type: String, default: 'pieces' },
        },
        // Legacy quantity field
        quantity: {
            type: Number,
            default: 0,
            min: [0, 'Quantity cannot be negative'],
        },
        // Pricing (for products)
        pricing: {
            costPrice: { type: Number, min: 0 },
            sellingPrice: { type: Number, min: 0 },
            currency: { type: String, default: 'INR', uppercase: true },
            marginPercentage: { type: Number },
        },
        // Cost info (for spare parts)
        costInfo: {
            unitCost: { type: Number, min: 0 },
            currency: { type: String, default: 'INR', uppercase: true },
            lastPurchasePrice: { type: Number },
            lastPurchaseDate: { type: Date },
        },
        // Legacy unitCost field
        unitCost: {
            type: Number,
            min: [0, 'Cost cannot be negative'],
        },
        // Vendor
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
        },
        vendorPartNumber: { type: String },
        leadTimeDays: { type: Number, default: 7 },
        // Compatible assets (for spare parts)
        compatibleAssets: [
            {
                assetCategory: { type: String },
                models: [String],
            },
        ],
        // Reliability metrics for spare parts (MTBF tracking)
        reliabilityMetrics: {
            meanTimeBetweenFailures: { type: Number }, // hours
            totalInstallations: { type: Number, default: 0 },
            totalFailures: { type: Number, default: 0 },
            failureRate: { type: Number },
        },
        // Usage history (for spare parts, consumed in maintenance)
        usageHistory: [
            {
                maintenanceTicket: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Maintenance',
                },
                quantityUsed: { type: Number },
                date: { type: Date },
                asset: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Asset',
                },
                technician: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
            },
        ],
        // Stock movements (for audit trail)
        stockMovements: [
            {
                type: {
                    type: String,
                    enum: ['stock_in', 'stock_out', 'adjustment', 'transfer', 'purchase', 'consumption', 'return'],
                },
                quantity: { type: Number },
                date: { type: Date, default: Date.now },
                reference: { type: String }, // PO number, ticket number, etc.
                notes: { type: String },
                performedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
            },
        ],
        // Sales tracking (for products)
        sales: [
            {
                date: { type: Date },
                quantity: { type: Number },
                unitPrice: { type: Number },
                totalRevenue: { type: Number },
                customer: { type: String },
                invoiceNumber: { type: String },
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
        },
        discontinuedDate: { type: Date },
        obsoleteDate: { type: Date },
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
InventorySchema.index({ officeId: 1, isActive: 1 });
InventorySchema.index({ type: 1, category: 1 });
InventorySchema.index({ 'stock.currentQuantity': 1 });
InventorySchema.index({ vendor: 1 });
InventorySchema.index({ 'compatibleAssets.assetCategory': 1 });
InventorySchema.index({ partNumber: 1 }, { sparse: true });

// Virtual: Total value
InventorySchema.virtual('totalValue').get(function () {
    const qty = this.stock?.currentQuantity || this.quantity || 0;
    const cost = this.costInfo?.unitCost || this.pricing?.costPrice || this.unitCost || 0;
    return qty * cost;
});

// Virtual: Total sales revenue (for products)
InventorySchema.virtual('totalSalesRevenue').get(function () {
    if (!this.sales || this.sales.length === 0) return 0;
    return this.sales.reduce((sum, sale) => sum + (sale.totalRevenue || 0), 0);
});

// Virtual: Total units sold
InventorySchema.virtual('totalUnitsSold').get(function () {
    if (!this.sales || this.sales.length === 0) return 0;
    return this.sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
});

// Virtual: Total used (for spare parts)
InventorySchema.virtual('totalUsed').get(function () {
    if (!this.usageHistory || this.usageHistory.length === 0) return 0;
    return this.usageHistory.reduce((sum, usage) => sum + (usage.quantityUsed || 0), 0);
});

// Virtual: Needs reorder
InventorySchema.virtual('needsReorder').get(function () {
    const currentQty = this.stock?.currentQuantity || this.quantity || 0;
    const reorderPoint = this.stock?.reorderPoint || 10;
    return currentQty <= reorderPoint;
});

// Virtual: Is low stock
InventorySchema.virtual('isLowStock').get(function () {
    const currentQty = this.stock?.currentQuantity || this.quantity || 0;
    const minQty = this.stock?.minimumQuantity || 5;
    return currentQty <= minQty;
});

// Pre-save: Generate SKU and sync fields
InventorySchema.pre('save', async function () {
    // Sync stock.currentQuantity with legacy quantity
    if (this.quantity !== undefined && this.stock) {
        this.stock.currentQuantity = this.quantity;
    } else if (this.stock?.currentQuantity !== undefined) {
        this.quantity = this.stock.currentQuantity;
    }

    // Sync cost fields
    if (this.unitCost && this.type === 'SPARE') {
        if (!this.costInfo) this.costInfo = {};
        this.costInfo.unitCost = this.unitCost;
    }
    if (this.unitCost && this.type === 'PRODUCT') {
        if (!this.pricing) this.pricing = {};
        this.pricing.costPrice = this.unitCost;
    }

    // Sync quantity for Advanced Tracking types
    if (this.trackingType === 'SERIAL' && this.serials) {
        // Count available serials
        const availableCount = this.serials.filter(s => s.status === 'AVAILABLE').length;
        this.quantity = availableCount;
        if (this.stock) this.stock.currentQuantity = availableCount;
    } else if (this.trackingType === 'BATCH' && this.batches) {
        // Sum batch quantities
        const totalBatchQty = this.batches.reduce((sum, b) => sum + (b.quantity || 0), 0);
        this.quantity = totalBatchQty;
        if (this.stock) this.stock.currentQuantity = totalBatchQty;
    }

    // Generate SKU using atomic counter if not provided
    if (this.sku) return;

    const Counter = require('./Counter');
    const Office = mongoose.model('Office');

    const office = await Office.findById(this.officeId).lean();
    if (!office) {
        throw new Error('Invalid office ID');
    }

    this.sku = await Counter.generateSKU(this.type, office.code);
});

/**
 * Method: Record stock movement
 */
InventorySchema.methods.recordMovement = function (movementType, quantity, reference, notes, userId) {
    this.stockMovements.push({
        type: movementType,
        quantity,
        date: new Date(),
        reference,
        notes,
        performedBy: userId,
    });

    // Update quantity
    if (movementType === 'stock_in' || movementType === 'purchase' || movementType === 'return') {
        this.quantity = (this.quantity || 0) + quantity;
    } else if (movementType === 'stock_out' || movementType === 'consumption') {
        this.quantity = Math.max(0, (this.quantity || 0) - quantity);
    } else if (movementType === 'adjustment') {
        this.quantity = Math.max(0, quantity); // Set to exact amount
    }

    this.stock.currentQuantity = this.quantity;
    return this;
};

/**
 * Method: Record usage in maintenance
 */
InventorySchema.methods.recordUsage = function (ticketId, quantityUsed, assetId, technicianId) {
    this.usageHistory.push({
        maintenanceTicket: ticketId,
        quantityUsed,
        date: new Date(),
        asset: assetId,
        technician: technicianId,
    });

    // Update reliability metrics
    if (!this.reliabilityMetrics) {
        this.reliabilityMetrics = { totalInstallations: 0, totalFailures: 0 };
    }
    this.reliabilityMetrics.totalInstallations += quantityUsed;

    // Deduct from stock
    this.quantity = Math.max(0, (this.quantity || 0) - quantityUsed);
    if (this.stock) {
        this.stock.currentQuantity = this.quantity;
    }

    return this;
};

module.exports = mongoose.model('Inventory', InventorySchema);

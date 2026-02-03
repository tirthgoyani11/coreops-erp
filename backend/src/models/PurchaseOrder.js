const mongoose = require('mongoose');

/**
 * Purchase Order Schema
 * Per README Section 3.2 - Purchase Orders Collection
 * Procurement requests, approvals, and order tracking
 */
const PurchaseOrderSchema = new mongoose.Schema(
    {
        // Auto-generated PO number: PO-YYYYMMDD-XXXX
        poNumber: {
            type: String,
            unique: true,
            uppercase: true,
        },
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: [true, 'Vendor is required'],
        },
        officeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Office',
            required: [true, 'Office is required'],
        },
        // Order items
        items: [
            {
                itemType: {
                    type: String,
                    enum: ['asset', 'spare_part', 'product', 'service'],
                    required: true,
                },
                name: { type: String, required: true },
                description: { type: String },
                quantity: { type: Number, required: true, min: 1 },
                unitPrice: { type: Number, required: true, min: 0 },
                totalPrice: { type: Number }, // quantity * unitPrice
                // Link to existing inventory item if replenishing
                inventoryId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Inventory',
                },
            },
        ],
        // Totals
        subtotal: { type: Number, default: 0 },
        taxAmount: { type: Number, default: 0 },
        taxRate: { type: Number, default: 0 }, // percentage
        discountAmount: { type: Number, default: 0 },
        shippingCost: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
        currency: {
            type: String,
            default: 'INR',
            uppercase: true,
        },
        // Dates
        orderDate: { type: Date, default: Date.now },
        expectedDeliveryDate: { type: Date },
        actualDeliveryDate: { type: Date },
        // Approval workflow
        status: {
            type: String,
            enum: [
                'draft',
                'pending_approval',
                'approved',
                'rejected',
                'ordered',
                'partially_received',
                'received',
                'cancelled',
            ],
            default: 'draft',
        },
        approvalStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        approvalDate: { type: Date },
        approvalNotes: { type: String },
        // Delivery tracking
        deliveryAddress: {
            street: { type: String },
            city: { type: String },
            state: { type: String },
            country: { type: String },
            postalCode: { type: String },
        },
        trackingNumber: { type: String },
        receivedItems: [
            {
                itemIndex: { type: Number },
                quantityReceived: { type: Number },
                receivedDate: { type: Date },
                receivedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                notes: { type: String },
            },
        ],
        // Payment
        paymentStatus: {
            type: String,
            enum: ['unpaid', 'partial', 'paid'],
            default: 'unpaid',
        },
        paymentTerms: { type: String },
        invoiceNumber: { type: String },
        // Documents
        attachments: [String],
        notes: {
            type: String,
            maxlength: 2000,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes (Note: unique fields already have indexes, don't duplicate)
PurchaseOrderSchema.index({ vendor: 1, status: 1 });
PurchaseOrderSchema.index({ officeId: 1, status: 1 });
PurchaseOrderSchema.index({ requestedBy: 1 });
PurchaseOrderSchema.index({ orderDate: -1 });

// Pre-save: Generate PO number and calculate totals
PurchaseOrderSchema.pre('save', async function () {
    // Generate PO number using atomic counter
    if (!this.poNumber) {
        const Counter = require('./Counter');
        this.poNumber = await Counter.generatePONumber();
    }

    // Calculate item totals and subtotal
    if (this.items && this.items.length > 0) {
        let subtotal = 0;
        this.items.forEach((item) => {
            item.totalPrice = item.quantity * item.unitPrice;
            subtotal += item.totalPrice;
        });
        this.subtotal = subtotal;

        // Calculate total
        const taxAmount = subtotal * (this.taxRate / 100);
        this.taxAmount = Math.round(taxAmount * 100) / 100;
        this.totalAmount =
            this.subtotal + this.taxAmount - this.discountAmount + this.shippingCost;
    }
});

// Virtual: Is fully received
PurchaseOrderSchema.virtual('isFullyReceived').get(function () {
    if (!this.items || this.items.length === 0) return false;
    if (!this.receivedItems || this.receivedItems.length === 0) return false;

    return this.items.every((item, index) => {
        const received = this.receivedItems
            .filter((r) => r.itemIndex === index)
            .reduce((sum, r) => sum + r.quantityReceived, 0);
        return received >= item.quantity;
    });
});

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);

const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
    poNumber: {
        type: String,
        unique: true
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    officeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Office',
        required: true
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
        default: 'DRAFT'
    },

    // Items
    items: [{
        inventoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Inventory'
        },
        name: String, // Snapshot in case item is deleted or custom item
        description: String,
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        totalPrice: Number,
        receivedQuantity: { type: Number, default: 0 }
    }],

    // Financials
    subtotal: Number,
    taxAmount: Number,
    totalAmount: Number,
    currency: { type: String, default: 'INR' },

    // Dates
    orderDate: Date,
    expectedDeliveryDate: Date,
    deliveryDate: Date, // Actual

    // Approval
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvalDate: Date,

    // 3-Way Reference
    grnReference: String, // Goods Receipt Note
    invoiceReference: String,

    notes: String,

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-generate PO Number
purchaseOrderSchema.pre('save', async function (next) {
    if (!this.poNumber) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await this.constructor.countDocuments();
        this.poNumber = `PO-${dateStr}-${String(count + 1).padStart(4, '0')}`;
    }

    // Recalculate totals
    if (this.items && this.items.length > 0) {
        this.subtotal = this.items.reduce((acc, item) => {
            item.totalPrice = item.quantity * item.unitPrice;
            return acc + item.totalPrice;
        }, 0);
        this.totalAmount = this.subtotal + (this.taxAmount || 0); // Logic can be complex for tax per item
    }

    next();
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);

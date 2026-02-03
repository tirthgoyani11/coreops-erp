const mongoose = require('mongoose');

/**
 * Financial Transaction Schema (Enhanced per README Section 3.2)
 * Track all financial transactions with multi-currency support and audit trails
 * Replaces basic FinanceLog with comprehensive transaction tracking
 */
const FinanceLogSchema = new mongoose.Schema(
    {
        // Auto-generated transaction number
        transactionNumber: {
            type: String,
            unique: true,
            uppercase: true,
        },
        type: {
            type: String,
            enum: ['purchase', 'sale', 'maintenance', 'salary', 'utility', 'refund', 'adjustment', 'other'],
            required: [true, 'Transaction type is required'],
        },
        category: {
            type: String,
            trim: true,
            // For detailed reporting: e.g., 'office_supplies', 'repairs', 'equipment'
        },
        // Amount in original currency
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
        },
        currency: {
            type: String,
            required: [true, 'Currency is required'],
            uppercase: true,
            default: 'INR',
        },
        // Normalized to base currency
        baseCurrencyAmount: {
            type: Number,
        },
        baseCurrency: {
            type: String,
            default: 'INR',
            uppercase: true,
        },
        exchangeRate: {
            type: Number,
            default: 1,
        },
        conversionDate: {
            type: Date,
        },
        // Legacy field for backwards compatibility
        normalizedAmount: {
            type: Number,
        },
        // Organization
        officeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Office',
            required: [true, 'Office is required'],
        },
        date: {
            type: Date,
            default: Date.now,
            required: true,
        },
        // Related documents
        relatedDocuments: {
            maintenanceTicket: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Maintenance',
            },
            asset: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Asset',
            },
            vendor: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Vendor',
            },
            purchaseOrder: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'PurchaseOrder',
            },
            invoiceNumber: { type: String },
            receiptNumber: { type: String },
        },
        // Legacy source fields
        source: {
            type: String,
            enum: ['MAINTENANCE', 'PURCHASE', 'SALE', 'OTHER'],
        },
        sourceId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        // Payment info
        paymentInfo: {
            method: {
                type: String,
                enum: ['cash', 'bank_transfer', 'credit_card', 'check', 'upi'],
            },
            reference: { type: String },
            bankAccount: { type: String },
            payee: { type: String },
            paidBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'cancelled', 'refunded'],
            default: 'completed',
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 2000,
        },
        attachments: [String], // Invoice/receipt paths
        // Accounting info
        accountingInfo: {
            fiscalYear: { type: String },
            fiscalQuarter: { type: String },
            glAccount: { type: String }, // General Ledger account code
            costCenter: { type: String },
            taxAmount: { type: Number, default: 0 },
            taxRate: { type: Number, default: 0 },
        },
        // Approval
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        approvalDate: { type: Date },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        // Legacy timestamp field
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes (Note: unique fields already have indexes, don't duplicate)
FinanceLogSchema.index({ officeId: 1, date: -1 });
FinanceLogSchema.index({ type: 1, category: 1 });
FinanceLogSchema.index({ date: -1 });
FinanceLogSchema.index({ status: 1 });
FinanceLogSchema.index({ 'relatedDocuments.vendor': 1 });
FinanceLogSchema.index({ 'accountingInfo.fiscalYear': 1, 'accountingInfo.fiscalQuarter': 1 });

// Pre-save: Generate transaction number and normalize amounts
FinanceLogSchema.pre('save', async function () {
    // Generate transaction number using atomic counter
    if (!this.transactionNumber) {
        const Counter = require('./Counter');
        this.transactionNumber = await Counter.generateTransactionNumber();
    }

    // Sync normalized amount with base currency amount
    if (this.baseCurrencyAmount && !this.normalizedAmount) {
        this.normalizedAmount = this.baseCurrencyAmount;
    } else if (this.normalizedAmount && !this.baseCurrencyAmount) {
        this.baseCurrencyAmount = this.normalizedAmount;
    }

    // Set fiscal info based on date
    if (this.date && !this.accountingInfo?.fiscalYear) {
        const date = new Date(this.date);
        const month = date.getMonth();
        const year = date.getFullYear();

        // Indian fiscal year (April - March)
        const fiscalYear = month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
        const quarter = month >= 3 && month <= 5 ? 'Q1' :
            month >= 6 && month <= 8 ? 'Q2' :
                month >= 9 && month <= 11 ? 'Q3' : 'Q4';

        if (!this.accountingInfo) this.accountingInfo = {};
        this.accountingInfo.fiscalYear = fiscalYear;
        this.accountingInfo.fiscalQuarter = quarter;
    }
});

// Virtual: Is in base currency
FinanceLogSchema.virtual('isInBaseCurrency').get(function () {
    return this.currency === this.baseCurrency;
});

// Virtual: Month from date
FinanceLogSchema.virtual('month').get(function () {
    return this.date ? new Date(this.date).getMonth() + 1 : null;
});

// Virtual: Year from date
FinanceLogSchema.virtual('year').get(function () {
    return this.date ? new Date(this.date).getFullYear() : null;
});

// Static: Get summary by category for a period
FinanceLogSchema.statics.getSummaryByCategory = async function (officeId, startDate, endDate) {
    return await this.aggregate([
        {
            $match: {
                officeId: new mongoose.Types.ObjectId(officeId),
                date: { $gte: startDate, $lte: endDate },
                status: 'completed',
            },
        },
        {
            $group: {
                _id: '$category',
                totalAmount: { $sum: '$baseCurrencyAmount' },
                count: { $sum: 1 },
            },
        },
        { $sort: { totalAmount: -1 } },
    ]);
};

module.exports = mongoose.model('FinanceLog', FinanceLogSchema);

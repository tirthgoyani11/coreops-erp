const mongoose = require('mongoose');

/**
 * Counter Schema - Atomic Sequence Generation
 * 
 * This model provides thread-safe, atomic sequence generation for:
 * - GUAI (Asset IDs)
 * - SKU (Inventory IDs)
 * - Ticket Numbers
 * - PO Numbers
 * - Vendor Codes
 * - Transaction Numbers
 * 
 * PRODUCTION NOTES:
 * - Uses findOneAndUpdate with upsert for atomic increment
 * - Prevents race conditions in concurrent operations
 * - Supports prefixed sequences (e.g., per-office, per-day)
 */
const CounterSchema = new mongoose.Schema(
    {
        // Unique identifier for this counter
        // Format: MODEL-PREFIX (e.g., "ASSET-SUR-LAPT", "MAINTENANCE-20260202")
        _id: {
            type: String,
            required: true,
        },
        // Current sequence value
        sequence: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Metadata for debugging
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
        model: {
            type: String, // Which model uses this counter
            required: true,
        },
    },
    {
        timestamps: false,
        versionKey: false,
    }
);

/**
 * Static Method: Get next sequence number atomically
 * 
 * @param {String} counterName - Unique identifier for the counter
 * @param {String} model - Name of the model using this counter
 * @returns {Number} - Next sequence number
 * 
 * @example
 * const seq = await Counter.getNextSequence('ASSET-SUR-LAPT', 'Asset');
 * // Returns: 1, 2, 3, etc.
 */
CounterSchema.statics.getNextSequence = async function (counterName, model) {
    const result = await this.findOneAndUpdate(
        { _id: counterName },
        {
            $inc: { sequence: 1 },
            $set: { lastUpdated: new Date(), model },
        },
        {
            new: true, // Return updated document
            upsert: true, // Create if doesn't exist
            setDefaultsOnInsert: true,
        }
    );

    return result.sequence;
};

/**
 * Static Method: Get current sequence without incrementing
 * 
 * @param {String} counterName - Unique identifier for the counter
 * @returns {Number} - Current sequence number (0 if not exists)
 */
CounterSchema.statics.getCurrentSequence = async function (counterName) {
    const counter = await this.findById(counterName);
    return counter ? counter.sequence : 0;
};

/**
 * Static Method: Reset a counter (use with caution!)
 * 
 * @param {String} counterName - Unique identifier for the counter
 * @param {Number} value - Value to reset to (default: 0)
 */
CounterSchema.statics.resetSequence = async function (counterName, value = 0) {
    await this.findOneAndUpdate(
        { _id: counterName },
        { sequence: value, lastUpdated: new Date() },
        { upsert: true }
    );
};

/**
 * Static Method: Generate formatted sequence string
 * 
 * @param {String} counterName - Counter identifier
 * @param {String} model - Model name
 * @param {String} prefix - Prefix for the generated ID
 * @param {Number} padding - Number of digits to pad (default: 4)
 * @returns {String} - Formatted sequence string
 * 
 * @example
 * const sku = await Counter.generateId('INV-SUR-PRD', 'Inventory', 'PRD-SUR-', 4);
 * // Returns: "PRD-SUR-0001"
 */
CounterSchema.statics.generateId = async function (counterName, model, prefix, padding = 4) {
    const sequence = await this.getNextSequence(counterName, model);
    return `${prefix}${String(sequence).padStart(padding, '0')}`;
};

/**
 * Helper Functions for specific model ID generation
 */

// Asset GUAI: CORP-IN-SUR-LAPT-001
CounterSchema.statics.generateGUAI = async function (countryCode, officeCode, typeCode) {
    const counterName = `ASSET-${officeCode}-${typeCode}`;
    return this.generateId(counterName, 'Asset', `CORP-${countryCode}-${officeCode}-${typeCode}-`, 3);
};

// Inventory SKU: PRD-SUR-0001 or SPR-SUR-0001
CounterSchema.statics.generateSKU = async function (type, officeCode) {
    const prefix = type === 'PRODUCT' ? 'PRD' : 'SPR';
    const counterName = `INV-${officeCode}-${prefix}`;
    return this.generateId(counterName, 'Inventory', `${prefix}-${officeCode}-`, 4);
};

// Maintenance Ticket: MT-YYYYMMDD-0001
CounterSchema.statics.generateTicketNumber = async function () {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const counterName = `MAINT-${dateStr}`;
    return this.generateId(counterName, 'Maintenance', `MT-${dateStr}-`, 4);
};

// Purchase Order: PO-YYYYMMDD-0001
CounterSchema.statics.generatePONumber = async function () {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const counterName = `PO-${dateStr}`;
    return this.generateId(counterName, 'PurchaseOrder', `PO-${dateStr}-`, 4);
};

// Vendor Code: VEN-0001
CounterSchema.statics.generateVendorCode = async function () {
    return this.generateId('VENDOR', 'Vendor', 'VEN-', 4);
};

// Transaction Number: TXN-YYYYMMDD-0001
CounterSchema.statics.generateTransactionNumber = async function () {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const counterName = `TXN-${dateStr}`;
    return this.generateId(counterName, 'FinanceLog', `TXN-${dateStr}-`, 4);
};

module.exports = mongoose.model('Counter', CounterSchema);

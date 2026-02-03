const mongoose = require('mongoose');

/**
 * Currency Rate Schema
 * Stores historical exchange rates for accurate multi-currency conversion
 * Per README Section 3.2 - Currency Rates Collection Schema
 */
const CurrencyRateSchema = new mongoose.Schema(
    {
        baseCurrency: {
            type: String,
            required: [true, 'Base currency is required'],
            uppercase: true,
            trim: true,
            minlength: [3, 'Currency code must be 3 characters (ISO 4217)'],
            maxlength: [3, 'Currency code must be 3 characters (ISO 4217)'],
        },
        targetCurrency: {
            type: String,
            required: [true, 'Target currency is required'],
            uppercase: true,
            trim: true,
            minlength: [3, 'Currency code must be 3 characters (ISO 4217)'],
            maxlength: [3, 'Currency code must be 3 characters (ISO 4217)'],
        },
        rate: {
            type: Number,
            required: [true, 'Exchange rate is required'],
            min: [0.0001, 'Rate must be positive'],
        },
        date: {
            type: Date,
            required: [true, 'Rate date is required'],
            default: Date.now,
        },
        source: {
            type: String,
            enum: ['manual', 'exchangerate-api', 'openexchange', 'system'],
            default: 'manual',
        },
    },
    {
        timestamps: true,
    }
);

// Compound unique index: Only one rate per currency pair per day
CurrencyRateSchema.index(
    { baseCurrency: 1, targetCurrency: 1, date: -1 },
    { unique: true }
);

// Index for efficient lookups
CurrencyRateSchema.index({ baseCurrency: 1, targetCurrency: 1 });
CurrencyRateSchema.index({ date: -1 });

/**
 * Static method: Get latest rate for a currency pair
 */
CurrencyRateSchema.statics.getLatestRate = async function (baseCurrency, targetCurrency) {
    // If same currency, rate is 1
    if (baseCurrency.toUpperCase() === targetCurrency.toUpperCase()) {
        return 1;
    }

    const rate = await this.findOne({
        baseCurrency: baseCurrency.toUpperCase(),
        targetCurrency: targetCurrency.toUpperCase(),
    })
        .sort({ date: -1 })
        .limit(1);

    return rate ? rate.rate : null;
};

/**
 * Static method: Convert amount between currencies
 * @param {Number} amount - Amount to convert
 * @param {String} fromCurrency - Source currency code
 * @param {String} toCurrency - Target currency code
 * @param {Date} date - Optional date for historical rate (defaults to latest)
 * @returns {Object} { convertedAmount, rate, date }
 */
CurrencyRateSchema.statics.convert = async function (amount, fromCurrency, toCurrency, date = null) {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    // Same currency
    if (from === to) {
        return { convertedAmount: amount, rate: 1, date: new Date() };
    }

    let query = { baseCurrency: from, targetCurrency: to };
    if (date) {
        query.date = { $lte: date };
    }

    const rateDoc = await this.findOne(query)
        .sort({ date: -1 })
        .limit(1);

    if (!rateDoc) {
        // Try inverse rate
        query = { baseCurrency: to, targetCurrency: from };
        if (date) {
            query.date = { $lte: date };
        }

        const inverseRateDoc = await this.findOne(query)
            .sort({ date: -1 })
            .limit(1);

        if (!inverseRateDoc) {
            throw new Error(`No exchange rate found for ${from} to ${to}`);
        }

        const inverseRate = 1 / inverseRateDoc.rate;
        return {
            convertedAmount: Math.round(amount * inverseRate * 100) / 100,
            rate: Math.round(inverseRate * 10000) / 10000,
            date: inverseRateDoc.date,
        };
    }

    return {
        convertedAmount: Math.round(amount * rateDoc.rate * 100) / 100,
        rate: rateDoc.rate,
        date: rateDoc.date,
    };
};

/**
 * Static method: Seed default rates (useful for initial setup)
 */
CurrencyRateSchema.statics.seedDefaultRates = async function () {
    const defaultRates = [
        { baseCurrency: 'USD', targetCurrency: 'INR', rate: 83.0 },
        { baseCurrency: 'EUR', targetCurrency: 'INR', rate: 90.0 },
        { baseCurrency: 'GBP', targetCurrency: 'INR', rate: 105.0 },
        { baseCurrency: 'USD', targetCurrency: 'EUR', rate: 0.92 },
        { baseCurrency: 'USD', targetCurrency: 'GBP', rate: 0.79 },
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const rate of defaultRates) {
        await this.findOneAndUpdate(
            {
                baseCurrency: rate.baseCurrency,
                targetCurrency: rate.targetCurrency,
                date: today,
            },
            { ...rate, date: today, source: 'system' },
            { upsert: true, new: true }
        );
    }

    return defaultRates.length;
};

module.exports = mongoose.model('CurrencyRate', CurrencyRateSchema);

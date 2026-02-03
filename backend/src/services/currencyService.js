const CurrencyRate = require('../models/CurrencyRate');

/**
 * Currency Service - Live Exchange Rate Integration
 * 
 * Uses Frankfurter API (https://frankfurter.app) - FREE, no API key required
 * Data sourced from European Central Bank (ECB)
 * 
 * Supported currencies: USD, EUR, GBP, INR, JPY, AUD, CAD, CHF, CNY, and 30+ more
 */

// Configuration
const CONFIG = {
    API_URL: 'https://api.frankfurter.app',
    BASE_CURRENCY: 'USD', // Default base for all conversions
    SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SGD', 'AED'],
    CACHE_DURATION_MS: 4 * 60 * 60 * 1000, // 4 hours
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
};

// In-memory cache to reduce API calls
let rateCache = {
    rates: null,
    lastUpdated: null,
    base: null,
};

/**
 * Fetch latest rates from Frankfurter API
 * @param {String} baseCurrency - Base currency code (default: USD)
 * @returns {Object} - { base, date, rates: { EUR: 0.92, INR: 83.0, ... } }
 */
async function fetchLatestRates(baseCurrency = CONFIG.BASE_CURRENCY) {
    const url = `${CONFIG.API_URL}/latest?from=${baseCurrency}&to=${CONFIG.SUPPORTED_CURRENCIES.filter(c => c !== baseCurrency).join(',')}`;

    let lastError;
    for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Update cache
            rateCache = {
                rates: data.rates,
                lastUpdated: new Date(),
                base: data.base,
                date: data.date,
            };

            return {
                success: true,
                base: data.base,
                date: data.date,
                rates: data.rates,
                source: 'frankfurter-api',
            };
        } catch (error) {
            lastError = error;
            if (attempt < CONFIG.RETRY_ATTEMPTS) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY_MS * attempt));
            }
        }
    }

    throw new Error(`Failed to fetch rates after ${CONFIG.RETRY_ATTEMPTS} attempts: ${lastError.message}`);
}

/**
 * Fetch historical rates for a specific date
 * @param {String} date - Date in YYYY-MM-DD format
 * @param {String} baseCurrency - Base currency code
 * @returns {Object} - Historical rates
 */
async function fetchHistoricalRates(date, baseCurrency = CONFIG.BASE_CURRENCY) {
    const url = `${CONFIG.API_URL}/${date}?from=${baseCurrency}&to=${CONFIG.SUPPORTED_CURRENCIES.filter(c => c !== baseCurrency).join(',')}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return {
        success: true,
        base: data.base,
        date: data.date,
        rates: data.rates,
        source: 'frankfurter-api',
    };
}

/**
 * Update rates in database from API
 * Stores rates with USD as base for consistent conversion
 */
async function updateRatesInDatabase() {
    try {
        const result = await fetchLatestRates('USD');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const updates = [];

        // Store USD to each currency
        for (const [currency, rate] of Object.entries(result.rates)) {
            updates.push(
                CurrencyRate.findOneAndUpdate(
                    {
                        baseCurrency: 'USD',
                        targetCurrency: currency,
                        date: today,
                    },
                    {
                        baseCurrency: 'USD',
                        targetCurrency: currency,
                        rate: rate,
                        date: today,
                        source: 'frankfurter-api',
                    },
                    { upsert: true, new: true }
                )
            );
        }

        await Promise.all(updates);

        return {
            success: true,
            message: `Updated ${updates.length} currency rates`,
            date: result.date,
            rates: result.rates,
        };
    } catch (error) {
        console.error('Error updating currency rates:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Get live rate with caching
 * @param {String} fromCurrency 
 * @param {String} toCurrency 
 * @returns {Number} - Exchange rate
 */
async function getLiveRate(fromCurrency, toCurrency) {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    // Same currency
    if (from === to) return 1;

    // Check cache validity
    const cacheAge = rateCache.lastUpdated ? Date.now() - rateCache.lastUpdated.getTime() : Infinity;

    if (cacheAge > CONFIG.CACHE_DURATION_MS || !rateCache.rates) {
        await fetchLatestRates('USD');
    }

    // Convert via USD as intermediary
    let rate;

    if (from === 'USD') {
        rate = rateCache.rates[to];
    } else if (to === 'USD') {
        rate = 1 / rateCache.rates[from];
    } else {
        // Cross rate: FROM -> USD -> TO
        const fromToUsd = 1 / rateCache.rates[from];
        const usdToTo = rateCache.rates[to];
        rate = fromToUsd * usdToTo;
    }

    if (!rate) {
        throw new Error(`No rate available for ${from} to ${to}`);
    }

    return Math.round(rate * 10000) / 10000;
}

/**
 * Convert amount between currencies using live rates
 * @param {Number} amount 
 * @param {String} fromCurrency 
 * @param {String} toCurrency 
 * @returns {Object} - { convertedAmount, rate, source }
 */
async function convertLive(amount, fromCurrency, toCurrency) {
    const rate = await getLiveRate(fromCurrency, toCurrency);

    return {
        originalAmount: amount,
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        convertedAmount: Math.round(amount * rate * 100) / 100,
        rate,
        source: 'live',
        cachedAt: rateCache.lastUpdated,
    };
}

/**
 * Get all current rates from cache or fetch fresh
 */
async function getAllRates(baseCurrency = 'USD') {
    const cacheAge = rateCache.lastUpdated ? Date.now() - rateCache.lastUpdated.getTime() : Infinity;

    if (cacheAge > CONFIG.CACHE_DURATION_MS || !rateCache.rates || rateCache.base !== baseCurrency) {
        return await fetchLatestRates(baseCurrency);
    }

    return {
        success: true,
        base: rateCache.base,
        date: rateCache.date,
        rates: rateCache.rates,
        source: 'cache',
        cachedAt: rateCache.lastUpdated,
    };
}

/**
 * Schedule automatic rate updates (called during server startup)
 * Updates rates every 4 hours
 */
function scheduleRateUpdates() {
    // Initial update
    updateRatesInDatabase()
        .then(result => {
            if (result.success) {
                console.log(`✅ Currency rates initialized: ${Object.keys(result.rates || {}).length} rates`);
            } else {
                console.error('❌ Failed to initialize currency rates:', result.error);
            }
        })
        .catch(console.error);

    // Schedule updates every 4 hours
    setInterval(() => {
        updateRatesInDatabase()
            .then(result => {
                if (result.success) {
                    console.log(`🔄 Currency rates updated: ${result.message}`);
                }
            })
            .catch(console.error);
    }, CONFIG.CACHE_DURATION_MS);
}

module.exports = {
    fetchLatestRates,
    fetchHistoricalRates,
    updateRatesInDatabase,
    getLiveRate,
    convertLive,
    getAllRates,
    scheduleRateUpdates,
    CONFIG,
};

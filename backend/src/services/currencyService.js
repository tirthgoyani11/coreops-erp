const prisma = require('../config/prisma');

/**
 * Currency Service - Live Exchange Rate Integration (Prisma)
 * 
 * Uses Frankfurter API (https://frankfurter.app) - FREE, no API key required
 * Data sourced from European Central Bank (ECB)
 */

const CONFIG = {
    API_URL: 'https://api.frankfurter.app',
    BASE_CURRENCY: 'USD',
    SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SGD', 'AED'],
    CACHE_DURATION_MS: 4 * 60 * 60 * 1000, // 4 hours
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
};

// In-memory cache
let rateCache = {
    rates: null,
    lastUpdated: null,
    base: null,
};

async function fetchLatestRates(baseCurrency = CONFIG.BASE_CURRENCY) {
    const url = `${CONFIG.API_URL}/latest?from=${baseCurrency}&to=${CONFIG.SUPPORTED_CURRENCIES.filter(c => c !== baseCurrency).join(',')}`;

    let lastError;
    for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API returned ${response.status}: ${response.statusText}`);
            const data = await response.json();

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

async function fetchHistoricalRates(date, baseCurrency = CONFIG.BASE_CURRENCY) {
    const url = `${CONFIG.API_URL}/${date}?from=${baseCurrency}&to=${CONFIG.SUPPORTED_CURRENCIES.filter(c => c !== baseCurrency).join(',')}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API returned ${response.status}: ${response.statusText}`);
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
 * Update rates in database using Prisma upsert
 */
async function updateRatesInDatabase() {
    try {
        const result = await fetchLatestRates('USD');

        const updates = [];
        for (const [currency, rate] of Object.entries(result.rates)) {
            updates.push(
                prisma.currencyRate.upsert({
                    where: {
                        baseCurrency_targetCurrency: {
                            baseCurrency: 'USD',
                            targetCurrency: currency,
                        },
                    },
                    update: {
                        rate,
                        source: 'frankfurter-api',
                        fetchedAt: new Date(),
                    },
                    create: {
                        baseCurrency: 'USD',
                        targetCurrency: currency,
                        rate,
                        source: 'frankfurter-api',
                    },
                })
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
        console.error('Error updating currency rates:', error.message);
        return { success: false, error: error.message };
    }
}

async function getLiveRate(fromCurrency, toCurrency) {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    if (from === to) return 1;

    const cacheAge = rateCache.lastUpdated ? Date.now() - rateCache.lastUpdated.getTime() : Infinity;
    if (cacheAge > CONFIG.CACHE_DURATION_MS || !rateCache.rates) {
        await fetchLatestRates('USD');
    }

    let rate;
    if (from === 'USD') {
        rate = rateCache.rates[to];
    } else if (to === 'USD') {
        rate = 1 / rateCache.rates[from];
    } else {
        rate = (1 / rateCache.rates[from]) * rateCache.rates[to];
    }

    if (!rate) throw new Error(`No rate available for ${from} to ${to}`);
    return Math.round(rate * 10000) / 10000;
}

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

function scheduleRateUpdates() {
    updateRatesInDatabase()
        .then(result => {
            if (result.success) {
                console.log(`✅ Currency rates initialized: ${Object.keys(result.rates || {}).length} rates`);
            } else {
                console.error('❌ Failed to initialize currency rates:', result.error);
            }
        })
        .catch(err => console.error('❌ Currency rate init error:', err.message));

    setInterval(() => {
        updateRatesInDatabase()
            .then(result => {
                if (result.success) console.log(`🔄 Currency rates updated: ${result.message}`);
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

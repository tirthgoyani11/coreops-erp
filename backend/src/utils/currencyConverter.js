const axios = require('axios');
const logger = require('./logger');

// In-memory cache to prevent spamming the free API during presentations
let ratesCache = null;
let lastFetchTime = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetches the latest exchange rates utilizing a free, no-auth open API.
 * The base currency for this API is USD.
 */
const fetchRates = async () => {
    try {
        const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
        ratesCache = response.data.rates;
        lastFetchTime = Date.now();
        logger.info('Successfully fetched live exchange rates for Multi-Currency support.');
        return ratesCache;
    } catch (error) {
        logger.error('Failed to fetch live exchange rates:', error.message);
        // Fallback static rates if the API goes down during the presentation
        ratesCache = {
            USD: 1,
            EUR: 0.92,
            GBP: 0.79,
            INR: 83.5,
            CAD: 1.36,
            AUD: 1.52,
            JPY: 151.2
        };
        lastFetchTime = Date.now();
        return ratesCache;
    }
};

/**
 * Converts an amount from one currency to another using real-time rates.
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - Original currency code (e.g. 'USD')
 * @param {string} toCurrency - Target currency code (e.g. 'INR')
 * @returns {Promise<number>} - The converted amount
 */
const convertCurrency = async (amount, fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return amount;

    // Check if cache needs refresh
    if (!ratesCache || !lastFetchTime || (Date.now() - lastFetchTime) > CACHE_DURATION_MS) {
        await fetchRates();
    }

    const rates = ratesCache;

    // The API uses USD as the base rate (USD = 1)
    // Formula: Amount in USD = amount / rate[fromCurrency]
    // Final Amount = Amount in USD * rate[toCurrency]

    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;

    const amountInUSD = amount / fromRate;
    const finalAmount = amountInUSD * toRate;

    return Number(finalAmount.toFixed(2));
};

module.exports = {
    convertCurrency,
    fetchRates
};

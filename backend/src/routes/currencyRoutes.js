const express = require('express');
const router = express.Router();
const currencyService = require('../services/currencyService');
const CurrencyRate = require('../models/CurrencyRate');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');

/**
 * Currency Rate Routes
 * 
 * GET /api/currency/rates - Get all current rates
 * GET /api/currency/convert - Convert amount between currencies
 * GET /api/currency/historical/:date - Get historical rates
 * POST /api/currency/refresh - Force refresh rates from API (admin only)
 * POST /api/currency/manual - Add manual rate (admin only)
 */

// Get all current live rates
router.get('/rates', async (req, res) => {
    try {
        const { base = 'USD' } = req.query;
        const result = await currencyService.getAllRates(base.toUpperCase());

        res.json({
            success: true,
            data: {
                base: result.base,
                date: result.date,
                rates: result.rates,
                source: result.source,
                lastUpdated: result.cachedAt || new Date(),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch currency rates',
            error: error.message,
        });
    }
});

// Convert amount between currencies
router.get('/convert', async (req, res) => {
    try {
        const { amount, from, to, source = 'live' } = req.query;

        if (!amount || !from || !to) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: amount, from, to',
            });
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a positive number',
            });
        }

        let result;
        if (source === 'database') {
            // Use stored rates from database
            result = await CurrencyRate.convert(numAmount, from, to);
            result.source = 'database';
        } else {
            // Use live rates from API
            result = await currencyService.convertLive(numAmount, from, to);
        }

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Currency conversion failed',
            error: error.message,
        });
    }
});

// Get single rate between two currencies
router.get('/rate', async (req, res) => {
    try {
        const { from, to, source = 'live' } = req.query;

        if (!from || !to) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: from, to',
            });
        }

        let rate;
        if (source === 'database') {
            rate = await CurrencyRate.getLatestRate(from, to);
        } else {
            rate = await currencyService.getLiveRate(from, to);
        }

        if (!rate) {
            return res.status(404).json({
                success: false,
                message: `No rate found for ${from} to ${to}`,
            });
        }

        res.json({
            success: true,
            data: {
                from: from.toUpperCase(),
                to: to.toUpperCase(),
                rate,
                source,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get exchange rate',
            error: error.message,
        });
    }
});

// Get historical rates for a specific date
router.get('/historical/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const { base = 'USD' } = req.query;

        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD',
            });
        }

        const result = await currencyService.fetchHistoricalRates(date, base.toUpperCase());

        res.json({
            success: true,
            data: {
                base: result.base,
                date: result.date,
                rates: result.rates,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch historical rates',
            error: error.message,
        });
    }
});

// Force refresh rates from API (admin only)
router.post('/refresh', verifyToken, authorize('SUPER_ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const result = await currencyService.updateRatesInDatabase();

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: {
                    date: result.date,
                    ratesUpdated: Object.keys(result.rates || {}).length,
                },
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to refresh rates',
                error: result.error,
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to refresh currency rates',
            error: error.message,
        });
    }
});

// Add manual rate (admin only)
router.post('/manual', verifyToken, authorize('SUPER_ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { baseCurrency, targetCurrency, rate, date } = req.body;

        if (!baseCurrency || !targetCurrency || !rate) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: baseCurrency, targetCurrency, rate',
            });
        }

        const rateDate = date ? new Date(date) : new Date();
        rateDate.setHours(0, 0, 0, 0);

        const newRate = await CurrencyRate.findOneAndUpdate(
            {
                baseCurrency: baseCurrency.toUpperCase(),
                targetCurrency: targetCurrency.toUpperCase(),
                date: rateDate,
            },
            {
                baseCurrency: baseCurrency.toUpperCase(),
                targetCurrency: targetCurrency.toUpperCase(),
                rate: parseFloat(rate),
                date: rateDate,
                source: 'manual',
            },
            { upsert: true, new: true }
        );

        res.status(201).json({
            success: true,
            message: 'Currency rate saved',
            data: newRate,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to save currency rate',
            error: error.message,
        });
    }
});

// Get supported currencies
router.get('/supported', (req, res) => {
    res.json({
        success: true,
        data: {
            currencies: currencyService.CONFIG.SUPPORTED_CURRENCIES,
            baseCurrency: currencyService.CONFIG.BASE_CURRENCY,
            source: 'Frankfurter API (European Central Bank)',
        },
    });
});

module.exports = router;

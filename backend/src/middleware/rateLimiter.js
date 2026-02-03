const rateLimit = require('express-rate-limit');

/**
 * Rate limiting configurations for different endpoints
 */

// General API rate limiter
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per windowMs
    message: {
        success: false,
        message: 'Too many login attempts. Please try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
});

// Rate limiter for seed endpoint (very strict - one-time use)
const seedLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1, // Only 1 attempt per hour
    message: {
        success: false,
        message: 'Seed endpoint rate limit exceeded.',
    },
});

module.exports = {
    generalLimiter,
    authLimiter,
    seedLimiter,
};

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
    max: 10, // 10 login attempts per windowMs
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

// Write operation limiter — prevents bulk abuse on POST/PUT/DELETE
const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 60, // 60 write operations per 15 minutes
    message: {
        success: false,
        message: 'Too many write operations. Please slow down.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    generalLimiter,
    authLimiter,
    seedLimiter,
    writeLimiter,
};

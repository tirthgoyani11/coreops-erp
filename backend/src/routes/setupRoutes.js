const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const verifyToken = require('../middleware/verifyToken');
const authorize = require('../middleware/authorize');
const { authLimiter } = require('../middleware/rateLimiter');

/**
 * @desc    Complete initial system setup
 * @route   POST /api/setup/complete
 * @access  SUPER_ADMIN only
 *
 * Creates the initial organization configuration:
 * - Sets base currency
 * - Creates first branch/headquarters
 */
router.post('/complete', authLimiter, verifyToken, authorize('SUPER_ADMIN'), asyncHandler(async (req, res, next) => {
    const {
        companyName,
        address,
        baseCurrency,
        branchName,
        branchAddress,
        branchCity,
        branchCountry
    } = req.body;

    if (!companyName || !branchName || !branchCity) {
        return next(new AppError('Company name, branch name, and city are required', 400));
    }

    const existingOffices = await prisma.office.count();
    if (existingOffices > 0) {
        return next(new AppError('Setup has already been completed', 400));
    }

    const headquarters = await prisma.office.create({
        data: {
            name: branchName,
            code: 'HQ',
            type: 'HEADQUARTERS',
            street: branchAddress || address || '',
            city: branchCity,
            country: branchCountry || 'Unknown',
            baseCurrency: baseCurrency || 'USD',
            isActive: true,
        },
    });

    const logger = require('../utils/logger');
    logger.info(`Setup completed: ${companyName} with HQ at ${branchCity}`);

    res.status(201).json({
        success: true,
        message: 'Setup completed successfully',
        data: {
            companyName,
            baseCurrency: baseCurrency || 'USD',
            headquarters: {
                id: headquarters.id,
                name: headquarters.name,
                city: headquarters.city,
            },
        },
    });
}));

/**
 * @desc    Check if setup is required
 * @route   GET /api/setup/status
 * @access  Public
 */
router.get('/status', asyncHandler(async (req, res) => {
    const officeCount = await prisma.office.count();

    res.status(200).json({
        success: true,
        data: {
            setupRequired: officeCount === 0,
            officeCount,
        },
    });
}));

module.exports = router;

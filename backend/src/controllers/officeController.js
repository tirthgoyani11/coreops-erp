const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');

/**
 * @desc    Create new office
 * @route   POST /api/offices
 * @access  SUPER_ADMIN
 */
exports.createOffice = asyncHandler(async (req, res, next) => {
    const { name, code, country, currency } = req.body;

    const office = await prisma.office.create({
        data: {
            name,
            code: code?.toUpperCase()?.trim(),
            country,
            baseCurrency: currency || 'INR',
            locationCode: code?.toUpperCase()?.trim(),
        },
    });

    res.status(201).json({
        success: true,
        message: 'Office created successfully',
        data: office,
    });
});

/**
 * @desc    Get all offices
 * @route   GET /api/offices
 * @access  SUPER_ADMIN
 */
exports.getOffices = asyncHandler(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [offices, total] = await Promise.all([
        prisma.office.findMany({
            where: { isActive: true },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.office.count({ where: { isActive: true } }),
    ]);

    res.status(200).json({
        success: true,
        count: offices.length,
        pagination: {
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            totalResults: total,
        },
        data: offices,
    });
});

/**
 * @desc    Get single office
 * @route   GET /api/offices/:id
 * @access  SUPER_ADMIN
 */
exports.getOffice = asyncHandler(async (req, res, next) => {
    const office = await prisma.office.findUnique({
        where: { id: req.params.id },
    });

    if (!office) return next(new AppError('Office not found', 404));

    res.status(200).json({ success: true, data: office });
});

/**
 * @desc    Update office
 * @route   PATCH /api/offices/:id
 * @access  SUPER_ADMIN
 */
exports.updateOffice = asyncHandler(async (req, res, next) => {
    const { name, currency, isActive } = req.body;

    const exists = await prisma.office.findUnique({ where: { id: req.params.id } });
    if (!exists) return next(new AppError('Office not found', 404));

    const office = await prisma.office.update({
        where: { id: req.params.id },
        data: {
            ...(name !== undefined && { name }),
            ...(currency !== undefined && { baseCurrency: currency }),
            ...(isActive !== undefined && { isActive }),
        },
    });

    res.status(200).json({
        success: true,
        message: 'Office updated successfully',
        data: office,
    });
});

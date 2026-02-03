const Office = require('../models/Office');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const { paginateQuery } = require('../utils/pagination');

/**
 * @desc    Create new office
 * @route   POST /api/offices
 * @access  SUPER_ADMIN
 */
exports.createOffice = asyncHandler(async (req, res, next) => {
    const { name, code, country, currency } = req.body;

    const office = await Office.create({
        name,
        code,
        country,
        currency,
    });

    res.status(201).json({
        success: true,
        message: 'Office created successfully',
        data: office,
    });
});

/**
 * @desc    Get all offices (with pagination)
 * @route   GET /api/offices?page=1&limit=20
 * @access  SUPER_ADMIN
 */
exports.getOffices = asyncHandler(async (req, res, next) => {
    const filter = { isActive: true };

    const { data, pagination } = await paginateQuery(
        Office,
        filter,
        req,
        []
    );

    res.status(200).json({
        success: true,
        count: data.length,
        pagination,
        data,
    });
});

/**
 * @desc    Get single office
 * @route   GET /api/offices/:id
 * @access  SUPER_ADMIN
 */
exports.getOffice = asyncHandler(async (req, res, next) => {
    const office = await Office.findById(req.params.id);

    if (!office) {
        return next(new AppError('Office not found', 404));
    }

    res.status(200).json({
        success: true,
        data: office,
    });
});

/**
 * @desc    Update office
 * @route   PATCH /api/offices/:id
 * @access  SUPER_ADMIN
 */
exports.updateOffice = asyncHandler(async (req, res, next) => {
    const { name, currency, isActive } = req.body;

    const office = await Office.findByIdAndUpdate(
        req.params.id,
        { name, currency, isActive },
        { new: true, runValidators: true }
    );

    if (!office) {
        return next(new AppError('Office not found', 404));
    }

    res.status(200).json({
        success: true,
        message: 'Office updated successfully',
        data: office,
    });
});

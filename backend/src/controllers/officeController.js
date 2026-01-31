const Office = require('../models/Office');
const { asyncHandler, AppError } = require('../utils/errorHandler');

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
 * @desc    Get all offices
 * @route   GET /api/offices
 * @access  SUPER_ADMIN
 */
exports.getOffices = asyncHandler(async (req, res, next) => {
    const offices = await Office.find({ isActive: true }).sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: offices.length,
        data: offices,
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

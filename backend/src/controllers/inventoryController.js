const Inventory = require('../models/Inventory');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const { paginateQuery } = require('../utils/pagination');

/**
 * @desc    Create new inventory item
 * @route   POST /api/inventory
 * @access  MANAGER, SUPER_ADMIN
 */
exports.createItem = asyncHandler(async (req, res, next) => {
    const { type, name, sku, quantity, unitCost, officeId } = req.body;

    // Determine office
    let targetOfficeId = officeId;
    if (req.user.role !== 'SUPER_ADMIN') {
        targetOfficeId = req.user.officeId._id || req.user.officeId;
    }

    if (!targetOfficeId) {
        return next(new AppError('Office is required', 400));
    }

    const item = await Inventory.create({
        type,
        name,
        sku,
        quantity,
        unitCost,
        officeId: targetOfficeId,
        createdBy: req.user._id,
    });

    res.status(201).json({
        success: true,
        message: 'Inventory item created successfully',
        data: item,
    });
});

/**
 * @desc    Get all inventory items (filtered by office, with pagination)
 * @route   GET /api/inventory?page=1&limit=20
 * @access  ALL authenticated
 */
exports.getItems = asyncHandler(async (req, res, next) => {
    const filter = { ...req.officeFilter };

    // Optional filters
    if (req.query.type) filter.type = req.query.type;
    if (req.query.name) filter.name = new RegExp(req.query.name, 'i');

    const { data, pagination } = await paginateQuery(
        Inventory,
        filter,
        req,
        [
            { path: 'officeId', select: 'name code' },
            { path: 'createdBy', select: 'name email' }
        ]
    );

    res.status(200).json({
        success: true,
        count: data.length,
        pagination,
        data,
    });
});

/**
 * @desc    Get single inventory item
 * @route   GET /api/inventory/:id
 * @access  ALL authenticated
 */
exports.getItem = asyncHandler(async (req, res, next) => {
    const item = await Inventory.findById(req.params.id)
        .populate('officeId', 'name code')
        .populate('createdBy', 'name email');

    if (!item) {
        return next(new AppError('Inventory item not found', 404));
    }

    // Office isolation check
    if (
        req.user.role !== 'SUPER_ADMIN' &&
        item.officeId._id.toString() !== req.user.officeId.toString()
    ) {
        return next(new AppError('Access denied to this item', 403));
    }

    res.status(200).json({
        success: true,
        data: item,
    });
});

/**
 * @desc    Update inventory item (quantity adjustment)
 * @route   PATCH /api/inventory/:id
 * @access  MANAGER, SUPER_ADMIN
 */
exports.updateItem = asyncHandler(async (req, res, next) => {
    const { name, quantity, unitCost } = req.body;

    let item = await Inventory.findById(req.params.id);

    if (!item) {
        return next(new AppError('Inventory item not found', 404));
    }

    // Office isolation check
    if (
        req.user.role !== 'SUPER_ADMIN' &&
        item.officeId.toString() !== req.user.officeId.toString()
    ) {
        return next(new AppError('Access denied to this item', 403));
    }

    item = await Inventory.findByIdAndUpdate(
        req.params.id,
        { name, quantity, unitCost },
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        message: 'Inventory item updated successfully',
        data: item,
    });
});

/**
 * @desc    Delete inventory item
 * @route   DELETE /api/inventory/:id
 * @access  MANAGER, SUPER_ADMIN
 */
exports.deleteItem = asyncHandler(async (req, res, next) => {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
        return next(new AppError('Inventory item not found', 404));
    }

    // Office isolation check
    if (
        req.user.role !== 'SUPER_ADMIN' &&
        item.officeId.toString() !== req.user.officeId.toString()
    ) {
        return next(new AppError('Access denied to this item', 403));
    }

    await Inventory.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success: true,
        message: 'Inventory item deleted successfully',
    });
});

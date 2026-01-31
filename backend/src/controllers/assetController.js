const Asset = require('../models/Asset');
const { asyncHandler, AppError } = require('../utils/errorHandler');

/**
 * @desc    Create new asset
 * @route   POST /api/assets
 * @access  MANAGER, SUPER_ADMIN
 */
exports.createAsset = asyncHandler(async (req, res, next) => {
    const { name, category, purchaseCost, currency, officeId, status } = req.body;

    // Determine office: use provided or user's office
    let targetOfficeId = officeId;
    if (req.user.role !== 'SUPER_ADMIN') {
        targetOfficeId = req.user.officeId._id || req.user.officeId;
    }

    if (!targetOfficeId) {
        return next(new AppError('Office is required', 400));
    }

    const asset = await Asset.create({
        name,
        category,
        purchaseCost,
        currency,
        officeId: targetOfficeId,
        status,
        createdBy: req.user._id,
    });

    res.status(201).json({
        success: true,
        message: 'Asset created successfully',
        data: asset,
    });
});

/**
 * @desc    Get all assets (filtered by office)
 * @route   GET /api/assets
 * @access  ALL authenticated
 */
exports.getAssets = asyncHandler(async (req, res, next) => {
    // Apply office filter from middleware
    const filter = { ...req.officeFilter };

    // Optional query filters
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = new RegExp(req.query.category, 'i');

    const assets = await Asset.find(filter)
        .populate('officeId', 'name code')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: assets.length,
        data: assets,
    });
});

/**
 * @desc    Get single asset
 * @route   GET /api/assets/:id
 * @access  ALL authenticated (with office check)
 */
exports.getAsset = asyncHandler(async (req, res, next) => {
    const asset = await Asset.findById(req.params.id)
        .populate('officeId', 'name code country')
        .populate('createdBy', 'name email');

    if (!asset) {
        return next(new AppError('Asset not found', 404));
    }

    // Office isolation check
    if (
        req.user.role !== 'SUPER_ADMIN' &&
        asset.officeId._id.toString() !== req.user.officeId.toString()
    ) {
        return next(new AppError('Access denied to this asset', 403));
    }

    res.status(200).json({
        success: true,
        data: asset,
    });
});

/**
 * @desc    Update asset
 * @route   PATCH /api/assets/:id
 * @access  MANAGER, SUPER_ADMIN
 */
exports.updateAsset = asyncHandler(async (req, res, next) => {
    const { name, category, purchaseCost, currency, status } = req.body;

    let asset = await Asset.findById(req.params.id);

    if (!asset) {
        return next(new AppError('Asset not found', 404));
    }

    // Office isolation check
    if (
        req.user.role !== 'SUPER_ADMIN' &&
        asset.officeId.toString() !== req.user.officeId.toString()
    ) {
        return next(new AppError('Access denied to this asset', 403));
    }

    asset = await Asset.findByIdAndUpdate(
        req.params.id,
        { name, category, purchaseCost, currency, status },
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        message: 'Asset updated successfully',
        data: asset,
    });
});

/**
 * @desc    Delete asset (soft delete via status)
 * @route   DELETE /api/assets/:id
 * @access  MANAGER, SUPER_ADMIN
 */
exports.deleteAsset = asyncHandler(async (req, res, next) => {
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
        return next(new AppError('Asset not found', 404));
    }

    // Office isolation check
    if (
        req.user.role !== 'SUPER_ADMIN' &&
        asset.officeId.toString() !== req.user.officeId.toString()
    ) {
        return next(new AppError('Access denied to this asset', 403));
    }

    // Soft delete
    asset.status = 'RETIRED';
    await asset.save();

    res.status(200).json({
        success: true,
        message: 'Asset retired successfully',
    });
});

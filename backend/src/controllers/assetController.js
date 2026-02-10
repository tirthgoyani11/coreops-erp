const Asset = require('../models/Asset');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const { paginateQuery } = require('../utils/pagination');
const QRCode = require('qrcode');

/**
 * @desc    Create new asset
 * @route   POST /api/assets
 * @access  MANAGER, SUPER_ADMIN
 */
exports.createAsset = asyncHandler(async (req, res, next) => {
    const { name, category, purchaseCost, currency, officeId, status, manufacturer, model, serialNumber, purchaseOrderNumber, invoiceNumber, purchaseDate, vendor, warrantyStartDate, warrantyEndDate, locationBuilding, locationFloor, locationRoom } = req.body;

    // Determine office: use provided or user's office
    let targetOfficeId = officeId;
    if (req.user.role !== 'SUPER_ADMIN') {
        targetOfficeId = req.user.officeId._id || req.user.officeId;
    }

    if (!targetOfficeId) {
        return next(new AppError('Office is required', 400));
    }

    // Create asset (GUAI generated in pre-save hook)
    const asset = await Asset.create({
        name,
        category: category.toUpperCase(),
        manufacturer,
        model,
        serialNumber,
        purchaseInfo: {
            purchasePrice: purchaseCost,
            purchaseDate: purchaseDate || new Date(),
            currency: currency || 'INR',
            purchaseOrderNumber,
            invoiceNumber,
            vendor,
            warranty: {
                startDate: warrantyStartDate,
                endDate: warrantyEndDate
            }
        },
        location: {
            building: locationBuilding,
            floor: locationFloor,
            room: locationRoom
        },
        officeId: targetOfficeId,
        status: status || 'ACTIVE',
        createdBy: req.user._id,
    });

    // Generate QR Code containing URL to asset
    try {
        const qrData = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/assets/${asset._id}`;
        asset.qrCode = await QRCode.toDataURL(qrData);
        await asset.save();
    } catch (qrError) {
        // Log but don't fail the request
        const logger = require('../utils/logger');
        logger.error('Failed to generate QR code:', qrError);
    }

    res.status(201).json({
        success: true,
        message: 'Asset created successfully',
        data: asset,
    });
});

/**
 * @desc    Get all assets (filtered by office, with pagination)
 * @route   GET /api/assets?page=1&limit=20
 * @access  ALL authenticated
 */
exports.getAssets = asyncHandler(async (req, res, next) => {
    // Apply office filter from middleware
    const filter = { ...req.officeFilter };

    // Optional query filters
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = new RegExp(req.query.category, 'i');

    const { data, pagination } = await paginateQuery(
        Asset,
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
    const {
        name, category, status, manufacturer, model, serialNumber,
        purchaseCost, currency, purchaseDate, purchaseOrderNumber,
        invoiceNumber, vendor, warrantyStartDate, warrantyEndDate,
        locationBuilding, locationFloor, locationRoom, officeId, notes
    } = req.body;

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

    // Build update object — only include fields that were actually sent
    const update = {};
    if (name !== undefined) update.name = name;
    if (category !== undefined) update.category = category.toUpperCase();
    if (status !== undefined) update.status = status;
    if (manufacturer !== undefined) update.manufacturer = manufacturer;
    if (model !== undefined) update.model = model;
    if (serialNumber !== undefined) update.serialNumber = serialNumber;
    if (notes !== undefined) update.notes = notes;

    // Office (only SUPER_ADMIN can reassign)
    if (officeId && req.user.role === 'SUPER_ADMIN') {
        update.officeId = officeId;
    }

    // Nested: purchaseInfo
    if (purchaseCost !== undefined || currency || purchaseDate || purchaseOrderNumber || invoiceNumber || vendor || warrantyStartDate || warrantyEndDate) {
        update.purchaseInfo = { ...asset.purchaseInfo?.toObject?.() || asset.purchaseInfo || {} };
        if (purchaseCost !== undefined) update.purchaseInfo.purchasePrice = Number(purchaseCost);
        if (currency) update.purchaseInfo.currency = currency;
        if (purchaseDate) update.purchaseInfo.purchaseDate = purchaseDate;
        if (purchaseOrderNumber !== undefined) update.purchaseInfo.purchaseOrderNumber = purchaseOrderNumber;
        if (invoiceNumber !== undefined) update.purchaseInfo.invoiceNumber = invoiceNumber;
        if (vendor) update.purchaseInfo.vendor = vendor;
        if (warrantyStartDate || warrantyEndDate) {
            update.purchaseInfo.warranty = { ...update.purchaseInfo.warranty || {} };
            if (warrantyStartDate) update.purchaseInfo.warranty.startDate = warrantyStartDate;
            if (warrantyEndDate) update.purchaseInfo.warranty.endDate = warrantyEndDate;
        }
    }

    // Nested: location
    if (locationBuilding !== undefined || locationFloor !== undefined || locationRoom !== undefined) {
        update.location = { ...asset.location?.toObject?.() || asset.location || {} };
        if (locationBuilding !== undefined) update.location.building = locationBuilding;
        if (locationFloor !== undefined) update.location.floor = locationFloor;
        if (locationRoom !== undefined) update.location.room = locationRoom;
    }

    asset = await Asset.findByIdAndUpdate(
        req.params.id,
        update,
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

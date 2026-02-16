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
        .populate('createdBy', 'name email')
        .populate('location.assignedTo', 'name email')
        .populate({
            path: 'history.changedBy',
            select: 'name email'
        })
        .select('+history'); // Explicitly select hidden history field

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
        locationBuilding, locationFloor, locationRoom, officeId, notes, images
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
    if (images !== undefined) update.images = images;

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

    // Detect changes for history logging
    const historyEntry = {
        date: new Date(),
        action: 'UPDATE',
        changedBy: req.user._id,
        details: []
    };

    if (name !== undefined && name !== asset.name) historyEntry.details.push(`Name changed from "${asset.name}" to "${name}"`);
    if (status !== undefined && status !== asset.status) {
        historyEntry.action = 'STATUS_CHANGE';
        historyEntry.details.push(`Status changed from ${asset.status} to ${status}`);
    }
    if (officeId && req.user.role === 'SUPER_ADMIN' && officeId !== asset.officeId.toString()) {
        historyEntry.action = 'TRANSFER';
        historyEntry.details.push(`Transferred to new office`);
    }

    // Location check
    const newLoc = req.body.location || {};
    if (locationBuilding !== undefined || locationFloor !== undefined || locationRoom !== undefined) {
        // This is a simplification, ideally we compare values
        historyEntry.action = 'LOCATION_MOVE';
        historyEntry.details.push('Location updated');
    }

    if (historyEntry.details.length > 0) {
        // We use $push in the update to be atomic, but findByIdAndUpdate with "update" object is tricky for arrays + sets
        // Easier to push to the "update" object if we switch to atomic operators,
        // OR since we already fetched 'asset', we can just save() it... 
        // BUT the current implementation uses findByIdAndUpdate(id, update, ...).
        // Let's mix them. We will add $push to the update operation if it wasn't a doc.save() flow.

        // However, mixing $set (which 'update' implicit object usually is) and $push is fine.
        // But 'update' variable above is a plain JS object, so mongoose treats it as $set.
        // We need to convert 'update' to use explicit atomic operators to mix $set and $push.

        const atomicUpdate = { $set: update, $push: { history: { ...historyEntry, details: historyEntry.details.join('; ') } } };

        asset = await Asset.findByIdAndUpdate(
            req.params.id,
            atomicUpdate,
            { new: true, runValidators: true }
        );
    } else {
        // No audit-worthy changes or simple save
        asset = await Asset.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true, runValidators: true }
        );
    }

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

/**
 * @desc    Get Asset Statistics (Aggregation)
 * @route   GET /api/assets/stats
 * @access  ALL authenticated
 */
exports.getAssetStats = asyncHandler(async (req, res, next) => {
    // Office Filter
    const matchStage = {};
    if (req.user.role !== 'SUPER_ADMIN') {
        matchStage.officeId = req.user.officeId;
    }

    const stats = await Asset.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                active: {
                    $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] }
                },
                maintenance: {
                    $sum: { $cond: [{ $eq: ["$status", "MAINTENANCE"] }, 1, 0] }
                },
                retired: {
                    $sum: { $cond: [{ $in: ["$status", ["RETIRED", "LOST", "SOLD", "DECOMMISSIONED"]] }, 1, 0] }
                },
                totalValue: {
                    $sum: { $ifNull: ["$purchaseInfo.purchasePrice", "$purchaseCost", 0] }
                }
            }
        }
    ]);

    const result = stats[0] || { total: 0, active: 0, maintenance: 0, retired: 0, totalValue: 0 };

    res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * @desc    Bulk Delete Assets
 * @route   POST /api/assets/bulk-delete
 * @access  MANAGER, SUPER_ADMIN
 */
exports.deleteMultipleAssets = asyncHandler(async (req, res, next) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return next(new AppError('No asset IDs provided', 400));
    }

    // Office Isolation Query
    const query = {
        _id: { $in: ids }
    };

    if (req.user.role !== 'SUPER_ADMIN') {
        query.officeId = req.user.officeId;
    }

    // Soft Delete
    const result = await Asset.updateMany(query, { status: 'RETIRED' });

    res.status(200).json({
        success: true,
        message: `${result.modifiedCount} assets retired successfully`,
        data: {
            modifiedCount: result.modifiedCount
        }
    });
});

/**
 * @desc    Export assets as CSV
 * @route   GET /api/assets/export
 * @access  ALL authenticated (filtered by office)
 */
exports.exportAssets = asyncHandler(async (req, res, next) => {
    const query = {};
    if (req.user.role !== 'SUPER_ADMIN') {
        query.officeId = req.user.officeId;
    }

    const assets = await Asset.find(query)
        .populate('officeId', 'name code')
        .populate('location.assignedTo', 'name email')
        .lean();

    // CSV header
    const headers = ['GUAI', 'Name', 'Category', 'Status', 'Condition', 'Serial Number', 'Manufacturer', 'Model', 'Office', 'Office ID', 'Building', 'Floor', 'Room', 'Assigned To', 'Purchase Price', 'Currency', 'Purchase Date', 'Warranty End'];

    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const rows = assets.map(a => [
        a.guai,
        a.name,
        a.category,
        a.status,
        a.condition || '',
        a.serialNumber || '',
        a.manufacturer || '',
        a.model || '',
        a.officeId?.name || '',
        a.officeId?._id || '',
        a.location?.building || '',
        a.location?.floor || '',
        a.location?.room || '',
        a.location?.assignedTo?.name || '',
        a.purchaseInfo?.purchasePrice || a.purchaseCost || 0,
        a.purchaseInfo?.currency || a.currency || 'INR',
        a.purchaseInfo?.purchaseDate ? new Date(a.purchaseInfo.purchaseDate).toISOString().split('T')[0] : '',
        a.purchaseInfo?.warranty?.endDate ? new Date(a.purchaseInfo.warranty.endDate).toISOString().split('T')[0] : '',
    ].map(escapeCSV).join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=assets-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.status(200).send(csv);
});

/**
 * @desc    Check out asset to a user
 * @route   POST /api/assets/:id/checkout
 * @access  MANAGER, SUPER_ADMIN
 */
exports.checkoutAsset = asyncHandler(async (req, res, next) => {
    const { userId } = req.body;
    if (!userId) return next(new AppError('User ID is required', 400));

    const User = require('../models/User');
    const targetUser = await User.findById(userId).select('name email');
    if (!targetUser) return next(new AppError('User not found', 404));

    const asset = await Asset.findById(req.params.id);
    if (!asset) return next(new AppError('Asset not found', 404));

    if (asset.location?.assignedTo) {
        return next(new AppError('Asset is already checked out. Check it in first.', 400));
    }

    const historyEntry = {
        date: new Date(),
        action: 'CHECKOUT',
        changedBy: req.user._id,
        details: `Checked out to ${targetUser.name} (${targetUser.email})`
    };

    await Asset.findByIdAndUpdate(req.params.id, {
        $set: { 'location.assignedTo': userId },
        $push: { history: historyEntry }
    });

    res.status(200).json({
        success: true,
        message: `Asset checked out to ${targetUser.name}`,
    });
});

/**
 * @desc    Check in asset (return from user)
 * @route   POST /api/assets/:id/checkin
 * @access  MANAGER, SUPER_ADMIN
 */
exports.checkinAsset = asyncHandler(async (req, res, next) => {
    const asset = await Asset.findById(req.params.id).populate('location.assignedTo', 'name email');
    if (!asset) return next(new AppError('Asset not found', 404));

    if (!asset.location?.assignedTo) {
        return next(new AppError('Asset is not currently checked out', 400));
    }

    const previousUser = asset.location.assignedTo;
    const historyEntry = {
        date: new Date(),
        action: 'CHECKIN',
        changedBy: req.user._id,
        details: `Checked in from ${previousUser.name || 'Unknown'} (${previousUser.email || ''})`
    };

    await Asset.findByIdAndUpdate(req.params.id, {
        $unset: { 'location.assignedTo': '' },
        $push: { history: historyEntry }
    });

    res.status(200).json({
        success: true,
        message: `Asset checked in from ${previousUser.name}`,
    });
});

/**
 * @desc    Get users list for assignment dropdown
 * @route   GET /api/assets/users
 * @access  ALL authenticated
 */
exports.getUsers = asyncHandler(async (req, res, next) => {
    const User = require('../models/User');
    const query = { isActive: true };

    // Office isolation for non-SUPER_ADMIN
    if (req.user.role !== 'SUPER_ADMIN') {
        query.officeId = req.user.officeId;
    }

    const users = await User.find(query)
        .select('name email role officeId')
        .sort({ name: 1 })
        .lean();

    res.status(200).json({
        success: true,
        data: users
    });
});

/**
 * @desc    Import assets from CSV
 * @route   POST /api/assets/import
 * @access  MANAGER, SUPER_ADMIN
 */
exports.importAssets = asyncHandler(async (req, res, next) => {
    const { csvData } = req.body;
    if (!csvData || typeof csvData !== 'string') {
        return next(new AppError('CSV data is required', 400));
    }

    const lines = csvData.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
        return next(new AppError('CSV must have a header row and at least one data row', 400));
    }

    // Parse header
    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));

    const results = { created: 0, errors: [] };

    for (let i = 1; i < lines.length; i++) {
        try {
            // Simple CSV parsing (handles quoted fields)
            const values = [];
            let current = '';
            let inQuotes = false;
            for (const char of lines[i]) {
                if (char === '"') { inQuotes = !inQuotes; }
                else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
                else { current += char; }
            }
            values.push(current.trim());

            const row = {};
            headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

            // Map CSV columns to Asset schema
            const assetData = {
                name: row['name'] || row['asset name'],
                category: (row['category'] || 'OTHER').toUpperCase(),
                status: (row['status'] || 'ACTIVE').toUpperCase(),
                serialNumber: row['serial number'] || row['serialnumber'] || '',
                manufacturer: row['manufacturer'] || '',
                model: row['model'] || '',
                purchaseInfo: {
                    purchasePrice: parseFloat(row['purchase price'] || row['purchaseprice'] || row['cost'] || '0') || 0,
                    currency: row['currency'] || 'INR',
                    purchaseDate: row['purchase date'] || row['purchasedate'] ? new Date(row['purchase date'] || row['purchasedate']) : new Date(),
                },
                location: {
                    building: row['building'] || '',
                    floor: row['floor'] || '',
                    room: row['room'] || '',
                },
                officeId: row['office id'] || row['officeid'] || req.user.officeId || req.body.officeId,
                createdBy: req.user._id,
                notes: row['notes'] || '',
            };

            if (!assetData.name) {
                results.errors.push({ row: i + 1, error: 'Name is required' });
                continue;
            }
            if (!assetData.officeId) {
                results.errors.push({ row: i + 1, error: 'Office ID is required (SUPER_ADMIN must provide officeId)' });
                continue;
            }

            // Set legacy field
            assetData.purchaseCost = assetData.purchaseInfo.purchasePrice;

            await Asset.create(assetData);
            results.created++;
        } catch (err) {
            results.errors.push({ row: i + 1, error: err.message });
        }
    }

    res.status(200).json({
        success: true,
        message: `${results.created} assets imported successfully`,
        data: results
    });
});

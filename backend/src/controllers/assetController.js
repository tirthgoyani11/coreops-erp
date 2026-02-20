const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const QRCode = require('qrcode');
const logger = require('../utils/logger');

/**
 * Generate GUAI (Globally Unique Asset Identifier)
 */
async function generateGUAI(officeId) {
    // Get office for country/location codes
    const office = await prisma.office.findUnique({ where: { id: officeId } });
    const countryCode = office?.countryCode || 'IN';
    const locationCode = office?.locationCode || office?.code || 'HQ';

    // Atomic counter increment
    const counter = await prisma.counter.upsert({
        where: { name: 'asset_guai' },
        update: { sequence: { increment: 1 } },
        create: { name: 'asset_guai', prefix: 'GUAI', sequence: 1 },
    });

    const seq = String(counter.sequence).padStart(6, '0');
    return `${countryCode}-${locationCode}-${seq}`;
}

/**
 * @desc    Create new asset
 * @route   POST /api/assets
 * @access  MANAGER, SUPER_ADMIN
 */
exports.createAsset = asyncHandler(async (req, res, next) => {
    const {
        name, category, purchaseCost, currency, officeId, status,
        manufacturer, model, serialNumber, purchaseOrderNumber,
        invoiceNumber, purchaseDate, vendor, warrantyStartDate, warrantyEndDate,
        locationBuilding, locationFloor, locationRoom
    } = req.body;

    let targetOfficeId = officeId;
    if (req.user.role !== 'SUPER_ADMIN') {
        targetOfficeId = req.user.office?.id || req.user.officeId;
        if (typeof targetOfficeId === 'object') targetOfficeId = targetOfficeId.id;
    }

    if (!targetOfficeId) return next(new AppError('Office is required', 400));

    const guai = await generateGUAI(targetOfficeId);

    let asset = await prisma.asset.create({
        data: {
            guai,
            name,
            category: category?.toUpperCase() || 'OTHER',
            manufacturer,
            model,
            serialNumber,
            purchasePrice: Number(purchaseCost) || 0,
            purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
            currency: currency || 'INR',
            purchaseOrderNumber,
            invoiceNumber,
            warrantyStart: warrantyStartDate ? new Date(warrantyStartDate) : null,
            warrantyEnd: warrantyEndDate ? new Date(warrantyEndDate) : null,
            building: locationBuilding,
            floor: locationFloor,
            room: locationRoom,
            officeId: targetOfficeId,
            status: status || 'ACTIVE',
            currentBookValue: Number(purchaseCost) || 0,
            createdById: req.user.id,
        },
    });

    // Generate QR Code
    try {
        const qrData = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/assets/${asset.id}`;
        const qrCode = await QRCode.toDataURL(qrData);
        asset = await prisma.asset.update({ where: { id: asset.id }, data: { qrCode } });
    } catch (qrError) {
        logger.error('Failed to generate QR code:', qrError);
    }

    res.status(201).json({
        success: true,
        message: 'Asset created successfully',
        data: asset,
    });
});

/**
 * @desc    Get all assets (filtered, paginated)
 * @route   GET /api/assets
 * @access  ALL authenticated
 */
exports.getAssets = asyncHandler(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const where = {};

    if (req.user.role !== 'SUPER_ADMIN') {
        const oid = req.user.office?.id || req.user.officeId;
        where.officeId = typeof oid === 'object' ? oid.id : oid;
    }

    if (req.query.status) where.status = req.query.status;
    if (req.query.category) where.category = { equals: req.query.category, mode: 'insensitive' };

    const [assets, total] = await Promise.all([
        prisma.asset.findMany({
            where,
            skip,
            take: limit,
            include: {
                office: { select: { id: true, name: true, code: true } },
                createdBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.asset.count({ where }),
    ]);

    res.status(200).json({
        success: true,
        count: assets.length,
        pagination: { page, limit, totalPages: Math.ceil(total / limit), totalResults: total },
        data: assets,
    });
});

/**
 * @desc    Get single asset
 * @route   GET /api/assets/:id
 * @access  ALL authenticated
 */
exports.getAsset = asyncHandler(async (req, res, next) => {
    const asset = await prisma.asset.findUnique({
        where: { id: req.params.id },
        include: {
            office: { select: { id: true, name: true, code: true, country: true } },
            createdBy: { select: { id: true, name: true, email: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
            maintenanceHistory: { orderBy: { date: 'desc' }, take: 20 },
            maintenanceTickets: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
    });

    if (!asset) return next(new AppError('Asset not found', 404));

    // Office isolation
    if (req.user.role !== 'SUPER_ADMIN') {
        const userOfficeId = req.user.office?.id || req.user.officeId;
        if (asset.officeId !== (typeof userOfficeId === 'object' ? userOfficeId.id : userOfficeId)) {
            return next(new AppError('Access denied to this asset', 403));
        }
    }

    res.status(200).json({ success: true, data: asset });
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

    const existing = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(new AppError('Asset not found', 404));

    // Office isolation
    if (req.user.role !== 'SUPER_ADMIN') {
        const userOfficeId = req.user.office?.id || req.user.officeId;
        if (existing.officeId !== (typeof userOfficeId === 'object' ? userOfficeId.id : userOfficeId)) {
            return next(new AppError('Access denied to this asset', 403));
        }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category.toUpperCase();
    if (status !== undefined) updateData.status = status;
    if (manufacturer !== undefined) updateData.manufacturer = manufacturer;
    if (model !== undefined) updateData.model = model;
    if (serialNumber !== undefined) updateData.serialNumber = serialNumber;
    if (notes !== undefined) updateData.notes = notes;
    if (images !== undefined) updateData.images = images;
    if (purchaseCost !== undefined) updateData.purchasePrice = Number(purchaseCost);
    if (currency) updateData.currency = currency;
    if (purchaseDate) updateData.purchaseDate = new Date(purchaseDate);
    if (purchaseOrderNumber !== undefined) updateData.purchaseOrderNumber = purchaseOrderNumber;
    if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber;
    if (warrantyStartDate) updateData.warrantyStart = new Date(warrantyStartDate);
    if (warrantyEndDate) updateData.warrantyEnd = new Date(warrantyEndDate);
    if (locationBuilding !== undefined) updateData.building = locationBuilding;
    if (locationFloor !== undefined) updateData.floor = locationFloor;
    if (locationRoom !== undefined) updateData.room = locationRoom;
    if (officeId && req.user.role === 'SUPER_ADMIN') updateData.officeId = officeId;

    const asset = await prisma.asset.update({
        where: { id: req.params.id },
        data: updateData,
    });

    // Log history entry for significant changes
    const historyNotes = [];
    if (status && status !== existing.status) historyNotes.push(`Status: ${existing.status} → ${status}`);
    if (name && name !== existing.name) historyNotes.push(`Name changed`);

    if (historyNotes.length > 0) {
        await prisma.assetMaintenanceHistory.create({
            data: {
                assetId: asset.id,
                type: 'UPDATE',
                notes: historyNotes.join('; '),
            },
        });
    }

    res.status(200).json({
        success: true,
        message: 'Asset updated successfully',
        data: asset,
    });
});

/**
 * @desc    Delete asset (soft delete)
 * @route   DELETE /api/assets/:id
 * @access  MANAGER, SUPER_ADMIN
 */
exports.deleteAsset = asyncHandler(async (req, res, next) => {
    const existing = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(new AppError('Asset not found', 404));

    if (req.user.role !== 'SUPER_ADMIN') {
        const userOfficeId = req.user.office?.id || req.user.officeId;
        if (existing.officeId !== (typeof userOfficeId === 'object' ? userOfficeId.id : userOfficeId)) {
            return next(new AppError('Access denied to this asset', 403));
        }
    }

    await prisma.asset.update({
        where: { id: req.params.id },
        data: { status: 'RETIRED' },
    });

    res.status(200).json({ success: true, message: 'Asset retired successfully' });
});

/**
 * @desc    Get Asset Stats
 * @route   GET /api/assets/stats
 * @access  ALL authenticated
 */
exports.getAssetStats = asyncHandler(async (req, res, next) => {
    const where = {};
    if (req.user.role !== 'SUPER_ADMIN') {
        const oid = req.user.office?.id || req.user.officeId;
        where.officeId = typeof oid === 'object' ? oid.id : oid;
    }

    const [total, active, maintenance, retired, valueAgg] = await Promise.all([
        prisma.asset.count({ where }),
        prisma.asset.count({ where: { ...where, status: 'ACTIVE' } }),
        prisma.asset.count({ where: { ...where, status: 'MAINTENANCE' } }),
        prisma.asset.count({ where: { ...where, status: { in: ['RETIRED', 'LOST', 'SOLD', 'DECOMMISSIONED'] } } }),
        prisma.asset.aggregate({ where, _sum: { purchasePrice: true } }),
    ]);

    res.status(200).json({
        success: true,
        data: { total, active, maintenance, retired, totalValue: valueAgg._sum.purchasePrice || 0 },
    });
});

/**
 * @desc    Bulk delete (retire) assets
 * @route   POST /api/assets/bulk-delete
 * @access  MANAGER, SUPER_ADMIN
 */
exports.deleteMultipleAssets = asyncHandler(async (req, res, next) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return next(new AppError('No asset IDs provided', 400));
    }

    const where = { id: { in: ids } };
    if (req.user.role !== 'SUPER_ADMIN') {
        const oid = req.user.office?.id || req.user.officeId;
        where.officeId = typeof oid === 'object' ? oid.id : oid;
    }

    const result = await prisma.asset.updateMany({ where, data: { status: 'RETIRED' } });

    res.status(200).json({
        success: true,
        message: `${result.count} assets retired successfully`,
        data: { modifiedCount: result.count },
    });
});

/**
 * @desc    Export assets as CSV
 * @route   GET /api/assets/export
 * @access  ALL authenticated
 */
exports.exportAssets = asyncHandler(async (req, res, next) => {
    const where = {};
    if (req.user.role !== 'SUPER_ADMIN') {
        const oid = req.user.office?.id || req.user.officeId;
        where.officeId = typeof oid === 'object' ? oid.id : oid;
    }

    const assets = await prisma.asset.findMany({
        where,
        include: {
            office: { select: { name: true, code: true } },
            assignedTo: { select: { name: true, email: true } },
        },
    });

    const headers = ['GUAI', 'Name', 'Category', 'Status', 'Condition', 'Serial Number', 'Manufacturer', 'Model', 'Office', 'Building', 'Floor', 'Room', 'Assigned To', 'Purchase Price', 'Currency', 'Purchase Date', 'Warranty End'];

    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`;
        return str;
    };

    const rows = assets.map(a => [
        a.guai, a.name, a.category, a.status, a.condition || '',
        a.serialNumber || '', a.manufacturer || '', a.model || '',
        a.office?.name || '', a.building || '', a.floor || '', a.room || '',
        a.assignedTo?.name || '', a.purchasePrice || 0, a.currency || 'INR',
        a.purchaseDate ? new Date(a.purchaseDate).toISOString().split('T')[0] : '',
        a.warrantyEnd ? new Date(a.warrantyEnd).toISOString().split('T')[0] : '',
    ].map(escapeCSV).join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=assets-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.status(200).send(csv);
});

/**
 * @desc    Checkout asset to user
 * @route   POST /api/assets/:id/checkout
 * @access  MANAGER, SUPER_ADMIN
 */
exports.checkoutAsset = asyncHandler(async (req, res, next) => {
    const { userId } = req.body;
    if (!userId) return next(new AppError('User ID is required', 400));

    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    if (!targetUser) return next(new AppError('User not found', 404));

    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (!asset) return next(new AppError('Asset not found', 404));
    if (asset.assignedToId) return next(new AppError('Asset is already checked out. Check it in first.', 400));

    await prisma.asset.update({
        where: { id: req.params.id },
        data: { assignedToId: userId },
    });

    await prisma.assetMaintenanceHistory.create({
        data: {
            assetId: asset.id,
            type: 'CHECKOUT',
            notes: `Checked out to ${targetUser.name} (${targetUser.email})`,
        },
    });

    res.status(200).json({ success: true, message: `Asset checked out to ${targetUser.name}` });
});

/**
 * @desc    Check in asset
 * @route   POST /api/assets/:id/checkin
 * @access  MANAGER, SUPER_ADMIN
 */
exports.checkinAsset = asyncHandler(async (req, res, next) => {
    const asset = await prisma.asset.findUnique({
        where: { id: req.params.id },
        include: { assignedTo: { select: { name: true, email: true } } },
    });

    if (!asset) return next(new AppError('Asset not found', 404));
    if (!asset.assignedToId) return next(new AppError('Asset is not currently checked out', 400));

    const previousUser = asset.assignedTo;

    await prisma.asset.update({
        where: { id: req.params.id },
        data: { assignedToId: null },
    });

    await prisma.assetMaintenanceHistory.create({
        data: {
            assetId: asset.id,
            type: 'CHECKIN',
            notes: `Checked in from ${previousUser?.name || 'Unknown'}`,
        },
    });

    res.status(200).json({ success: true, message: `Asset checked in from ${previousUser?.name}` });
});

/**
 * @desc    Get users for assignment dropdown
 * @route   GET /api/assets/users
 * @access  ALL authenticated
 */
exports.getUsers = asyncHandler(async (req, res, next) => {
    const where = { isActive: true };
    if (req.user.role !== 'SUPER_ADMIN') {
        const oid = req.user.office?.id || req.user.officeId;
        where.officeId = typeof oid === 'object' ? oid.id : oid;
    }

    const users = await prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, officeId: true },
        orderBy: { name: 'asc' },
    });

    res.status(200).json({ success: true, data: users });
});

/**
 * @desc    Import assets from CSV
 * @route   POST /api/assets/import
 * @access  MANAGER, SUPER_ADMIN
 */
exports.importAssets = asyncHandler(async (req, res, next) => {
    const { csvData } = req.body;
    if (!csvData || typeof csvData !== 'string') return next(new AppError('CSV data is required', 400));

    const lines = csvData.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return next(new AppError('CSV must have a header row and at least one data row', 400));

    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));

    const results = { created: 0, errors: [] };

    const targetOfficeId = req.user.office?.id || req.user.officeId || req.body.officeId;
    const resolvedOfficeId = typeof targetOfficeId === 'object' ? targetOfficeId.id : targetOfficeId;

    for (let i = 1; i < lines.length; i++) {
        try {
            const values = [];
            let current = '', inQuotes = false;
            for (const char of lines[i]) {
                if (char === '"') { inQuotes = !inQuotes; }
                else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
                else { current += char; }
            }
            values.push(current.trim());

            const row = {};
            headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

            const assetName = row['name'] || row['asset name'];
            if (!assetName) {
                results.errors.push({ row: i + 1, error: 'Name is required' });
                continue;
            }

            const guai = await generateGUAI(resolvedOfficeId);

            await prisma.asset.create({
                data: {
                    guai,
                    name: assetName,
                    category: (row['category'] || 'OTHER').toUpperCase(),
                    status: (row['status'] || 'ACTIVE').toUpperCase(),
                    serialNumber: row['serial number'] || row['serialnumber'] || null,
                    manufacturer: row['manufacturer'] || null,
                    model: row['model'] || null,
                    purchasePrice: parseFloat(row['purchase price'] || row['cost'] || '0') || 0,
                    currency: row['currency'] || 'INR',
                    purchaseDate: row['purchase date'] ? new Date(row['purchase date']) : new Date(),
                    building: row['building'] || null,
                    floor: row['floor'] || null,
                    room: row['room'] || null,
                    officeId: resolvedOfficeId,
                    createdById: req.user.id,
                    notes: row['notes'] || null,
                },
            });
            results.created++;
        } catch (err) {
            results.errors.push({ row: i + 1, error: err.message });
        }
    }

    res.status(200).json({
        success: true,
        message: `${results.created} assets imported successfully`,
        data: results,
    });
});

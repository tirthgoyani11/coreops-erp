const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const QRCode = require('qrcode');
const logger = require('../utils/logger');
const { convertCurrency } = require('../utils/currencyConverter');
const aiService = require('../services/aiService');

const LIFECYCLE_STATES = [
    'REQUESTED',
    'PROCURED',
    'RECEIVED',
    'ACTIVE',
    'UNDER_MAINTENANCE',
    'IMPAIRED',
    'RETIRED',
    'DISPOSED',
];

const LIFECYCLE_TRANSITIONS = {
    REQUESTED: ['PROCURED'],
    PROCURED: ['RECEIVED'],
    RECEIVED: ['ACTIVE'],
    ACTIVE: ['UNDER_MAINTENANCE', 'IMPAIRED', 'RETIRED', 'DISPOSED'],
    UNDER_MAINTENANCE: ['ACTIVE', 'IMPAIRED', 'RETIRED', 'DISPOSED'],
    IMPAIRED: ['UNDER_MAINTENANCE', 'RETIRED', 'DISPOSED'],
    RETIRED: ['DISPOSED'],
    DISPOSED: [],
};

function tryParseLifecycleNote(notes) {
    if (!notes || typeof notes !== 'string') return null;
    if (!notes.startsWith('LIFECYCLE|')) return null;
    const raw = notes.slice('LIFECYCLE|'.length);
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.to === 'string') {
            return parsed;
        }
    } catch {
        return null;
    }
    return null;
}

function mapLifecycleToAssetStatus(state) {
    switch (state) {
        case 'UNDER_MAINTENANCE':
        case 'IMPAIRED':
            return 'MAINTENANCE';
        case 'RETIRED':
            return 'RETIRED';
        case 'DISPOSED':
            return 'SOLD';
        case 'ACTIVE':
            return 'ACTIVE';
        default:
            return null;
    }
}

async function resolveCurrentLifecycleState(asset) {
    const latestLifecycle = (asset.maintenanceHistory || [])
        .map((h) => tryParseLifecycleNote(h.notes))
        .filter(Boolean)[0];

    if (latestLifecycle?.to) return latestLifecycle.to;

    if (asset.status === 'SOLD' || asset.status === 'DECOMMISSIONED') return 'DISPOSED';
    if (asset.status === 'RETIRED' || asset.status === 'LOST') return 'RETIRED';
    if (asset.status === 'MAINTENANCE') return 'UNDER_MAINTENANCE';

    const linkedPO = asset.purchaseOrderNumber
        ? await prisma.purchaseOrder.findFirst({
            where: {
                poNumber: asset.purchaseOrderNumber,
                ...(asset.officeId ? { officeId: asset.officeId } : {}),
            },
            select: { id: true },
        })
        : null;

    if (!linkedPO) return 'REQUESTED';

    const grnCount = await prisma.goodsReceipt.count({ where: { purchaseOrderId: linkedPO.id } });
    if (grnCount > 0) return 'RECEIVED';

    return 'PROCURED';
}

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

async function resolveHeadquarterCurrency(officeId) {
    try {
        if (!officeId) return 'INR';

        const office = await prisma.office.findUnique({
            where: { id: officeId },
            select: {
                id: true,
                type: true,
                baseCurrency: true,
                parent: { select: { id: true, baseCurrency: true, type: true } },
            },
        });

        if (!office) return 'INR';
        if (office.type === 'HEADQUARTERS') return (office.baseCurrency || 'INR').toUpperCase();
        if (office.parent?.baseCurrency) return String(office.parent.baseCurrency).toUpperCase();

        const hq = await prisma.office.findFirst({
            where: { type: 'HEADQUARTERS', isActive: true },
            select: { baseCurrency: true },
            orderBy: { createdAt: 'asc' },
        });

        return (hq?.baseCurrency || office.baseCurrency || 'INR').toUpperCase();
    } catch {
        return 'INR';
    }
}

async function buildDualCurrencySnapshot({ amount, officeCurrency, officeId, displayCurrency }) {
    const safeAmount = Number(amount || 0);
    const officeCur = String(officeCurrency || 'INR').toUpperCase();
    const hqCurrency = await resolveHeadquarterCurrency(officeId);

    let hqAmount = safeAmount;
    let hqRate = 1;
    if (safeAmount && officeCur !== hqCurrency) {
        try {
            hqAmount = await convertCurrency(safeAmount, officeCur, hqCurrency);
            hqRate = await convertCurrency(1, officeCur, hqCurrency);
        } catch {
            hqAmount = safeAmount;
            hqRate = 1;
        }
    }

    const effectiveDisplayCurrency = String(displayCurrency || officeCur).toUpperCase();
    let displayAmount = safeAmount;
    if (safeAmount && officeCur !== effectiveDisplayCurrency) {
        try {
            displayAmount = await convertCurrency(safeAmount, officeCur, effectiveDisplayCurrency);
        } catch {
            displayAmount = safeAmount;
        }
    }

    return {
        officeCurrency: officeCur,
        officeAmount: Number(safeAmount.toFixed(2)),
        hqCurrency,
        hqAmount: Number(Number(hqAmount || 0).toFixed(2)),
        hqRate: Number(Number(hqRate || 1).toFixed(6)),
        displayCurrency: effectiveDisplayCurrency,
        displayAmount: Number(Number(displayAmount || 0).toFixed(2)),
        convertedAt: new Date().toISOString(),
    };
}

async function writeAssetFinanceLog({
    asset,
    officeId,
    userId,
    actionType,
    description,
}) {
    try {
        const snapshot = await buildDualCurrencySnapshot({
            amount: asset.purchasePrice,
            officeCurrency: asset.currency,
            officeId,
            displayCurrency: 'INR',
        });

        await prisma.financeLog.create({
            data: {
                type: actionType,
                amount: Number(asset.purchasePrice || 0),
                currency: String(asset.currency || 'INR').toUpperCase(),
                officeId,
                recordedById: userId,
                referenceType: 'ASSET',
                referenceId: asset.id,
                description,
                metadata: {
                    guai: asset.guai,
                    name: asset.name,
                    purchaseOrderNumber: asset.purchaseOrderNumber || null,
                    invoiceNumber: asset.invoiceNumber || null,
                    valuation: snapshot,
                },
            },
        });
    } catch (error) {
        logger.warn(`Failed to persist asset finance log (${actionType}): ${error.message}`);
    }
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

    const office = await prisma.office.findUnique({
        where: { id: targetOfficeId },
        select: { id: true, baseCurrency: true },
    });

    if (!office) return next(new AppError('Office not found', 404));

    // Office is the source of truth for asset currency to keep each office on one currency system.
    const effectiveCurrency = (office.baseCurrency || 'INR').toUpperCase();

    // Validate unique serial number
    if (serialNumber) {
        const existing = await prisma.asset.findFirst({ where: { serialNumber } });
        if (existing) {
            return next(new AppError(`Asset with serial number "${serialNumber}" already exists (${existing.guai})`, 409));
        }
    }

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
            currency: effectiveCurrency,
            purchaseOrderNumber,
            invoiceNumber,
            warrantyStart: warrantyStartDate ? new Date(warrantyStartDate) : null,
            warrantyEnd: warrantyEndDate ? new Date(warrantyEndDate) : null,
            building: locationBuilding,
            floor: locationFloor,
            room: locationRoom,
            vendorId: vendor || undefined,
            officeId: targetOfficeId,
            status: status || 'ACTIVE',
            currentBookValue: Number(purchaseCost) || 0,
            createdById: req.user.id,
        },
    });

    // Generate QR Code
    try {
        const qrData = `${process.env.FRONTEND_URL || 'https://coreops.tirthgoyani.in'}/assets/${asset.id}`;
        const qrCode = await QRCode.toDataURL(qrData);
        asset = await prisma.asset.update({ where: { id: asset.id }, data: { qrCode } });
    } catch (qrError) {
        logger.error('Failed to generate QR code:', qrError);
    }

    await writeAssetFinanceLog({
        asset,
        officeId: targetOfficeId,
        userId: req.user.id,
        actionType: 'ASSET_CAPEX',
        description: `Asset ${asset.guai} created with purchase value ${asset.purchasePrice} ${asset.currency}`,
    });

    const valuation = await buildDualCurrencySnapshot({
        amount: asset.purchasePrice,
        officeCurrency: asset.currency,
        officeId: targetOfficeId,
        displayCurrency: req.user.role === 'SUPER_ADMIN' ? 'INR' : asset.currency,
    });

    res.status(201).json({
        success: true,
        message: 'Asset created successfully',
        data: {
            ...asset,
            valuation,
        },
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
                office: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true,
                        baseCurrency: true,
                        parent: { select: { id: true, name: true, code: true, baseCurrency: true } },
                    },
                },
                createdBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.asset.count({ where }),
    ]);

    const enrichedAssets = await Promise.all(
        assets.map(async (asset) => {
            const displayCurrency = req.user.role === 'SUPER_ADMIN'
                ? 'INR'
                : (asset.office?.baseCurrency || asset.currency || 'INR');

            const valuation = await buildDualCurrencySnapshot({
                amount: asset.purchasePrice,
                officeCurrency: asset.currency || asset.office?.baseCurrency,
                officeId: asset.officeId,
                displayCurrency,
            });

            return {
                ...asset,
                valuation,
            };
        })
    );

    res.status(200).json({
        success: true,
        count: enrichedAssets.length,
        pagination: { page, limit, totalPages: Math.ceil(total / limit), totalResults: total },
        data: enrichedAssets,
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
            office: { select: { id: true, name: true, code: true, country: true, baseCurrency: true } },
            createdBy: { select: { id: true, name: true, email: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
            maintenanceHistory: { orderBy: { date: 'desc' }, take: 20 },
            maintenanceTickets: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
    });

    if (!asset) return next(new AppError('Asset not found', 404));

    // Office isolation
    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
        const userOfficeId = req.user.office?.id || req.user.officeId;
        if (asset.officeId !== (typeof userOfficeId === 'object' ? userOfficeId.id : userOfficeId)) {
            return next(new AppError('Access denied to this asset', 403));
        }

        // Keep office-scoped views consistent with office currency (legacy records may have stale codes).
        const officeCurrency = (asset.office?.baseCurrency || 'INR').toUpperCase();
        asset.currency = officeCurrency;
    }

    const [linkedPO, linkedInvoice, latestFinanceLog] = await Promise.all([
        asset.purchaseOrderNumber
            ? prisma.purchaseOrder.findFirst({
                where: {
                    poNumber: asset.purchaseOrderNumber,
                    ...(asset.officeId ? { officeId: asset.officeId } : {}),
                },
                select: {
                    id: true,
                    poNumber: true,
                    status: true,
                    totalAmount: true,
                    currency: true,
                    createdAt: true,
                },
            })
            : Promise.resolve(null),
        asset.invoiceNumber
            ? prisma.invoice.findFirst({
                where: {
                    invoiceNumber: asset.invoiceNumber,
                    ...(asset.officeId ? { officeId: asset.officeId } : {}),
                },
                select: {
                    id: true,
                    invoiceNumber: true,
                    status: true,
                    totalAmount: true,
                    currency: true,
                    dueDate: true,
                },
            })
            : Promise.resolve(null),
        prisma.financeLog.findFirst({
            where: { referenceType: 'ASSET', referenceId: asset.id },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                type: true,
                amount: true,
                currency: true,
                createdAt: true,
                metadata: true,
            },
        }),
    ]);

    const viewerDisplayCurrency = req.user.role === 'SUPER_ADMIN'
        ? 'INR'
        : (asset.office?.baseCurrency || asset.currency || 'INR');
    const valuation = await buildDualCurrencySnapshot({
        amount: asset.purchasePrice,
        officeCurrency: asset.currency,
        officeId: asset.officeId,
        displayCurrency: viewerDisplayCurrency,
    });

    const workflow = {
        purchaseOrder: linkedPO,
        invoice: linkedInvoice,
        maintenance: {
            totalTickets: (asset.maintenanceTickets || []).length,
            openTickets: (asset.maintenanceTickets || []).filter((t) => !['COMPLETED', 'CLOSED', 'CANCELLED', 'REJECTED'].includes(String(t.status || '').toUpperCase())).length,
            lastTicket: (asset.maintenanceTickets || [])[0] || null,
        },
        finance: {
            latestLog: latestFinanceLog,
        },
    };

    res.status(200).json({
        success: true,
        data: {
            ...asset,
            valuation,
            workflow,
        },
    });
});

/**
 * @desc    Lookup asset by QR/barcode text (id, guai, serial number, URL)
 * @route   GET /api/assets/lookup?code=...
 * @access  ALL authenticated
 */
exports.lookupAsset = asyncHandler(async (req, res, next) => {
    const rawCode = String(req.query.code || '').trim();
    if (!rawCode) return next(new AppError('code query parameter is required', 400));

    const decodedCode = (() => {
        try {
            return decodeURIComponent(rawCode);
        } catch {
            return rawCode;
        }
    })();

    let parsed = decodedCode;
    const urlMatch = decodedCode.match(/\/assets\/([a-zA-Z0-9-]{10,})/i);
    if (urlMatch && urlMatch[1]) parsed = urlMatch[1];

    const guaiMatch = decodedCode.match(/\b([a-z]{2}-[a-z0-9]+-\d{3,})\b/i);
    if (guaiMatch && guaiMatch[1]) {
        parsed = guaiMatch[1];
    }

    parsed = String(parsed || '').replace(/[\u200B-\u200D\uFEFF\s]/g, '').trim();

    const candidates = Array.from(new Set([
        parsed,
        parsed.toUpperCase(),
        parsed.toLowerCase(),
    ].filter(Boolean)));

    const whereOr = [];
    for (const c of candidates) {
        whereOr.push({ id: c });
        whereOr.push({ guai: { equals: c, mode: 'insensitive' } });
        whereOr.push({ serialNumber: { equals: c, mode: 'insensitive' } });
    }

    const asset = await prisma.asset.findFirst({
        where: { OR: whereOr },
        include: {
            office: { select: { id: true, name: true, code: true, baseCurrency: true } },
            assignedTo: { select: { id: true, name: true, role: true } },
            maintenanceHistory: { orderBy: { date: 'desc' }, take: 10 },
            maintenanceTickets: {
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: {
                    assignedTo: { select: { id: true, name: true } },
                    requestedBy: { select: { id: true, name: true } },
                },
            },
        },
    });

    if (!asset) return next(new AppError('Asset not found for provided code', 404));

    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
        const userOfficeId = req.user.office?.id || req.user.officeId;
        const resolvedUserOfficeId = typeof userOfficeId === 'object' ? userOfficeId.id : userOfficeId;
        if (asset.officeId !== resolvedUserOfficeId) {
            return next(new AppError('Access denied to this asset', 403));
        }
    }

    const activeTicket = (asset.maintenanceTickets || []).find(
        (t) => !['COMPLETED', 'CLOSED', 'CANCELLED', 'REJECTED'].includes(String(t.status || '').toUpperCase())
    );

    res.status(200).json({
        success: true,
        data: {
            asset,
            scanCode: rawCode,
            normalizedCode: parsed,
            actions: {
                canViewHistory: true,
                canCreateMaintenance: true,
                canReportIssue: true,
                activeTicketId: activeTicket?.id || null,
            },
        },
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

    if (purchaseCost !== undefined || currency !== undefined || purchaseOrderNumber !== undefined || invoiceNumber !== undefined) {
        await writeAssetFinanceLog({
            asset,
            officeId: asset.officeId,
            userId: req.user.id,
            actionType: 'ASSET_VALUATION_UPDATE',
            description: `Asset ${asset.guai} financial details updated`,
        });
    }

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
        data: {
            ...asset,
            valuation: await buildDualCurrencySnapshot({
                amount: asset.purchasePrice,
                officeCurrency: asset.currency,
                officeId: asset.officeId,
                displayCurrency: req.user.role === 'SUPER_ADMIN' ? 'INR' : asset.currency,
            }),
        },
    });
});

/**
 * @desc    AI-powered asset workflow insights
 * @route   GET /api/assets/:id/insights
 * @access  ALL authenticated
 */
exports.getAssetInsights = asyncHandler(async (req, res, next) => {
    const asset = await prisma.asset.findUnique({
        where: { id: req.params.id },
        include: {
            office: { select: { id: true, name: true, code: true, baseCurrency: true } },
            maintenanceTickets: { orderBy: { createdAt: 'desc' }, take: 15 },
            maintenanceHistory: { orderBy: { date: 'desc' }, take: 20 },
        },
    });

    if (!asset) return next(new AppError('Asset not found', 404));

    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
        const userOfficeId = req.user.office?.id || req.user.officeId;
        const resolvedUserOfficeId = typeof userOfficeId === 'object' ? userOfficeId.id : userOfficeId;
        if (asset.officeId !== resolvedUserOfficeId) {
            return next(new AppError('Access denied to this asset', 403));
        }
    }

    const openTickets = (asset.maintenanceTickets || []).filter((t) => !['COMPLETED', 'CLOSED', 'CANCELLED', 'REJECTED'].includes(String(t.status || '').toUpperCase()));
    const lifetimeMaintenanceCost = (asset.maintenanceHistory || []).reduce((sum, h) => sum + Number(h.cost || 0), 0);
    const maintenanceEvents = (asset.maintenanceHistory || []).length;
    const repairRatio = asset.purchasePrice > 0 ? (lifetimeMaintenanceCost / asset.purchasePrice) : 0;

    const fallback = {
        healthScore: Math.max(0, Math.min(100, Math.round(100 - (repairRatio * 35) - (openTickets.length * 10)))),
        summary: `Asset ${asset.guai} has ${openTickets.length} open ticket(s) and maintenance spend of ${lifetimeMaintenanceCost.toFixed(2)} ${asset.currency}.`,
        actions: [
            openTickets.length > 0
                ? `Prioritize closure of ${openTickets.length} open maintenance ticket(s) for ${asset.guai}.`
                : `No active ticket backlog for ${asset.guai}; keep preventive schedule active.`,
            repairRatio >= 0.5
                ? 'Repair-to-purchase ratio is high; evaluate replacement CAPEX case.'
                : 'Repair ratio is within acceptable band; continue corrective+preventive mix.',
            'Ensure invoice and PO references are attached for finance traceability.',
        ],
    };

    let ai = null;
    try {
        const prompt = `You are an ERP asset operations analyst. Return strict JSON only.
Data:\n${JSON.stringify({
            guai: asset.guai,
            category: asset.category,
            office: asset.office,
            purchasePrice: asset.purchasePrice,
            currency: asset.currency,
            openTickets: openTickets.map((t) => ({ ticketNumber: t.ticketNumber, status: t.status, priority: t.priority })),
            maintenanceEvents,
            lifetimeMaintenanceCost,
            repairRatio,
        }, null, 2)}
Schema:\n{\n  \"healthScore\": number,\n  \"summary\": \"string max 180 chars\",\n  \"actions\": [\"string\",\"string\",\"string\"]\n}\nRules:\n- healthScore between 0 and 100\n- actions should be practical and short\n- no markdown`;

        const result = await aiService.generateJSON('planning', prompt, { temperature: 0.2, maxTokens: 500 });
        if (result?.parsed && typeof result.parsed === 'object') {
            ai = result.parsed;
        }
    } catch {
        ai = null;
    }

    const data = {
        source: ai ? 'ai+rules' : 'rules',
        healthScore: Number.isFinite(Number(ai?.healthScore))
            ? Math.max(0, Math.min(100, Math.round(Number(ai.healthScore))))
            : fallback.healthScore,
        summary: typeof ai?.summary === 'string' && ai.summary.trim().length > 0
            ? ai.summary.trim().slice(0, 180)
            : fallback.summary,
        actions: Array.isArray(ai?.actions) && ai.actions.length > 0
            ? ai.actions.slice(0, 4)
            : fallback.actions,
        metrics: {
            openTickets: openTickets.length,
            maintenanceEvents,
            lifetimeMaintenanceCost: Number(lifetimeMaintenanceCost.toFixed(2)),
            repairRatio: Number(repairRatio.toFixed(3)),
            currency: asset.currency,
        },
        generatedAt: new Date().toISOString(),
    };

    res.status(200).json({ success: true, data });
});

/**
 * @desc    Get asset workflow timeline across procurement, finance and maintenance
 * @route   GET /api/assets/:id/workflow-timeline
 * @access  ALL authenticated
 */
exports.getAssetWorkflowTimeline = asyncHandler(async (req, res, next) => {
    const asset = await prisma.asset.findUnique({
        where: { id: req.params.id },
        include: {
            office: { select: { id: true, name: true, code: true, baseCurrency: true } },
            maintenanceHistory: { orderBy: { date: 'desc' }, take: 50 },
            maintenanceTickets: {
                orderBy: { createdAt: 'desc' },
                take: 25,
                include: { assignedTo: { select: { id: true, name: true } } },
            },
        },
    });

    if (!asset) return next(new AppError('Asset not found', 404));

    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
        const userOfficeId = req.user.office?.id || req.user.officeId;
        const resolvedUserOfficeId = typeof userOfficeId === 'object' ? userOfficeId.id : userOfficeId;
        if (asset.officeId !== resolvedUserOfficeId) {
            return next(new AppError('Access denied to this asset', 403));
        }
    }

    const [po, invoice, financeLogs] = await Promise.all([
        asset.purchaseOrderNumber
            ? prisma.purchaseOrder.findFirst({
                where: {
                    poNumber: asset.purchaseOrderNumber,
                    ...(asset.officeId ? { officeId: asset.officeId } : {}),
                },
                include: {
                    goodsReceipts: {
                        select: { id: true, grnNumber: true, status: true, receivedDate: true, createdAt: true },
                        orderBy: { createdAt: 'asc' },
                    },
                },
            })
            : Promise.resolve(null),
        asset.invoiceNumber
            ? prisma.invoice.findFirst({
                where: {
                    invoiceNumber: asset.invoiceNumber,
                    ...(asset.officeId ? { officeId: asset.officeId } : {}),
                },
                select: { id: true, invoiceNumber: true, status: true, totalAmount: true, currency: true, createdAt: true },
            })
            : Promise.resolve(null),
        prisma.financeLog.findMany({
            where: {
                referenceType: 'ASSET',
                referenceId: asset.id,
            },
            orderBy: { createdAt: 'asc' },
            take: 60,
        }),
    ]);

    const timeline = [];

    timeline.push({
        id: `asset-created-${asset.id}`,
        stage: 'REQUESTED',
        module: 'ASSET',
        timestamp: asset.createdAt,
        title: `Asset requested: ${asset.guai}`,
        details: {
            name: asset.name,
            category: asset.category,
            office: asset.office?.name,
        },
    });

    if (po) {
        timeline.push({
            id: `po-${po.id}`,
            stage: 'PROCURED',
            module: 'PROCUREMENT',
            timestamp: po.createdAt,
            title: `Purchase order linked: ${po.poNumber}`,
            details: {
                status: po.status,
                totalAmount: po.totalAmount,
                currency: po.currency,
            },
        });

        for (const grn of po.goodsReceipts || []) {
            timeline.push({
                id: `grn-${grn.id}`,
                stage: 'RECEIVED',
                module: 'PROCUREMENT',
                timestamp: grn.receivedDate || grn.createdAt,
                title: `Goods receipt: ${grn.grnNumber}`,
                details: {
                    status: grn.status,
                },
            });
        }
    }

    if (invoice) {
        timeline.push({
            id: `invoice-${invoice.id}`,
            stage: 'CAPITALIZED',
            module: 'FINANCE',
            timestamp: invoice.createdAt,
            title: `Invoice linked: ${invoice.invoiceNumber}`,
            details: {
                status: invoice.status,
                totalAmount: invoice.totalAmount,
                currency: invoice.currency,
            },
        });
    }

    for (const ticket of asset.maintenanceTickets || []) {
        timeline.push({
            id: `ticket-${ticket.id}`,
            stage: 'UNDER_MAINTENANCE',
            module: 'MAINTENANCE',
            timestamp: ticket.createdAt,
            title: `Maintenance ticket: ${ticket.ticketNumber}`,
            details: {
                status: ticket.status,
                priority: ticket.priority,
                assignedTo: ticket.assignedTo?.name || null,
            },
        });
    }

    for (const log of financeLogs || []) {
        timeline.push({
            id: `finlog-${log.id}`,
            stage: 'FINANCE_EVENT',
            module: 'FINANCE',
            timestamp: log.createdAt,
            title: `Finance event: ${log.type}`,
            details: {
                amount: log.amount,
                currency: log.currency,
                description: log.description,
                metadata: log.metadata,
            },
        });
    }

    const lifecycleEvents = (asset.maintenanceHistory || [])
        .map((h) => {
            const parsed = tryParseLifecycleNote(h.notes);
            if (!parsed) return null;
            return {
                id: `lifecycle-${h.id}`,
                stage: parsed.to,
                module: 'LIFECYCLE',
                timestamp: h.date,
                title: `Lifecycle transition: ${parsed.from || 'N/A'} -> ${parsed.to}`,
                details: {
                    reason: parsed.reason || null,
                    changedBy: parsed.changedBy || null,
                    idempotencyKey: parsed.idempotencyKey || null,
                },
            };
        })
        .filter(Boolean);

    timeline.push(...lifecycleEvents);
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const currentState = await resolveCurrentLifecycleState(asset);

    res.status(200).json({
        success: true,
        data: {
            assetId: asset.id,
            guai: asset.guai,
            currentLifecycleState: currentState,
            allowedNextStates: LIFECYCLE_TRANSITIONS[currentState] || [],
            timeline,
        },
    });
});

/**
 * @desc    Transition asset lifecycle state with strict transition validation
 * @route   PATCH /api/assets/:id/lifecycle
 * @access  MANAGER, SUPER_ADMIN
 */
exports.transitionAssetLifecycle = asyncHandler(async (req, res, next) => {
    const requestedState = String(req.body.toState || '').toUpperCase().trim();
    const reason = String(req.body.reason || '').trim();
    const idempotencyKey = String(
        req.body.idempotencyKey || req.headers['x-idempotency-key'] || ''
    ).trim();

    if (!requestedState || !LIFECYCLE_STATES.includes(requestedState)) {
        return next(new AppError(`Invalid lifecycle state. Allowed: ${LIFECYCLE_STATES.join(', ')}`, 400));
    }

    const asset = await prisma.asset.findUnique({
        where: { id: req.params.id },
        include: {
            maintenanceHistory: {
                where: { type: 'LIFECYCLE' },
                orderBy: { date: 'desc' },
                take: 20,
            },
        },
    });

    if (!asset) return next(new AppError('Asset not found', 404));

    if (req.user.role !== 'SUPER_ADMIN') {
        const userOfficeId = req.user.office?.id || req.user.officeId;
        if (asset.officeId !== (typeof userOfficeId === 'object' ? userOfficeId.id : userOfficeId)) {
            return next(new AppError('Access denied to this asset', 403));
        }
    }

    if (idempotencyKey) {
        const existing = await prisma.settings.findUnique({
            where: { key: `asset_lifecycle_idempotency:${asset.id}:${idempotencyKey}` },
        });
        if (existing?.value) {
            return res.status(200).json({ success: true, data: existing.value, replayed: true });
        }
    }

    const currentState = await resolveCurrentLifecycleState(asset);
    const allowedTransitions = LIFECYCLE_TRANSITIONS[currentState] || [];

    if (!allowedTransitions.includes(requestedState)) {
        return next(new AppError(`Invalid transition: ${currentState} -> ${requestedState}`, 400));
    }

    const mappedStatus = mapLifecycleToAssetStatus(requestedState);

    const updatedAsset = await prisma.asset.update({
        where: { id: asset.id },
        data: mappedStatus ? { status: mappedStatus } : {},
    });

    const lifecyclePayload = {
        from: currentState,
        to: requestedState,
        reason: reason || null,
        changedBy: req.user.id,
        idempotencyKey: idempotencyKey || null,
        changedAt: new Date().toISOString(),
    };

    await Promise.all([
        prisma.assetMaintenanceHistory.create({
            data: {
                assetId: asset.id,
                type: 'LIFECYCLE',
                notes: `LIFECYCLE|${JSON.stringify(lifecyclePayload)}`,
            },
        }),
        prisma.financeLog.create({
            data: {
                type: 'ASSET_LIFECYCLE',
                amount: Number(updatedAsset.purchasePrice || 0),
                currency: String(updatedAsset.currency || 'INR').toUpperCase(),
                description: `Lifecycle transition ${currentState} -> ${requestedState} for ${updatedAsset.guai}`,
                referenceType: 'ASSET',
                referenceId: updatedAsset.id,
                officeId: updatedAsset.officeId,
                recordedById: req.user.id,
                metadata: lifecyclePayload,
            },
        }),
    ]);

    const response = {
        assetId: updatedAsset.id,
        guai: updatedAsset.guai,
        fromState: currentState,
        toState: requestedState,
        mappedAssetStatus: mappedStatus || updatedAsset.status,
        allowedNextStates: LIFECYCLE_TRANSITIONS[requestedState] || [],
        transitionedAt: lifecyclePayload.changedAt,
    };

    if (idempotencyKey) {
        await prisma.settings.upsert({
            where: { key: `asset_lifecycle_idempotency:${asset.id}:${idempotencyKey}` },
            update: { value: response },
            create: { key: `asset_lifecycle_idempotency:${asset.id}:${idempotencyKey}`, value: response },
        });
    }

    res.status(200).json({ success: true, message: 'Lifecycle state updated', data: response });
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
    let displayCurrency = 'INR';

    if (req.user.role !== 'SUPER_ADMIN') {
        const oid = req.user.office?.id || req.user.officeId;
        where.officeId = typeof oid === 'object' ? oid.id : oid;

        const officeCurrency = req.user.office?.baseCurrency;
        if (officeCurrency) {
            displayCurrency = officeCurrency.toUpperCase();
        } else if (where.officeId) {
            const office = await prisma.office.findUnique({
                where: { id: where.officeId },
                select: { baseCurrency: true },
            });
            displayCurrency = (office?.baseCurrency || 'INR').toUpperCase();
        }
    }

    const [total, active, maintenance, retired, assetsForValue] = await Promise.all([
        prisma.asset.count({ where }),
        prisma.asset.count({ where: { ...where, status: 'ACTIVE' } }),
        prisma.asset.count({ where: { ...where, status: 'MAINTENANCE' } }),
        prisma.asset.count({ where: { ...where, status: { in: ['RETIRED', 'LOST', 'SOLD', 'DECOMMISSIONED'] } } }),
        prisma.asset.findMany({
            where,
            select: { purchasePrice: true, currency: true },
        }),
    ]);

    const convertedValues = req.user.role !== 'SUPER_ADMIN'
        // Office-scoped totals should stay in one office currency system.
        ? assetsForValue.map((asset) => Number(asset.purchasePrice || 0))
        : await Promise.all(
            assetsForValue.map(async (asset) => {
                const amount = Number(asset.purchasePrice || 0);
                const fromCurrency = (asset.currency || 'INR').toUpperCase();

                if (!amount || fromCurrency === displayCurrency) {
                    return amount;
                }

                try {
                    return await convertCurrency(amount, fromCurrency, displayCurrency);
                } catch (error) {
                    logger.warn(`Currency conversion failed (${fromCurrency} -> ${displayCurrency}), using raw value: ${amount}`);
                    return amount;
                }
            })
        );

    const totalValue = convertedValues.reduce((sum, value) => sum + Number(value || 0), 0);

    res.status(200).json({
        success: true,
        data: {
            total,
            active,
            maintenance,
            retired,
            totalValue: Number(totalValue.toFixed(2)),
            currency: displayCurrency,
        },
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

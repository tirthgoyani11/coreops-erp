const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const storageService = require('../services/storageService');

/**
 * Document Controller (Prisma)
 */

// GET /api/documents
exports.getDocuments = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, category, search, linkedAsset, linkedTicket } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { isArchived: false };

    // Office scoping
    if (req.user.role !== 'SUPER_ADMIN' && req.user.officeId) {
        const oid = typeof req.user.officeId === 'object' ? req.user.officeId.id : req.user.officeId;
        where.OR = [{ officeId: oid }, { officeId: null }];
    }

    if (category) where.category = category;
    if (linkedAsset) where.linkedAssetId = linkedAsset;
    if (linkedTicket) where.linkedTicketId = linkedTicket;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [documents, total] = await Promise.all([
        prisma.document.findMany({
            where,
            include: {
                uploadedBy: { select: { id: true, name: true, email: true } },
                office: { select: { id: true, name: true } },
                linkedAsset: { select: { id: true, name: true, guai: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit),
        }),
        prisma.document.count({ where }),
    ]);

    res.json({
        success: true,
        data: documents,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
});

// GET /api/documents/:id
exports.getDocument = asyncHandler(async (req, res, next) => {
    const document = await prisma.document.findUnique({
        where: { id: req.params.id },
        include: {
            uploadedBy: { select: { id: true, name: true, email: true } },
            office: { select: { id: true, name: true } },
            linkedAsset: { select: { id: true, name: true, guai: true } },
        },
    });

    if (!document) return next(new AppError('Document not found', 404));

    res.json({ success: true, data: document });
});

// POST /api/documents/upload
exports.uploadDocuments = asyncHandler(async (req, res, next) => {
    if (!req.files || req.files.length === 0) return next(new AppError('Please upload at least one file', 400));

    const { category = 'GENERAL', tags, description, linkedAsset, linkedTicket } = req.body;
    const oid = req.user.office?.id || req.user.officeId;
    const resolvedOfficeId = typeof oid === 'object' ? oid.id : oid;

    const documents = [];

    for (const file of req.files) {
        const result = await storageService.upload(file, 'documents');

        const doc = await prisma.document.create({
            data: {
                name: req.body.name || file.originalname.replace(/\.[^/.]+$/, ''),
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                url: result.url,
                publicId: result.publicId || null,
                category,
                tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim().toLowerCase()) : tags) : [],
                description,
                officeId: resolvedOfficeId || null,
                uploadedById: req.user.id,
                linkedAssetId: linkedAsset || null,
                linkedTicketId: linkedTicket || null,
            },
        });

        documents.push(doc);
    }

    res.status(201).json({ success: true, message: `${documents.length} file(s) uploaded successfully`, data: documents });
});

// PUT /api/documents/:id
exports.updateDocument = asyncHandler(async (req, res, next) => {
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!document) return next(new AppError('Document not found', 404));

    const allowedFields = ['name', 'category', 'tags', 'description', 'linkedAssetId', 'linkedTicketId'];
    const updates = {};

    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            if (field === 'tags' && typeof req.body[field] === 'string') {
                updates[field] = req.body[field].split(',').map(t => t.trim().toLowerCase());
            } else {
                updates[field] = req.body[field];
            }
        }
    }

    // Handle legacy field names
    if (req.body.linkedAsset) updates.linkedAssetId = req.body.linkedAsset;
    if (req.body.linkedTicket) updates.linkedTicketId = req.body.linkedTicket;

    const updated = await prisma.document.update({
        where: { id: req.params.id },
        data: updates,
        include: {
            uploadedBy: { select: { id: true, name: true, email: true } },
            office: { select: { id: true, name: true } },
        },
    });

    res.json({ success: true, message: 'Document updated successfully', data: updated });
});

// DELETE /api/documents/:id
exports.deleteDocument = asyncHandler(async (req, res, next) => {
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!document) return next(new AppError('Document not found', 404));

    await storageService.delete(document.publicId || document.url);
    await prisma.document.delete({ where: { id: req.params.id } });

    res.json({ success: true, message: 'Document deleted successfully' });
});

// GET /api/documents/:id/download
exports.downloadDocument = asyncHandler(async (req, res, next) => {
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!document) return next(new AppError('Document not found', 404));

    if (document.url.startsWith('http')) return res.redirect(document.url);

    const path = require('path');
    const fs = require('fs');
    const filePath = path.join(__dirname, '../../uploads', document.url.replace('/uploads/', ''));

    if (!fs.existsSync(filePath)) return next(new AppError('File not found on server', 404));

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    fs.createReadStream(filePath).pipe(res);
});

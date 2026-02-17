const Document = require('../models/Document');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const storageService = require('../services/storageService');

/**
 * Document Controller
 * Handles file uploads, browsing, metadata updates, and downloads
 */

/**
 * @desc    List/search documents
 * @route   GET /api/documents
 * @access  Private
 */
exports.getDocuments = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        category,
        search,
        tags,
        linkedAsset,
        linkedTicket,
    } = req.query;

    const query = { isArchived: false };

    // Office scoping — SUPER_ADMIN sees all, others see their office
    if (req.user.role !== 'SUPER_ADMIN' && req.user.officeId) {
        query.$or = [
            { officeId: req.user.officeId },
            { officeId: null }, // Global documents
        ];
    }

    if (category) query.category = category;
    if (linkedAsset) query.linkedAsset = linkedAsset;
    if (linkedTicket) query.linkedTicket = linkedTicket;
    if (tags) {
        const tagArr = typeof tags === 'string' ? tags.split(',') : tags;
        query.tags = { $in: tagArr.map(t => t.trim().toLowerCase()) };
    }
    if (search) {
        query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [documents, total] = await Promise.all([
        Document.find(query)
            .populate('uploadedBy', 'name email')
            .populate('officeId', 'name')
            .populate('linkedAsset', 'name guai')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Document.countDocuments(query),
    ]);

    res.json({
        success: true,
        data: documents,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
        },
    });
});

/**
 * @desc    Get single document
 * @route   GET /api/documents/:id
 * @access  Private
 */
exports.getDocument = asyncHandler(async (req, res, next) => {
    const document = await Document.findById(req.params.id)
        .populate('uploadedBy', 'name email')
        .populate('officeId', 'name')
        .populate('linkedAsset', 'name guai')
        .populate('linkedTicket', 'title');

    if (!document) {
        return next(new AppError('Document not found', 404));
    }

    res.json({
        success: true,
        data: document,
    });
});

/**
 * @desc    Upload file(s)
 * @route   POST /api/documents/upload
 * @access  Private (SUPER_ADMIN, ADMIN, MANAGER, STAFF)
 */
exports.uploadDocuments = asyncHandler(async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        return next(new AppError('Please upload at least one file', 400));
    }

    const {
        category = 'GENERAL',
        tags,
        description,
        linkedAsset,
        linkedTicket,
    } = req.body;

    const documents = [];

    for (const file of req.files) {
        // Upload to storage (local or Cloudinary)
        const result = await storageService.upload(file, 'documents');

        const doc = await Document.create({
            name: req.body.name || file.originalname.replace(/\.[^/.]+$/, ''),
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            url: result.url,
            publicId: result.publicId,
            category,
            tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim().toLowerCase()) : tags) : [],
            description,
            officeId: req.user.officeId || null,
            uploadedBy: req.user._id,
            linkedAsset: linkedAsset || null,
            linkedTicket: linkedTicket || null,
        });

        documents.push(doc);
    }

    res.status(201).json({
        success: true,
        message: `${documents.length} file(s) uploaded successfully`,
        data: documents,
    });
});

/**
 * @desc    Update document metadata
 * @route   PUT /api/documents/:id
 * @access  Private
 */
exports.updateDocument = asyncHandler(async (req, res, next) => {
    const document = await Document.findById(req.params.id);

    if (!document) {
        return next(new AppError('Document not found', 404));
    }

    const allowedFields = ['name', 'category', 'tags', 'description', 'linkedAsset', 'linkedTicket'];
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

    const updated = await Document.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
    )
        .populate('uploadedBy', 'name email')
        .populate('officeId', 'name');

    res.json({
        success: true,
        message: 'Document updated successfully',
        data: updated,
    });
});

/**
 * @desc    Delete document
 * @route   DELETE /api/documents/:id
 * @access  Private (SUPER_ADMIN, ADMIN, MANAGER)
 */
exports.deleteDocument = asyncHandler(async (req, res, next) => {
    const document = await Document.findById(req.params.id);

    if (!document) {
        return next(new AppError('Document not found', 404));
    }

    // Delete file from storage
    await storageService.delete(document.publicId || document.url);

    // Remove from database
    await Document.findByIdAndDelete(req.params.id);

    res.json({
        success: true,
        message: 'Document deleted successfully',
    });
});

/**
 * @desc    Download/redirect to file
 * @route   GET /api/documents/:id/download
 * @access  Private
 */
exports.downloadDocument = asyncHandler(async (req, res, next) => {
    const document = await Document.findById(req.params.id);

    if (!document) {
        return next(new AppError('Document not found', 404));
    }

    // If Cloudinary URL, redirect
    if (document.url.startsWith('http')) {
        return res.redirect(document.url);
    }

    // Local file — stream it
    const path = require('path');
    const fs = require('fs');
    const filePath = path.join(__dirname, '../../uploads', document.url.replace('/uploads/', ''));

    if (!fs.existsSync(filePath)) {
        return next(new AppError('File not found on server', 404));
    }

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    fs.createReadStream(filePath).pipe(res);
});

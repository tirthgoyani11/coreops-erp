const prisma = require('../config/prisma');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const kaggleService = require('../services/kaggleInferenceService');
const { asyncHandler, AppError } = require('../utils/errorHandler');

// ─── Core OCR prompt ─────────────────────────────────────────────
const INVOICE_PROMPT = `You are an expert OCR assistant for an ERP system.
Extract ALL information from this invoice/document image and return ONLY a valid JSON object.

Required JSON schema:
{
  "invoiceNumber": "string or null",
  "date": "YYYY-MM-DD or null",
  "dueDate": "YYYY-MM-DD or null",
  "vendorName": "string or null",
  "vendorAddress": "string or null",
  "vendorGST": "string or null",
  "vendorPhone": "string or null",
  "vendorEmail": "string or null",
  "buyerName": "string or null",
  "buyerAddress": "string or null",
  "buyerGST": "string or null",
  "subtotal": number or null,
  "taxAmount": number or null,
  "taxRate": number or null,
  "discountAmount": number or null,
  "shippingAmount": number or null,
  "totalAmount": number or null,
  "currency": "INR",
  "paymentTerms": "string or null",
  "paymentMethod": "string or null",
  "notes": "string or null",
  "documentType": "INVOICE | RECEIPT | PURCHASE_ORDER | DELIVERY_NOTE | OTHER",
  "lineItems": [
    {
      "description": "string",
      "hsn": "string or null",
      "quantity": number,
      "unit": "string or null",
      "unitPrice": number,
      "discount": number or null,
      "taxPercent": number or null,
      "total": number
    }
  ],
  "confidenceScore": 0.0 to 1.0
}

Return ONLY the JSON. No explanation, no markdown.`;

// ─── Fallback text parser (used when AI vision is unavailable) ───
function parseTextFallback(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let invoiceNumber = null, date = null, vendorName = null, totalAmount = null;

    for (const line of lines) {
        if (!invoiceNumber && /inv(?:oice)?[\s#:.-]*([a-z0-9\-\/]+)/i.test(line)) {
            invoiceNumber = line.match(/inv(?:oice)?[\s#:.-]*([a-z0-9\-\/]+)/i)[1];
        }
        if (!date) {
            const m = line.match(/\b(\d{1,2}[\\/\-.]\d{1,2}[\\/\-.]\d{2,4})\b/) ||
                      line.match(/\b(\d{4}-\d{2}-\d{2})\b/);
            if (m) { try { date = new Date(m[1]).toISOString().split('T')[0]; } catch {} }
        }
        if (!totalAmount) {
            const m = line.match(/(?:total|grand\s*total|amount\s*due|net\s*amount)[^\d]*(\d[\d,]*\.?\d*)/i) ||
                      line.match(/[₹\$]\s*(\d[\d,]*\.?\d*)/);
            if (m) totalAmount = parseFloat(m[1].replace(/,/g, ''));
        }
        if (!vendorName && lines.indexOf(line) < 5 && line.length > 3) vendorName = line;
    }

    return { invoiceNumber, date, vendorName, totalAmount, lineItems: [], confidenceScore: 0.35, documentType: 'INVOICE' };
}

// ─────────────────────────────────────────────────────────────────
// POST /api/ocr/upload
// Accept: multipart/form-data with field "invoice"
// Context params: linkedAssetId, linkedTicketId, linkedPOId, linkedGRNId
// ─────────────────────────────────────────────────────────────────
exports.processInvoice = asyncHandler(async (req, res, next) => {
    if (!req.file) return next(new AppError('No file uploaded', 400));

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    let extractedData = {};
    let aiSource = 'none';

    try {
        // ── Tier 1: kaggle vision (Qwen2.5-VL) ──────────────────
        const imageBase64 = Buffer.from(fs.readFileSync(filePath)).toString('base64');
        const visionResult = await kaggleService.vision(imageBase64, INVOICE_PROMPT);

        if (visionResult?.text) {
            aiSource = visionResult.source || 'kaggle';
            try {
                const clean = visionResult.text.replace(/```json/gi, '').replace(/```/g, '').trim();
                extractedData = JSON.parse(clean);
                extractedData.confidenceScore = extractedData.confidenceScore || 0.85;
            } catch {
                // JSON parse failed — try regex on raw text
                extractedData = parseTextFallback(visionResult.text);
                aiSource = 'vision-fallback';
            }
        } else {
            // ── Tier 2: Tesseract.js local OCR ──────────────────
            try {
                const { createWorker } = require('tesseract.js');
                const worker = await createWorker('eng');
                const { data: { text } } = await worker.recognize(filePath);
                await worker.terminate();
                extractedData = parseTextFallback(text);
                extractedData.rawText = text;
                aiSource = 'tesseract';
            } catch {
                // ── Tier 3: Demo data ────────────────────────────
                extractedData = {
                    invoiceNumber: 'INV-' + Date.now().toString().slice(-6),
                    vendorName: 'Demo Vendor Corp',
                    date: new Date().toISOString().split('T')[0],
                    totalAmount: 1500.00,
                    taxAmount: 270.00,
                    taxRate: 18,
                    currency: 'INR',
                    documentType: 'INVOICE',
                    lineItems: [{ description: 'Professional Services', quantity: 1, unitPrice: 1500, total: 1500 }],
                    confidenceScore: 0.3,
                    note: 'Demo data — AI vision unavailable',
                };
                aiSource = 'demo';
            }
        }
    } catch (err) {
        logger.error('[OCR] Processing error:', err.message);
    }

    // ── Save to Document table for full system access ─────────────
    const oid = req.user?.officeId;
    const resolvedOfficeId = oid && typeof oid === 'object' ? oid.id : oid;

    // Build a permanent URL (serve via /uploads route)
    const fileUrl = `/uploads/invoices/${req.file.filename}`;

    let savedDocument = null;
    try {
        savedDocument = await prisma.document.create({
            data: {
                name: extractedData.invoiceNumber
                    ? `Invoice ${extractedData.invoiceNumber}` 
                    : `Invoice ${req.file.originalname.replace(/\.[^/.]+$/, '')}`,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
                path: fileUrl,
                category: 'INVOICE',
                tags: ['invoice', 'ocr', extractedData.vendorName?.toLowerCase().split(' ')[0] || 'vendor'].filter(Boolean),
                description: extractedData.vendorName
                    ? `Invoice from ${extractedData.vendorName} — ₹${extractedData.totalAmount || 0}`
                    : req.file.originalname,
                officeId: resolvedOfficeId || null,
                uploadedById: req.user.id,
                // Optional links
                linkedAssetId: req.body.linkedAssetId || null,
                linkedTicketId: req.body.linkedTicketId || null,
            },
        });
    } catch (dbErr) {
        logger.warn('[OCR] Could not save Document record:', dbErr.message);
    }

    // ── Try also match vendor in DB ───────────────────────────────
    let matchedVendor = null;
    if (extractedData.vendorName) {
        try {
            matchedVendor = await prisma.vendor.findFirst({
                where: { name: { contains: extractedData.vendorName.split(' ')[0], mode: 'insensitive' } },
                select: { id: true, name: true, email: true },
            });
        } catch {}
    }

    // Don't delete the file — it's stored as a document
    res.status(200).json({
        success: true,
        data: {
            extractedData,
            aiSource,
            documentId: savedDocument?.id,
            documentUrl: fileUrl,
            matchedVendor,
        },
    });
});

// ─────────────────────────────────────────────────────────────────
// GET /api/ocr/invoices
// List all saved invoice documents
// ─────────────────────────────────────────────────────────────────
exports.getInvoices = asyncHandler(async (req, res) => {
    const where = { category: 'INVOICE', isArchived: false };
    const oid = req.user?.officeId;
    if (req.user?.role !== 'SUPER_ADMIN' && oid) {
        const id = typeof oid === 'object' ? oid.id : oid;
        where.officeId = id;
    }

    const docs = await prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { uploadedBy: { select: { name: true } } },
    });

    res.json({ success: true, data: docs });
});

// ─────────────────────────────────────────────────────────────────
// GET /api/ocr/invoices/:id  — legacy support
// ─────────────────────────────────────────────────────────────────
exports.getInvoice = asyncHandler(async (req, res, next) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return next(new AppError('Document not found', 404));
    res.json({ success: true, data: doc });
});

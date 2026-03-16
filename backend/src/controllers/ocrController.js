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

// ─── Robust fallback text parser for Indian GST invoices ─────────
function parseTextFallback(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let invoiceNumber = null, date = null, vendorName = null, totalAmount = null;
    let gstNumber = null;

    for (const line of lines) {
        const lower = line.toLowerCase();

        // ─ Invoice Number ─
        // Matches: Inv.No.: INV-5, Invoice #456, GST 3425-26, Bill No 456
        if (!invoiceNumber) {
            const invPatterns = [
                // "Inv. No.: INV-5" or "Invoice No: 12345" — value after colon/space
                /inv(?:oice)?[\s.]*(?:no|#|number)[\s.:]+([a-z0-9][\w\-\/]+)/i,
                // "INV-123" or "Invoice 456" direct
                /inv(?:oice)?[\s#:\-]+([a-z0-9][\w\-\/]+)/i,
                /gst[\s#:.\-]*(\d[\d\-\/]+)/i,
                /bill[\s]*(?:no|#|number)?[\s.:]+([a-z0-9][\w\-\/]+)/i,
                /(?:voucher|memo|receipt|dc)[\s#:.\-]*([a-z0-9][\w\-\/]+)/i,
            ];
            for (const pat of invPatterns) {
                const m = line.match(pat);
                if (m && m[1] && m[1].length >= 2) {
                    // Filter out common false positives
                    if (!/^(original|duplicate|triplicate|for|the|tax|date|no|nos|number|bill|to|in)$/i.test(m[1])) {
                        invoiceNumber = m[1];
                        break;
                    }
                }
            }
        }

        // ─ Date — prefer lines with "date" keyword ─
        // Supports: 23-Jul-2025, 23/07/2025, 2025-07-23, July 23, 2025, 10-01-25
        if (!date || /inv.*date|date/i.test(lower)) {
            const datePatterns = [
                /\b(\d{1,2}[\s\-\/.]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/.,]*\d{2,4})\b/i,
                /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/.,]+\d{1,2}[\s,]*\d{2,4})\b/i,
                /\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\b/,
                /\b(\d{4}-\d{2}-\d{2})\b/,
            ];
            for (const pat of datePatterns) {
                const m = line.match(pat);
                if (m) {
                    try {
                        let raw = m[1];
                        // Handle 2-digit year: 10-01-25 → 10-01-2025
                        const twoDigitYear = raw.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2})$/);
                        if (twoDigitYear) {
                            const yr = parseInt(twoDigitYear[3]);
                            const fullYear = yr < 50 ? 2000 + yr : 1900 + yr;
                            raw = `${twoDigitYear[1]}/${twoDigitYear[2]}/${fullYear}`;
                        }
                        const parsed = new Date(raw.replace(/[\-\.]/g, '/'));
                        if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000 && parsed.getFullYear() < 2100) {
                            date = parsed.toISOString().split('T')[0];
                            if (/inv.*date|date/i.test(lower)) break;
                        }
                    } catch {}
                }
            }
        }

        // ─ GST Number ─
        if (!gstNumber) {
            const m = line.match(/\b(\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]{2})\b/);
            if (m) gstNumber = m[1];
        }

        // ─ Total Amount — prefer lines with total/grand keywords ─
        const isTotalLine = /total|grand|amount\s*due|net\s*(?:amount|payable)|payable|sub[\-\s]*total/i.test(lower);
        if (isTotalLine) {
            // Try colon-separated pattern first: "Total Amount : 38026.00"
            const colonMatch = line.match(/(?:total\s*(?:amount|amt)?|grand\s*total|net\s*(?:amount|payable))\s*[:=]?\s*([\d,]+\.?\d*)/i);
            if (colonMatch) {
                const val = parseFloat(colonMatch[1].replace(/,/g, ''));
                if (val > 0 && (!totalAmount || val > totalAmount)) totalAmount = val;
            } else {
                const amounts = line.match(/[\d,]+\.?\d*/g) || [];
                for (const raw of amounts) {
                    const val = parseFloat(raw.replace(/,/g, ''));
                    if (val > 100 && (!totalAmount || val > totalAmount)) {
                        totalAmount = val;
                    }
                }
            }
        }
    }

    // ── Fallback: if no total found, use the largest decimal amount ──
    if (!totalAmount) {
        let maxAmount = 0;
        const allAmounts = text.match(/[\d,]+\.\d{2}/g) || [];
        for (const amt of allAmounts) {
            const val = parseFloat(amt.replace(/,/g, ''));
            if (val > maxAmount) maxAmount = val;
        }
        if (maxAmount > 0) totalAmount = maxAmount;
    }

    // ── Smart Vendor Name extraction ─────────────────────────
    const noiseRe = /^(manufacturing|precision|supply|plot|road|tel\s|web\s|pan\s|gst|gstin|tax|invoice|original|duplicate|address|phone|e-?way|transport|place|challan|date|m\/s|total|igst|cgst|sgst|subject|our\s|goods|delivery|customer|thank|name\b|branch|acc|ifsc|upi|pay\s|\d)/i;

    // Check for "m/s" marker first
    for (let i = 0; i < Math.min(20, lines.length); i++) {
        if (/^m\/s\b/i.test(lines[i])) {
            vendorName = lines[i].replace(/^m\/s\s*/i, '').trim();
            break;
        }
    }

    // Otherwise find a clean company-like line in first 8 lines
    if (!vendorName) {
        for (let i = 0; i < Math.min(8, lines.length); i++) {
            const line = lines[i];
            if (line.length < 4 || noiseRe.test(line)) continue;
            if ((line.match(/\d/g) || []).length > line.length * 0.4) continue;
            vendorName = line.length > 60 ? line.substring(0, 60) : line;
            break;
        }
    }

    return {
        invoiceNumber, date, vendorName, totalAmount, gstNumber,
        lineItems: [],
        confidenceScore: invoiceNumber && date && totalAmount ? 0.65 : 0.35,
        documentType: 'INVOICE',
    };
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
                url: fileUrl,
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

const prisma = require('../config/prisma');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const kaggleService = require('../services/kaggleInferenceService');
const kimiService = require('../services/kimiService');
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

const HARD_OCR_PROMPT_SUFFIX = `

Hard-mode rules for difficult documents:
- Handle skewed, blurry, rotated, low-contrast, cropped, and multilingual invoices/receipts.
- Infer missing totals from line items when possible.
- Use null for unknown fields, never hallucinate.
- Always return complete schema fields and valid numeric types.
`;

function normalizeExtractedData(data = {}) {
    const normalized = {
        ...data,
        lineItems: Array.isArray(data.lineItems) ? data.lineItems : [],
    };

    const numericFields = ['subtotal', 'taxAmount', 'taxRate', 'discountAmount', 'shippingAmount', 'totalAmount', 'confidenceScore'];
    for (const field of numericFields) {
        if (normalized[field] !== undefined && normalized[field] !== null && normalized[field] !== '') {
            const num = Number(normalized[field]);
            normalized[field] = Number.isFinite(num) ? num : null;
        }
    }

    normalized.lineItems = normalized.lineItems.map((item) => {
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        const total = Number(item.total);
        return {
            ...item,
            quantity: Number.isFinite(quantity) ? quantity : 0,
            unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
            total: Number.isFinite(total) ? total : 0,
        };
    });

    if (!normalized.currency) normalized.currency = 'INR';
    if (!normalized.documentType) normalized.documentType = 'INVOICE';
    if (!Number.isFinite(normalized.confidenceScore)) normalized.confidenceScore = 0.5;

    return normalized;
}

function parseBooleanFlag(value, defaultValue = false) {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
    return defaultValue;
}

async function generateGUAI(officeId) {
    const office = await prisma.office.findUnique({
        where: { id: officeId },
        select: { countryCode: true, locationCode: true, code: true },
    });

    const countryCode = office?.countryCode || 'IN';
    const locationCode = office?.locationCode || office?.code || 'HQ';

    const counter = await prisma.counter.upsert({
        where: { name: 'asset_guai' },
        update: { sequence: { increment: 1 } },
        create: { name: 'asset_guai', prefix: 'GUAI', sequence: 1 },
    });

    const seq = String(counter.sequence).padStart(6, '0');
    return `${countryCode}-${locationCode}-${seq}`;
}

function mapAssetCategory(description = '') {
    const text = String(description).toLowerCase();

    const mapping = [
        { keywords: ['laptop', 'notebook', 'macbook'], category: 'LAPTOP' },
        { keywords: ['desktop', 'computer', 'pc', 'workstation'], category: 'COMPUTER' },
        { keywords: ['printer', 'plotter', 'scanner'], category: 'PRINTER' },
        { keywords: ['server', 'rack server'], category: 'SERVER' },
        { keywords: ['router', 'switch', 'access point', 'firewall', 'network'], category: 'NETWORK' },
        { keywords: ['phone', 'mobile', 'tablet', 'ipad'], category: 'PHONE' },
        { keywords: ['chair', 'table', 'desk', 'cabinet', 'furniture'], category: 'FURNITURE' },
        { keywords: ['vehicle', 'car', 'bike', 'truck'], category: 'VEHICLE' },
        { keywords: ['machine', 'machinery'], category: 'MACHINERY' },
        { keywords: ['equipment', 'tool', 'device'], category: 'EQUIPMENT' },
    ];

    const found = mapping.find((item) => item.keywords.some((kw) => text.includes(kw)));
    return found?.category || 'OTHER';
}

function shouldCreateAssetFromLineItem(lineItem = {}) {
    const description = String(lineItem.description || '').trim();
    const lower = description.toLowerCase();
    const quantity = Number(lineItem.quantity || 1);
    const unitPrice = Number(lineItem.unitPrice || 0);

    if (!description) return false;

    // Skip common non-asset/service lines
    const serviceKeywords = [
        'service', 'installation', 'consulting', 'support', 'subscription', 'license',
        'warranty extension', 'shipping', 'freight', 'delivery', 'gst', 'tax', 'discount',
    ];
    if (serviceKeywords.some((kw) => lower.includes(kw))) return false;

    // Strong keyword hit or value threshold
    const strongAsset = ['laptop', 'computer', 'desktop', 'printer', 'server', 'router', 'switch', 'phone', 'tablet', 'chair', 'desk', 'vehicle', 'equipment', 'machine']
        .some((kw) => lower.includes(kw));

    if (strongAsset) return true;
    if (quantity > 0 && unitPrice >= 3000) return true;

    return false;
}

function buildAssetCandidates(extractedData, maxAssetsPerScan = 60) {
    const lineItems = Array.isArray(extractedData?.lineItems) ? extractedData.lineItems : [];
    const candidates = [];
    const skipped = [];

    for (const line of lineItems) {
        if (!shouldCreateAssetFromLineItem(line)) {
            skipped.push({
                description: line?.description || 'Unknown Item',
                reason: 'Not classified as an asset line item',
            });
            continue;
        }

        const quantity = Math.max(1, Math.min(50, Math.round(Number(line.quantity || 1))));
        const unitPriceRaw = Number(line.unitPrice || 0);
        const totalRaw = Number(line.total || 0);
        const unitPrice = unitPriceRaw > 0 ? unitPriceRaw : (quantity > 0 ? totalRaw / quantity : 0);

        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
            skipped.push({
                description: line?.description || 'Unknown Item',
                reason: 'Missing valid unit price',
            });
            continue;
        }

        for (let i = 0; i < quantity; i++) {
            if (candidates.length >= maxAssetsPerScan) {
                skipped.push({
                    description: line?.description || 'Unknown Item',
                    reason: `Exceeded max auto assets per scan (${maxAssetsPerScan})`,
                });
                break;
            }

            const baseName = String(line.description || 'Auto Imported Asset').trim();
            const name = quantity > 1 ? `${baseName} (${i + 1}/${quantity})` : baseName;

            candidates.push({
                name,
                category: mapAssetCategory(line.description),
                purchasePrice: Number(unitPrice.toFixed(2)),
                lineDescription: baseName,
                quantity,
            });
        }
    }

    return { candidates, skipped, sourceLineItemCount: lineItems.length };
}

async function refineWithKimi(preliminaryData, rawText = '') {
    if (!kimiService.isConfigured()) return preliminaryData;

    const prompt = `You are improving OCR extraction quality for ERP finance workflows.
Given preliminary JSON and raw OCR text, return one final JSON strictly matching this schema:
${INVOICE_PROMPT}

Rules:
- Keep fields null when uncertain.
- Normalize currency to INR unless clearly specified.
- Ensure lineItems is always an array.
- confidenceScore must be between 0 and 1.

Preliminary JSON:
${JSON.stringify(preliminaryData || {}, null, 2)}

Raw OCR text:
${String(rawText || '').slice(0, 12000)}
`;

    const result = await kimiService.generateJSON(prompt, {
        temperature: 0.1,
        maxTokens: 2000,
    });

    if (result?.parsed && typeof result.parsed === 'object') {
        return normalizeExtractedData({ ...preliminaryData, ...result.parsed });
    }

    return normalizeExtractedData(preliminaryData);
}

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
    const autoCreateAssets = parseBooleanFlag(req.body.autoCreateAssets, true);
    const maxAssetsPerScan = 60;
    const ocrMode = String(req.body.ocrMode || 'high').trim().toLowerCase();
    const isHighCapabilityMode = ocrMode !== 'fast';

    try {
        // ── Tier 1: Kimi vision (preferred) -> Kaggle vision fallback ──
        const imageBase64 = Buffer.from(fs.readFileSync(filePath)).toString('base64');
        const primaryPrompt = isHighCapabilityMode
            ? `${INVOICE_PROMPT}\n${HARD_OCR_PROMPT_SUFFIX}`
            : INVOICE_PROMPT;

        let visionResult = await kaggleService.vision(imageBase64, primaryPrompt, {
            mimeType,
            providerPreference: 'kimi',
            temperature: isHighCapabilityMode ? 0.05 : 0.1,
            maxTokens: isHighCapabilityMode ? 5000 : 2500,
        });

        // Retry with alternate provider preference in high-capability mode for hard scans.
        if ((!visionResult?.text || visionResult?.source === 'none') && isHighCapabilityMode) {
            const secondaryPrompt = `${primaryPrompt}\nRe-run extraction with strict robustness and return only JSON.`;
            visionResult = await kaggleService.vision(imageBase64, secondaryPrompt, {
                mimeType,
                providerPreference: 'kaggle',
                temperature: 0.05,
                maxTokens: 5000,
            });
        }

        if (visionResult?.text) {
            aiSource = visionResult.source || 'kaggle';
            try {
                const clean = visionResult.text.replace(/```json/gi, '').replace(/```/g, '').trim();
                extractedData = normalizeExtractedData(JSON.parse(clean));
                extractedData.confidenceScore = extractedData.confidenceScore || 0.85;

                // High-capability refinement pass for edge cases and consistency checks.
                if (isHighCapabilityMode) {
                    extractedData = await refineWithKimi(extractedData, visionResult.text);
                }
            } catch {
                // JSON parse failed — salvage fields then refine with Kimi text reasoning
                const fallback = parseTextFallback(visionResult.text);
                extractedData = await refineWithKimi(fallback, visionResult.text);
                aiSource = aiSource === 'kimi-k2.5' ? 'kimi-refined' : 'vision-fallback';
            }
        } else {
            // ── Tier 2: Tesseract.js local OCR ──────────────────
            try {
                const { createWorker } = require('tesseract.js');
                const worker = await createWorker('eng');
                const { data: { text } } = await worker.recognize(filePath);
                await worker.terminate();
                const fallback = parseTextFallback(text);
                extractedData = await refineWithKimi(fallback, text);
                extractedData.rawText = text;
                aiSource = kimiService.isConfigured() ? 'tesseract+kimi' : 'tesseract';
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

    // ── Auto-create assets from invoice line items (quantity aware) ─────
    const assetAutomation = {
        enabled: autoCreateAssets,
        attemptedItems: 0,
        createdCount: 0,
        createdAssets: [],
        skippedItems: [],
        warnings: [],
    };

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'];
    const canAutoCreateAssets = allowedRoles.includes(String(req.user?.role || ''));

    if (autoCreateAssets && !canAutoCreateAssets) {
        assetAutomation.warnings.push('Your role is not allowed for automatic asset creation.');
    }

    if (autoCreateAssets && canAutoCreateAssets) {
        try {
            const { candidates, skipped, sourceLineItemCount } = buildAssetCandidates(extractedData, maxAssetsPerScan);
            assetAutomation.attemptedItems = sourceLineItemCount;
            assetAutomation.skippedItems.push(...skipped);

            const officeId = resolvedOfficeId || req.user.office?.id || req.user.officeId;
            if (!officeId) {
                assetAutomation.warnings.push('No office found on user context. Assets were not created.');
            } else if (!candidates.length) {
                assetAutomation.warnings.push('No asset-classified line items found in this invoice.');
            } else {
                const office = await prisma.office.findUnique({
                    where: { id: typeof officeId === 'object' ? officeId.id : officeId },
                    select: { id: true, baseCurrency: true },
                });

                if (!office) {
                    assetAutomation.warnings.push('Office record not found. Assets were not created.');
                } else {
                    for (const candidate of candidates) {
                        const guai = await generateGUAI(office.id);
                        const asset = await prisma.asset.create({
                            data: {
                                guai,
                                name: candidate.name,
                                category: candidate.category,
                                purchasePrice: candidate.purchasePrice,
                                currency: String(office.baseCurrency || extractedData.currency || 'INR').toUpperCase(),
                                purchaseDate: extractedData.date ? new Date(extractedData.date) : new Date(),
                                officeId: office.id,
                                createdById: req.user.id,
                                vendorId: matchedVendor?.id || null,
                                invoiceNumber: extractedData.invoiceNumber || null,
                                notes: `Auto-created from OCR invoice scan. Document ID: ${savedDocument?.id || 'N/A'}. Line item: ${candidate.lineDescription}`,
                            },
                            select: {
                                id: true,
                                guai: true,
                                name: true,
                                category: true,
                                purchasePrice: true,
                                currency: true,
                            },
                        });

                        assetAutomation.createdAssets.push(asset);
                    }

                    assetAutomation.createdCount = assetAutomation.createdAssets.length;

                    if (savedDocument?.id && assetAutomation.createdAssets.length > 0) {
                        await prisma.document.update({
                            where: { id: savedDocument.id },
                            data: { linkedAssetId: assetAutomation.createdAssets[0].id },
                        });
                    }
                }
            }
        } catch (assetError) {
            logger.warn('[OCR] Auto asset creation failed:', assetError.message);
            assetAutomation.warnings.push(`Auto asset creation failed: ${assetError.message}`);
        }
    }

    // Don't delete the file — it's stored as a document
    res.status(200).json({
        success: true,
        data: {
            extractedData,
            aiSource,
            ocrMode: isHighCapabilityMode ? 'high' : 'fast',
            documentId: savedDocument?.id,
            documentUrl: fileUrl,
            matchedVendor,
            assetAutomation,
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

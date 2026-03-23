const path = require('path');
const mindee = require('mindee');
const logger = require('../utils/logger');

function toFiniteNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const normalized = String(value).replace(/[₹,\s]/g, '').trim();
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : null;
}

function toIsoDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
}

function lower(text) {
    return String(text || '').toLowerCase();
}

function findFieldValue(fields, keyCandidates = []) {
    if (!fields || typeof fields !== 'object') return null;

    const entries = Object.entries(fields);
    for (const [fieldKey, fieldValue] of entries) {
        const key = lower(fieldKey);
        const hit = keyCandidates.some((candidate) => key.includes(lower(candidate)));
        if (!hit) continue;

        if (fieldValue && typeof fieldValue === 'object') {
            if (fieldValue.value !== undefined && fieldValue.value !== null && fieldValue.value !== '') return fieldValue.value;
            if (fieldValue.content !== undefined && fieldValue.content !== null && fieldValue.content !== '') return fieldValue.content;
            if (Array.isArray(fieldValue.values) && fieldValue.values.length > 0) {
                const first = fieldValue.values[0];
                if (first && typeof first === 'object') {
                    if (first.value !== undefined && first.value !== null && first.value !== '') return first.value;
                    if (first.content !== undefined && first.content !== null && first.content !== '') return first.content;
                }
                if (first !== undefined && first !== null && first !== '') return first;
            }
            if (Array.isArray(fieldValue) && fieldValue.length > 0) return fieldValue[0];
        }

        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') return fieldValue;
    }

    return null;
}

function normalizeLineItems(fields) {
    if (!fields || typeof fields !== 'object') return [];

    const possibleListKey = Object.keys(fields).find((key) => {
        const normalized = lower(key);
        return normalized.includes('line') || normalized.includes('item') || normalized.includes('products');
    });

    if (!possibleListKey) return [];

    const rawList = fields[possibleListKey];
    const values = rawList?.values || rawList;
    if (!Array.isArray(values)) return [];

    return values
        .map((row) => {
            const data = row?.value || row || {};
            const description =
                data.description?.value ||
                data.description ||
                data.name?.value ||
                data.name ||
                data.label?.value ||
                data.label ||
                'Receipt Item';

            const quantity = toFiniteNumber(data.quantity?.value ?? data.quantity) ?? 1;
            const unitPrice = toFiniteNumber(data.unitPrice?.value ?? data.unitPrice ?? data.unit_amount?.value ?? data.unit_amount) ?? 0;
            const total = toFiniteNumber(data.total?.value ?? data.total ?? data.amount?.value ?? data.amount) ?? unitPrice * quantity;

            return {
                description: String(description).slice(0, 200),
                quantity,
                unitPrice,
                total,
            };
        })
        .filter((row) => row.total > 0 || row.unitPrice > 0 || row.description);
}

function mapMindeeToCoreOps(response) {
    const fields = response?.inference?.result?.fields || {};

    const totalAmount = toFiniteNumber(
        findFieldValue(fields, ['total_amount', 'total', 'amount_due', 'grand_total'])
    );

    const taxAmount = toFiniteNumber(
        findFieldValue(fields, ['tax_amount', 'tax', 'vat', 'gst'])
    );

    const invoiceNumber = findFieldValue(fields, ['invoice_number', 'invoice', 'receipt_number', 'receipt_no', 'document_number']);
    const vendorName = findFieldValue(fields, ['supplier_name', 'vendor_name', 'merchant_name', 'company_name', 'issuer', 'seller']);
    const dateValue = findFieldValue(fields, ['date', 'invoice_date', 'receipt_date', 'transaction_date']);
    const currency = findFieldValue(fields, ['currency', 'currency_code']) || 'INR';
    const rawText = findFieldValue(fields, ['raw_text', 'text']) || null;

    const lineItems = normalizeLineItems(fields);

    return {
        invoiceNumber: invoiceNumber ? String(invoiceNumber).trim() : null,
        date: toIsoDate(dateValue),
        dueDate: null,
        vendorName: vendorName ? String(vendorName).trim() : null,
        vendorAddress: null,
        vendorGST: null,
        vendorPhone: null,
        vendorEmail: null,
        buyerName: null,
        buyerAddress: null,
        buyerGST: null,
        subtotal: null,
        taxAmount,
        taxRate: null,
        discountAmount: null,
        shippingAmount: null,
        totalAmount,
        currency: String(currency || 'INR').toUpperCase(),
        paymentTerms: null,
        paymentMethod: null,
        notes: null,
        documentType: 'RECEIPT',
        lineItems,
        confidenceScore: 0.9,
        rawText,
    };
}

async function extractExpenseReceipt(filePath, options = {}) {
    const apiKey = process.env.MINDEE_API_KEY;
    const modelId = process.env.MINDEE_EXPENSE_RECEIPT_MODEL_ID;

    if (!apiKey || !modelId) {
        return { configured: false, data: null, response: null };
    }

    const absolutePath = path.resolve(filePath);

    const client = new mindee.Client({ apiKey });
    const inputSource = new mindee.PathInput({ inputPath: absolutePath });

    const productParams = {
        modelId,
        rag: options.rag,
        rawText: options.rawText,
        polygon: options.polygon,
        confidence: options.confidence,
    };

    logger.info('[Mindee OCR] Processing expense receipt with custom extraction model');

    const response = await client.enqueueAndGetResult(
        mindee.product.Extraction,
        inputSource,
        productParams
    );

    return {
        configured: true,
        data: mapMindeeToCoreOps(response),
        response,
    };
}

module.exports = {
    extractExpenseReceipt,
};

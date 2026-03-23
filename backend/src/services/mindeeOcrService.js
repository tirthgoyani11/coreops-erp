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

function toText(value) {
    if (value === null || value === undefined) return null;
    return String(value).trim() || null;
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
            if (fieldValue.fields && typeof fieldValue.fields === 'object') return fieldValue.fields;
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

function findArrayField(fields, keyCandidates = []) {
    if (!fields || typeof fields !== 'object') return [];

    for (const [fieldKey, fieldValue] of Object.entries(fields)) {
        const key = lower(fieldKey);
        const hit = keyCandidates.some((candidate) => key.includes(lower(candidate)));
        if (!hit) continue;

        if (Array.isArray(fieldValue?.values)) return fieldValue.values;
        if (Array.isArray(fieldValue?.items)) return fieldValue.items;
        if (Array.isArray(fieldValue)) return fieldValue;
        if (Array.isArray(fieldValue?.value)) return fieldValue.value;
    }

    return [];
}

function normalizeLineItems(fields) {
    if (!fields || typeof fields !== 'object') return [];

    const possibleListKey = Object.keys(fields).find((key) => {
        const normalized = lower(key);
        return normalized.includes('line') || normalized.includes('item') || normalized.includes('products');
    });

    if (!possibleListKey) return [];

    const rawList = fields[possibleListKey];
    const values = rawList?.items || rawList?.values || rawList;
    if (!Array.isArray(values)) return [];

    return values
        .map((row) => {
            const data = row?.fields || row?.value || row || {};
            const description =
                data.description?.value ||
                data.description ||
                data.name?.value ||
                data.name ||
                data.label?.value ||
                data.label ||
                'Receipt Item';

            const quantity = toFiniteNumber(data.quantity?.value ?? data.quantity) ?? 1;
            const unitPrice = toFiniteNumber(
                data.unit_price?.value ??
                data.unit_price ??
                data.unitPrice?.value ??
                data.unitPrice ??
                data.unit_amount?.value ??
                data.unit_amount
            ) ?? 0;
            const total = toFiniteNumber(
                data.total_price?.value ??
                data.total_price ??
                data.total?.value ??
                data.total ??
                data.amount?.value ??
                data.amount
            ) ?? unitPrice * quantity;

            return {
                description: String(description).slice(0, 200),
                quantity,
                unitPrice,
                total,
                unit: toText(data.unit_measure?.value ?? data.unit_measure),
                taxAmount: toFiniteNumber(data.tax_amount?.value ?? data.tax_amount),
                taxPercent: toFiniteNumber(data.tax_rate?.value ?? data.tax_rate),
                hsn: toText(data.product_code?.value ?? data.product_code),
            };
        })
        .filter((row) => row.total > 0 || row.unitPrice > 0 || row.description);
}

function flattenAddress(value) {
    if (!value) return null;
    if (typeof value === 'string') return value;

    const source = value.fields && typeof value.fields === 'object' ? value.fields : value;

    const raw = source.address?.value || source.address;
    if (raw) return String(raw);

    const parts = [
        source.street_number?.value || source.street_number,
        source.street_name?.value || source.street_name,
        source.address_complement?.value || source.address_complement,
        source.city?.value || source.city,
        source.state?.value || source.state,
        source.postal_code?.value || source.postal_code,
        source.country?.value || source.country,
    ].filter(Boolean);

    return parts.length ? parts.join(', ') : null;
}

function extractRegistrationNumber(regList) {
    if (!Array.isArray(regList) || regList.length === 0) return null;
    const first = regList[0]?.fields || regList[0]?.value || regList[0] || {};
    return toText(first.number?.value ?? first.number);
}

function mapMindeeToCoreOps(response) {
    const fields = response?.inference?.result?.fields || {};

    const totalAmount = toFiniteNumber(
        findFieldValue(fields, ['total_amount', 'total', 'amount_due', 'grand_total'])
    );

    const taxAmount = toFiniteNumber(
        findFieldValue(fields, ['total_tax', 'tax_amount', 'tax', 'vat', 'gst'])
    );

    const invoiceNumber = findFieldValue(fields, ['invoice_number', 'invoice', 'receipt_number', 'receipt_no', 'document_number']);
    const vendorName = findFieldValue(fields, ['supplier_name', 'vendor_name', 'merchant_name', 'company_name', 'issuer', 'seller']);
    const vendorPhone = findFieldValue(fields, ['supplier_phone_number', 'supplier_phone', 'vendor_phone']);
    const vendorEmail = findFieldValue(fields, ['supplier_email', 'vendor_email']);
    const vendorWebsite = findFieldValue(fields, ['supplier_website', 'vendor_website']);
    const customerName = findFieldValue(fields, ['customer_name', 'buyer_name']);
    const customerId = findFieldValue(fields, ['customer_id']);
    const poNumber = findFieldValue(fields, ['po_number']);
    const dueDate = findFieldValue(fields, ['due_date']);
    const paymentDate = findFieldValue(fields, ['payment_date']);
    const dateValue = findFieldValue(fields, ['date', 'invoice_date', 'receipt_date', 'transaction_date']);
    const subtotal = toFiniteNumber(findFieldValue(fields, ['total_net', 'subtotal', 'sub_total']));
    const documentTypeRaw = findFieldValue(fields, ['document_type']);
    const currency = findFieldValue(fields, ['currency', 'currency_code']) || 'INR';
    const rawText = findFieldValue(fields, ['raw_text', 'text']) || null;

    const locale = findFieldValue(fields, ['locale']);
    const localeCurrency = locale?.currency?.value || locale?.currency;
    const supplierAddressObj = findFieldValue(fields, ['supplier_address']);
    const customerAddressObj = findFieldValue(fields, ['customer_address']);
    const shippingAddressObj = findFieldValue(fields, ['shipping_address']);
    const billingAddressObj = findFieldValue(fields, ['billing_address']);
    const supplierRegistrations = findArrayField(fields, ['supplier_company_registration']);
    const customerRegistrations = findArrayField(fields, ['customer_company_registration']);

    const lineItems = normalizeLineItems(fields);
    const taxes = findArrayField(fields, ['taxes']);
    const firstTax = taxes[0]?.fields || taxes[0]?.value || taxes[0] || {};
    const taxRate = toFiniteNumber(firstTax.rate?.value ?? firstTax.rate);

    const resolvedDocumentType = (() => {
        const raw = lower(documentTypeRaw || 'invoice');
        if (raw.includes('receipt')) return 'RECEIPT';
        if (raw.includes('purchase_order')) return 'PURCHASE_ORDER';
        return 'INVOICE';
    })();

    return {
        invoiceNumber: toText(invoiceNumber),
        date: toIsoDate(dateValue),
        dueDate: toIsoDate(dueDate),
        vendorName: toText(vendorName),
        vendorAddress: flattenAddress(supplierAddressObj),
        vendorGST: extractRegistrationNumber(supplierRegistrations),
        vendorPhone: toText(vendorPhone),
        vendorEmail: toText(vendorEmail),
        buyerName: toText(customerName),
        buyerAddress: flattenAddress(customerAddressObj),
        buyerGST: extractRegistrationNumber(customerRegistrations),
        subtotal,
        taxAmount,
        taxRate,
        discountAmount: null,
        shippingAmount: null,
        totalAmount,
        currency: String(localeCurrency || currency || 'INR').toUpperCase(),
        paymentTerms: null,
        paymentMethod: null,
        notes: [toText(vendorWebsite), toText(customerId), toText(poNumber), toText(paymentDate)]
            .filter(Boolean)
            .join(' | ') || null,
        documentType: resolvedDocumentType,
        lineItems,
        confidenceScore: 0.9,
        rawText: response?.raw_text || rawText,
        shippingAddress: flattenAddress(shippingAddressObj),
        billingAddress: flattenAddress(billingAddressObj),
        referenceNumbers: findArrayField(fields, ['reference_numbers'])
            .map((ref) => toText(ref?.value ?? ref))
            .filter(Boolean),
    };
}

async function extractWithModel(filePath, modelId, logLabel, options = {}) {
    const apiKey = process.env.MINDEE_API_KEY;

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

    logger.info(`[Mindee OCR] Processing ${logLabel} with custom extraction model`);

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

async function extractExpenseReceipt(filePath, options = {}) {
    return extractWithModel(
        filePath,
        process.env.MINDEE_EXPENSE_RECEIPT_MODEL_ID,
        'expense receipt',
        options
    );
}

async function extractInvoice(filePath, options = {}) {
    return extractWithModel(
        filePath,
        process.env.MINDEE_INVOICE_MODEL_ID,
        'invoice',
        options
    );
}

module.exports = {
    extractExpenseReceipt,
    extractInvoice,
};

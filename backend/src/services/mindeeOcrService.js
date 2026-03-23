const path = require('path');
const mindee = require('mindee');
const logger = require('../utils/logger');

function toPlainObject(value) {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;

    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        if (typeof value.toJSON === 'function') {
            try {
                return value.toJSON();
            } catch {
                return value;
            }
        }
        return value;
    }
}

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

function getContainerValue(container, key) {
    if (!container || !key) return undefined;

    if (typeof container.get === 'function') {
        const mapValue = container.get(key);
        if (mapValue !== undefined) return mapValue;
    }

    if (Object.prototype.hasOwnProperty.call(container, key)) {
        return container[key];
    }

    const plain = toPlainObject(container);
    if (plain && Object.prototype.hasOwnProperty.call(plain, key)) {
        return plain[key];
    }

    return undefined;
}

function getFieldObject(fields, keyCandidates = []) {
    for (const key of keyCandidates) {
        const field = getContainerValue(fields, key);
        if (field !== undefined) return field;
    }
    return undefined;
}

function withAliases(keys = []) {
    const aliasSet = new Set();
    for (const key of keys) {
        aliasSet.add(key);
        const camel = key.replace(/_([a-z])/g, (_, chr) => chr.toUpperCase());
        aliasSet.add(camel);
    }
    return Array.from(aliasSet);
}

function extractFieldValue(field) {
    if (field === null || field === undefined) return null;
    if (typeof field !== 'object') return field;

    const plain = toPlainObject(field) || field;

    if (plain.value !== undefined && plain.value !== null && plain.value !== '') return plain.value;
    if (plain.content !== undefined && plain.content !== null && plain.content !== '') return plain.content;
    if (plain.fields && typeof plain.fields === 'object') return plain.fields;

    const items = plain.items || plain.values || plain.value;
    if (Array.isArray(items) && items.length > 0) {
        const first = items[0];
        if (first && typeof first === 'object') {
            const nested = toPlainObject(first) || first;
            if (nested.value !== undefined && nested.value !== null && nested.value !== '') return nested.value;
            if (nested.content !== undefined && nested.content !== null && nested.content !== '') return nested.content;
            if (nested.fields && typeof nested.fields === 'object') return nested.fields;
        }
        return first;
    }

    return null;
}

function findFieldValue(fields, keyCandidates = []) {
    const directField = getFieldObject(fields, keyCandidates);
    const directValue = extractFieldValue(directField);
    if (directValue !== null && directValue !== undefined && directValue !== '') return directValue;

    const normalizedFields = toPlainObject(fields);
    if (!normalizedFields || typeof normalizedFields !== 'object') return null;

    const entries = Object.entries(normalizedFields);
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
    const directField = getFieldObject(fields, keyCandidates);
    if (directField !== undefined) {
        const plainDirect = toPlainObject(directField) || directField;
        if (Array.isArray(plainDirect?.items)) return plainDirect.items;
        if (Array.isArray(plainDirect?.values)) return plainDirect.values;
        if (Array.isArray(plainDirect)) return plainDirect;
        if (Array.isArray(plainDirect?.value)) return plainDirect.value;
    }

    const normalizedFields = toPlainObject(fields);
    if (!normalizedFields || typeof normalizedFields !== 'object') return [];

    for (const [fieldKey, fieldValue] of Object.entries(normalizedFields)) {
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
    const rawList =
        getFieldObject(fields, ['line_items', 'items', 'products']) ||
        getContainerValue(toPlainObject(fields), 'line_items');

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
    const plainResponse = toPlainObject(response) || {};
    const inferenceResult =
        plainResponse?.inference?.result ||
        plainResponse?.inference ||
        plainResponse?.result ||
        plainResponse;

    const fields =
        inferenceResult?.fields ||
        plainResponse?.fields ||
        {};

    const totalAmount = toFiniteNumber(
        findFieldValue(fields, withAliases(['total_amount', 'total', 'amount_due', 'grand_total']))
    );

    const taxAmount = toFiniteNumber(
        findFieldValue(fields, withAliases(['total_tax', 'tax_amount', 'tax', 'vat', 'gst']))
    );

    const invoiceNumber = findFieldValue(fields, withAliases(['invoice_number']));
    const vendorName = findFieldValue(fields, withAliases(['supplier_name']));
    const vendorPhone = findFieldValue(fields, withAliases(['supplier_phone_number']));
    const vendorEmail = findFieldValue(fields, withAliases(['supplier_email']));
    const vendorWebsite = findFieldValue(fields, withAliases(['supplier_website']));
    const customerName = findFieldValue(fields, withAliases(['customer_name']));
    const customerId = findFieldValue(fields, withAliases(['customer_id']));
    const poNumber = findFieldValue(fields, withAliases(['po_number']));
    const dueDate = findFieldValue(fields, withAliases(['due_date']));
    const paymentDate = findFieldValue(fields, withAliases(['payment_date']));
    const dateValue = findFieldValue(fields, withAliases(['date']));
    const subtotal = toFiniteNumber(findFieldValue(fields, withAliases(['total_net', 'subtotal', 'sub_total'])));
    const documentTypeRaw = findFieldValue(fields, withAliases(['document_type']));
    const currency = findFieldValue(fields, withAliases(['currency'])) || 'INR';
    const rawText = findFieldValue(fields, withAliases(['raw_text', 'text'])) || null;

    const locale = findFieldValue(fields, withAliases(['locale']));
    const localeCurrency = locale?.currency?.value || locale?.currency;
    const supplierAddressObj = findFieldValue(fields, withAliases(['supplier_address']));
    const customerAddressObj = findFieldValue(fields, withAliases(['customer_address']));
    const shippingAddressObj = findFieldValue(fields, withAliases(['shipping_address']));
    const billingAddressObj = findFieldValue(fields, withAliases(['billing_address']));
    const supplierRegistrations = findArrayField(fields, withAliases(['supplier_company_registration']));
    const customerRegistrations = findArrayField(fields, withAliases(['customer_company_registration']));

    const lineItems = normalizeLineItems(fields);
    const taxes = findArrayField(fields, withAliases(['taxes']));
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
        rawText: inferenceResult?.raw_text || plainResponse?.raw_text || rawText,
        shippingAddress: flattenAddress(shippingAddressObj),
        billingAddress: flattenAddress(billingAddressObj),
        referenceNumbers: findArrayField(fields, withAliases(['reference_numbers']))
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
    _mapMindeeToCoreOps: mapMindeeToCoreOps,
};

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, Upload, Loader2, FileText, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { useAuthStore } from '../stores/authStore';

interface ScannedInvoice {
    id: string;
    name: string;
    originalName: string;
    description: string;
    url: string;
    category: string;
    createdAt: string;
    officeId?: string;
    uploadedBy?: { name?: string; email?: string };
}

export function InvoiceScanner() {
    const { user } = useAuthStore();
    const [invoices, setInvoices] = useState<ScannedInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [scanResult, setScanResult] = useState<any>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<ScannedInvoice | null>(null);
    const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);
    const [rowActionState, setRowActionState] = useState<Record<string, {
        addingAsset?: boolean;
        addingInventory?: boolean;
        message?: string;
        error?: boolean;
    }>>({});

    useEffect(() => { fetchInvoices(); }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const res = await api.get('/ocr');
            if (res.data.success) setInvoices(res.data.data || []);
        } catch (err) { console.error('Failed to fetch invoices:', err); }
        finally { setLoading(false); }
    };

    const handleUpload = async (file: File) => {
        if (!file) return;
        setUploading(true);
        setScanResult(null);
        try {
            const formData = new FormData();
            formData.append('invoice', file);
            formData.append('ocrTarget', 'invoice');
            const res = await api.post('/ocr/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                // Backend returns { data: { extractedData: {...}, aiSource, documentId, ... } }
                const raw = res.data.data;
                const extracted = raw.extractedData || {};
                setScanResult({
                    ...extracted,
                    aiSource: raw.aiSource,
                    documentId: raw.documentId,
                    documentUrl: raw.documentUrl,
                    matchedVendor: raw.matchedVendor,
                    assetAutomation: raw.assetAutomation,
                });
                fetchInvoices();
            }
        } catch (err: any) {
            console.error('Upload failed:', err);
            setScanResult({ error: err.response?.data?.message || 'Upload failed. Please try again.' });
        }
        finally { setUploading(false); }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
            handleUpload(file);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(true);
    }, []);

    const handleDragLeave = useCallback(() => setDragActive(false), []);

    const handleSelectInvoice = async (inv: ScannedInvoice) => {
        if (selectedInvoice?.id === inv.id) {
            setSelectedInvoice(null);
            return;
        }

        setSelectedInvoice(inv);
        setLoadingHistoryId(inv.id);

        try {
            const res = await api.get(`/ocr/${inv.id}`);
            const raw = res?.data?.data || {};

            let parsed = raw.ocrData;
            if (!parsed && raw.ocrText) {
                try {
                    parsed = JSON.parse(raw.ocrText);
                } catch {
                    parsed = null;
                }
            }

            const extracted = parsed?.extractedData || {};
            if (Object.keys(extracted).length > 0) {
                setScanResult({
                    ...extracted,
                    aiSource: parsed?.aiSource || 'history',
                    documentId: raw.id,
                    documentUrl: raw.url,
                    matchedVendor: parsed?.matchedVendor || null,
                    assetAutomation: parsed?.assetAutomation || null,
                });
            } else {
                setScanResult({
                    invoiceNumber: raw?.name || 'N/A',
                    vendorName: raw?.description || 'N/A',
                    date: raw?.createdAt || null,
                    totalAmount: null,
                    lineItems: [],
                    aiSource: 'history',
                    rawText: raw?.ocrText || null,
                });
            }
        } catch (err) {
            console.error('Failed to fetch invoice detail:', err);
        } finally {
            setLoadingHistoryId(null);
        }
    };

    const lineItems = Array.isArray(scanResult?.lineItems) ? scanResult.lineItems : [];
    const referenceNumbers = Array.isArray(scanResult?.referenceNumbers) ? scanResult.referenceNumbers : [];

    const formatOptionalCurrency = (value: unknown) => {
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount <= 0) return 'N/A';
        return formatCurrency(amount);
    };

    const formatOptionalDate = (value: unknown) => {
        if (!value) return 'N/A';
        const date = new Date(String(value));
        if (Number.isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString('en-IN');
    };

    const withRowState = (key: string, patch: Partial<{ addingAsset?: boolean; addingInventory?: boolean; message?: string; error?: boolean }>) => {
        setRowActionState((prev) => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                ...patch,
            },
        }));
    };

    const toSafeNumber = (value: unknown, fallback = 0) => {
        const num = Number(value);
        return Number.isFinite(num) ? num : fallback;
    };

    const mapItemCategoryToAsset = (description: string) => {
        const text = String(description || '').toLowerCase();
        if (/laptop|notebook|macbook/.test(text)) return 'LAPTOP';
        if (/desktop|computer|pc|workstation/.test(text)) return 'COMPUTER';
        if (/printer|scanner|plotter/.test(text)) return 'PRINTER';
        if (/server|rack/.test(text)) return 'SERVER';
        if (/router|switch|firewall|network/.test(text)) return 'NETWORK';
        if (/phone|mobile|tablet|ipad/.test(text)) return 'PHONE';
        if (/chair|table|desk|cabinet|furniture/.test(text)) return 'FURNITURE';
        if (/vehicle|car|bike|truck/.test(text)) return 'VEHICLE';
        if (/machine|machinery/.test(text)) return 'MACHINERY';
        return 'EQUIPMENT';
    };

    const resolveOfficeId = () => {
        const fromUserOffice = user?.office?.id;
        const fromUserOfficeId = typeof user?.officeId === 'string'
            ? user.officeId
            : (user?.officeId as any)?.id;
        const fromSelectedInvoice = selectedInvoice?.officeId;

        return fromUserOffice || fromUserOfficeId || fromSelectedInvoice || null;
    };

    const addLineItemToAsset = async (item: any, index: number) => {
        const rowKey = `row-${index}`;
        withRowState(rowKey, { addingAsset: true, message: undefined, error: false });

        try {
            const officeId = resolveOfficeId();
            if (!officeId) {
                withRowState(rowKey, {
                    addingAsset: false,
                    message: 'Office is required. Please select/login with an office and try again.',
                    error: true,
                });
                return;
            }

            const description = String(item?.description || `Invoice Item ${index + 1}`).slice(0, 200);
            const unitPrice = toSafeNumber(item?.unitPrice, toSafeNumber(item?.total, 0));

            const payload = {
                name: description,
                category: mapItemCategoryToAsset(description),
                purchaseCost: unitPrice,
                currency: String(scanResult?.currency || 'INR').toUpperCase(),
                officeId,
                invoiceNumber: scanResult?.invoiceNumber || undefined,
                purchaseDate: scanResult?.date || undefined,
                vendor: scanResult?.matchedVendor?.id || undefined,
                skipAutoExpenseEntry: false,
            };

            const res = await api.post('/assets', payload);
            const assetName = res?.data?.data?.name || description;
            withRowState(rowKey, {
                addingAsset: false,
                message: `Added to Asset: ${assetName}`,
                error: false,
            });
        } catch (err: any) {
            withRowState(rowKey, {
                addingAsset: false,
                message: err?.response?.data?.message || 'Failed to add as asset',
                error: true,
            });
        }
    };

    const addLineItemToInventory = async (item: any, index: number) => {
        const rowKey = `row-${index}`;
        withRowState(rowKey, { addingInventory: true, message: undefined, error: false });

        try {
            const officeId = resolveOfficeId();
            if (!officeId) {
                withRowState(rowKey, {
                    addingInventory: false,
                    message: 'Office is required. Please select/login with an office and try again.',
                    error: true,
                });
                return;
            }

            const description = String(item?.description || `Invoice Item ${index + 1}`).slice(0, 200);
            const quantity = Math.max(0, Math.round(toSafeNumber(item?.quantity, 1)));
            const unitPrice = toSafeNumber(item?.unitPrice, toSafeNumber(item?.total, 0));

            const payload = {
                name: description,
                type: 'PRODUCT',
                category: 'General',
                officeId,
                currentQuantity: quantity,
                reorderPoint: 10,
                reorderQuantity: 50,
                minimumQuantity: 5,
                unit: item?.unit || 'pieces',
                unitCost: unitPrice,
                costPrice: unitPrice,
                pricingCurrency: String(scanResult?.currency || 'INR').toUpperCase(),
                notes: `Imported from invoice ${scanResult?.invoiceNumber || 'N/A'}`,
                skipAutoExpenseEntry: false,
            };

            const res = await api.post('/inventory', payload);
            const inventoryName = res?.data?.data?.name || description;
            withRowState(rowKey, {
                addingInventory: false,
                message: `Added to Inventory: ${inventoryName}`,
                error: false,
            });
        } catch (err: any) {
            withRowState(rowKey, {
                addingInventory: false,
                message: err?.response?.data?.message || 'Failed to add to inventory',
                error: true,
            });
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                    <ScanLine className="w-7 h-7 text-cyan-400" />
                    AI Invoice Scanner
                </h1>
                <p className="text-[var(--text-secondary)] mt-1">
                    Upload invoices • OCR text extraction • Auto-detect vendor, amount, and date
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upload Zone + Result */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Drag & Drop Upload */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                            dragActive
                                ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                                : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-cyan-400/50'
                        }`}
                    >
                        {uploading ? (
                            <div className="flex flex-col items-center">
                                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
                                <p className="text-[var(--text-primary)] font-semibold">Scanning invoice...</p>
                                <p className="text-sm text-[var(--text-muted)] mt-1">AI is extracting text and data fields</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mb-4">
                                    <Upload className="w-8 h-8 text-cyan-400" />
                                </div>
                                <p className="text-lg font-semibold text-[var(--text-primary)]">Drop invoice image here</p>
                                <p className="text-sm text-[var(--text-muted)] mt-1">or click to browse — PNG, JPG, PDF supported</p>
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
                                />
                            </div>
                        )}
                    </div>

                    {/* Scan Result */}
                    <AnimatePresence>
                        {scanResult && !scanResult.error && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="bg-[var(--bg-card)] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.1)]"
                            >
                                <div className="bg-cyan-500/10 border-b border-cyan-500/20 p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="w-6 h-6 text-cyan-400" />
                                        <h3 className="text-lg font-bold text-[var(--text-primary)]">Scan Complete</h3>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-[var(--bg-overlay)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                                            Source: {scanResult.aiSource || 'unknown'}
                                        </span>
                                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-[var(--bg-overlay)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                                            Type: {scanResult.documentType || 'INVOICE'}
                                        </span>
                                        {Number.isFinite(Number(scanResult.confidenceScore)) && (
                                            <span className="px-2 py-1 rounded-md text-xs font-medium bg-[var(--bg-overlay)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                                                Confidence: {(Number(scanResult.confidenceScore) * 100).toFixed(0)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                        <div className="bg-[var(--bg-overlay)] rounded-xl p-4 border border-[var(--border-color)]">
                                            <div className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Vendor</div>
                                            <div className="font-bold text-[var(--text-primary)] truncate">{scanResult.vendorName || 'Unknown'}</div>
                                        </div>
                                        <div className="bg-[var(--bg-overlay)] rounded-xl p-4 border border-[var(--border-color)]">
                                            <div className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Invoice #</div>
                                            <div className="font-bold text-[var(--text-primary)] font-mono">{scanResult.invoiceNumber || 'N/A'}</div>
                                        </div>
                                        <div className="bg-[var(--bg-overlay)] rounded-xl p-4 border border-[var(--border-color)]">
                                            <div className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Amount</div>
                                            <div className="font-bold text-emerald-400 text-lg">
                                                {scanResult.totalAmount ? formatCurrency(scanResult.totalAmount) : 'N/A'}
                                            </div>
                                        </div>
                                        <div className="bg-[var(--bg-overlay)] rounded-xl p-4 border border-[var(--border-color)]">
                                            <div className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Date</div>
                                            <div className="font-bold text-[var(--text-primary)]">
                                                {formatOptionalDate(scanResult.date)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                        <div className="bg-[var(--bg-overlay)] rounded-xl p-4 border border-[var(--border-color)]">
                                            <div className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Subtotal</div>
                                            <div className="font-semibold text-[var(--text-primary)]">{formatOptionalCurrency(scanResult.subtotal)}</div>
                                        </div>
                                        <div className="bg-[var(--bg-overlay)] rounded-xl p-4 border border-[var(--border-color)]">
                                            <div className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Tax</div>
                                            <div className="font-semibold text-[var(--text-primary)]">{formatOptionalCurrency(scanResult.taxAmount)}</div>
                                        </div>
                                        <div className="bg-[var(--bg-overlay)] rounded-xl p-4 border border-[var(--border-color)]">
                                            <div className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Tax Rate</div>
                                            <div className="font-semibold text-[var(--text-primary)]">
                                                {scanResult.taxRate !== null && scanResult.taxRate !== undefined && Number.isFinite(Number(scanResult.taxRate))
                                                    ? `${scanResult.taxRate}%`
                                                    : 'N/A'}
                                            </div>
                                        </div>
                                        <div className="bg-[var(--bg-overlay)] rounded-xl p-4 border border-[var(--border-color)]">
                                            <div className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Due Date</div>
                                            <div className="font-semibold text-[var(--text-primary)]">{formatOptionalDate(scanResult.dueDate)}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                                        <div className="bg-[var(--bg-overlay)] rounded-xl p-4 border border-[var(--border-color)]">
                                            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Supplier Details</p>
                                            <p className="text-sm text-[var(--text-primary)]">{scanResult.vendorName || 'Unknown Supplier'}</p>
                                            {scanResult.vendorGST && <p className="text-xs text-[var(--text-secondary)] mt-1">GST/TIN: {scanResult.vendorGST}</p>}
                                            {scanResult.vendorEmail && <p className="text-xs text-[var(--text-secondary)] mt-1">Email: {scanResult.vendorEmail}</p>}
                                            {scanResult.vendorPhone && <p className="text-xs text-[var(--text-secondary)] mt-1">Phone: {scanResult.vendorPhone}</p>}
                                            {scanResult.vendorAddress && <p className="text-xs text-[var(--text-secondary)] mt-2">Address: {scanResult.vendorAddress}</p>}
                                        </div>
                                        <div className="bg-[var(--bg-overlay)] rounded-xl p-4 border border-[var(--border-color)]">
                                            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Buyer Details</p>
                                            <p className="text-sm text-[var(--text-primary)]">{scanResult.buyerName || 'N/A'}</p>
                                            {scanResult.buyerGST && <p className="text-xs text-[var(--text-secondary)] mt-1">GST: {scanResult.buyerGST}</p>}
                                            {scanResult.buyerAddress && <p className="text-xs text-[var(--text-secondary)] mt-2">Address: {scanResult.buyerAddress}</p>}
                                            {scanResult.shippingAddress && <p className="text-xs text-[var(--text-secondary)] mt-2">Shipping: {scanResult.shippingAddress}</p>}
                                            {scanResult.billingAddress && <p className="text-xs text-[var(--text-secondary)] mt-2">Billing: {scanResult.billingAddress}</p>}
                                        </div>
                                    </div>

                                    {referenceNumbers.length > 0 && (
                                        <div className="mb-6 bg-[var(--bg-overlay)] rounded-xl p-4 border border-[var(--border-color)]">
                                            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Reference Numbers</p>
                                            <div className="flex flex-wrap gap-2">
                                                {referenceNumbers.map((ref: string, index: number) => (
                                                    <span key={`${ref}-${index}`} className="px-2 py-1 rounded-md text-xs font-mono bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                                                        {ref}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {lineItems.length > 0 && (
                                        <div className="mb-6 bg-[var(--bg-overlay)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                                            <div className="px-4 py-3 border-b border-[var(--border-color)]">
                                                <p className="text-sm font-semibold text-[var(--text-primary)]">Extracted Line Items ({lineItems.length})</p>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-sm">
                                                    <thead className="bg-[var(--bg-card)] text-[var(--text-secondary)]">
                                                        <tr>
                                                            <th className="text-left px-4 py-2 font-medium">Description</th>
                                                            <th className="text-right px-4 py-2 font-medium">Qty</th>
                                                            <th className="text-right px-4 py-2 font-medium">Unit Price</th>
                                                            <th className="text-right px-4 py-2 font-medium">Tax</th>
                                                            <th className="text-right px-4 py-2 font-medium">Total</th>
                                                            <th className="text-right px-4 py-2 font-medium">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {lineItems.slice(0, 20).map((item: any, index: number) => (
                                                            <tr key={`${item.description || 'item'}-${index}`} className="border-t border-[var(--border-color)]/50">
                                                                <td className="px-4 py-2 text-[var(--text-primary)]">{item.description || 'Item'}</td>
                                                                <td className="px-4 py-2 text-right text-[var(--text-secondary)]">{Number(item.quantity || 0)}</td>
                                                                <td className="px-4 py-2 text-right text-[var(--text-secondary)]">{formatOptionalCurrency(item.unitPrice)}</td>
                                                                <td className="px-4 py-2 text-right text-[var(--text-secondary)]">{formatOptionalCurrency(item.taxAmount)}</td>
                                                                <td className="px-4 py-2 text-right font-semibold text-[var(--text-primary)]">{formatOptionalCurrency(item.total)}</td>
                                                                <td className="px-4 py-2 text-right">
                                                                    <div className="inline-flex flex-col items-end gap-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => addLineItemToAsset(item, index)}
                                                                                disabled={!!rowActionState[`row-${index}`]?.addingAsset || !!rowActionState[`row-${index}`]?.addingInventory}
                                                                                className="px-2.5 py-1 text-xs rounded-md border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            >
                                                                                {rowActionState[`row-${index}`]?.addingAsset ? 'Adding...' : 'Add to Asset'}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => addLineItemToInventory(item, index)}
                                                                                disabled={!!rowActionState[`row-${index}`]?.addingInventory || !!rowActionState[`row-${index}`]?.addingAsset}
                                                                                className="px-2.5 py-1 text-xs rounded-md border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            >
                                                                                {rowActionState[`row-${index}`]?.addingInventory ? 'Adding...' : 'Add to Inventory'}
                                                                            </button>
                                                                        </div>
                                                                        {rowActionState[`row-${index}`]?.message && (
                                                                            <p className={`text-[11px] ${rowActionState[`row-${index}`]?.error ? 'text-red-400' : 'text-emerald-400'}`}>
                                                                                {rowActionState[`row-${index}`]?.message}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {scanResult.assetAutomation?.enabled && (
                                        <div className="mb-5 rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
                                            <div className="flex items-center justify-between gap-3 mb-2">
                                                <p className="text-sm font-semibold text-[var(--text-primary)]">Auto Asset Import</p>
                                                <span className="text-xs text-[var(--text-muted)]">Created: {scanResult.assetAutomation.createdCount || 0}</span>
                                            </div>

                                            {scanResult.assetAutomation.createdAssets?.length > 0 ? (
                                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                                    {scanResult.assetAutomation.createdAssets.slice(0, 8).map((asset: any) => (
                                                        <div key={asset.id} className="text-xs bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-[var(--text-primary)] truncate">{asset.name}</p>
                                                                <p className="text-[var(--text-muted)] font-mono truncate">{asset.guai}</p>
                                                            </div>
                                                            <span className="text-emerald-400 font-medium shrink-0">₹{Number(asset.purchasePrice || 0).toLocaleString('en-IN')}</span>
                                                        </div>
                                                    ))}
                                                    {scanResult.assetAutomation.createdAssets.length > 8 && (
                                                        <p className="text-xs text-[var(--text-muted)]">+{scanResult.assetAutomation.createdAssets.length - 8} more assets created</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-[var(--text-muted)]">No asset-classified line items were auto-created from this scan.</p>
                                            )}

                                            {scanResult.assetAutomation.warnings?.length > 0 && (
                                                <div className="mt-2 text-xs text-amber-400">
                                                    {scanResult.assetAutomation.warnings[0]}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Raw Text Preview */}
                                    {scanResult.rawText && (
                                        <details className="group">
                                            <summary className="cursor-pointer text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2">
                                                <Eye className="w-4 h-4" /> View extracted raw text
                                            </summary>
                                            <div className="mt-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg p-4 font-mono text-xs text-[var(--text-secondary)] max-h-40 overflow-y-auto whitespace-pre-wrap">
                                                {scanResult.rawText}
                                            </div>
                                        </details>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {scanResult?.error && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400"
                            >
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span className="text-sm">{scanResult.error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Scanned History */}
                <div className="lg:col-span-1">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
                        <div className="p-5 border-b border-[var(--border-color)]">
                            <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <div className="w-1.5 h-6 bg-cyan-500 rounded-full" />
                                Scan History
                            </h2>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                                </div>
                            ) : invoices.length === 0 ? (
                                <div className="py-12 text-center text-[var(--text-muted)]">
                                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">No scanned invoices yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-[var(--border-color)]/50">
                                    {invoices.map(inv => (
                                        <button
                                            key={inv.id}
                                            onClick={() => handleSelectInvoice(inv)}
                                            className={`w-full text-left p-4 hover:bg-[var(--bg-card-hover)] transition-colors ${
                                                selectedInvoice?.id === inv.id ? 'bg-cyan-500/10' : ''
                                            }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="overflow-hidden">
                                                    <p className="font-medium text-[var(--text-primary)] text-sm truncate">{inv.name}</p>
                                                    <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{inv.originalName}</p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                                {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                                Scanned by: {inv.uploadedBy?.name || inv.uploadedBy?.email || 'Unknown user'}
                                            </p>
                                            {loadingHistoryId === inv.id && (
                                                <p className="text-xs text-cyan-400 mt-1">Loading full details...</p>
                                            )}
                                            {/* Expanded detail */}
                                            {selectedInvoice?.id === inv.id && inv.description && (
                                                <div className="mt-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg p-3 text-xs text-[var(--text-muted)] max-h-24 overflow-y-auto">
                                                    {inv.description}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

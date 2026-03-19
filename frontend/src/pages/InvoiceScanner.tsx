import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, Upload, Loader2, FileText, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';

interface ScannedInvoice {
    id: string;
    name: string;
    originalName: string;
    description: string;
    url: string;
    category: string;
    createdAt: string;
    uploadedBy?: { name: string };
}

export function InvoiceScanner() {
    const [invoices, setInvoices] = useState<ScannedInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [scanResult, setScanResult] = useState<any>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<ScannedInvoice | null>(null);

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
                                                {scanResult.date ? new Date(scanResult.date).toLocaleDateString('en-IN') : 'N/A'}
                                            </div>
                                        </div>
                                    </div>

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
                                            onClick={() => setSelectedInvoice(selectedInvoice?.id === inv.id ? null : inv)}
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

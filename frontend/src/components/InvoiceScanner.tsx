/**
 * InvoiceScanner — Reusable AI Invoice OCR component
 *
 * Drop this into any page to add:
 *  - Drag & drop / click image/PDF upload
 *  - 3-tier AI OCR (Kaggle Vision → Tesseract → Demo)
 *  - Editable review panel for all extracted fields
 *  - Callback with confirmed data for parent form auto-fill
 *
 * Usage:
 *   <InvoiceScanner
 *     onDataExtracted={(data) => { ... populate your form ... }}
 *     context="finance"         // "finance" | "grn" | "po" | "general"
 *     linkedAssetId="..."       // optional
 *     linkedTicketId="..."      // optional
 *   />
 */

import { useState, useRef, useCallback } from 'react';
import api from '../lib/api';
import { Upload, X, FileText, Sparkles, Check, AlertCircle, RotateCcw, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    hsn?: string;
    taxPercent?: number;
}

interface ExtractedInvoice {
    invoiceNumber: string | null;
    date: string | null;
    dueDate: string | null;
    vendorName: string | null;
    vendorAddress: string | null;
    vendorGST: string | null;
    vendorPhone: string | null;
    vendorEmail: string | null;
    buyerName: string | null;
    subtotal: number | null;
    taxAmount: number | null;
    taxRate: number | null;
    discountAmount: number | null;
    totalAmount: number | null;
    currency: string;
    paymentTerms: string | null;
    notes: string | null;
    documentType: string;
    lineItems: LineItem[];
    confidenceScore: number;
}

interface InvoiceScannerProps {
    onDataExtracted: (data: ExtractedInvoice & { documentId?: string; matchedVendor?: any }) => void;
    context?: 'finance' | 'grn' | 'po' | 'general';
    linkedAssetId?: string;
    linkedTicketId?: string;
    compact?: boolean;
}

const CONFIDENCE_COLOR = (score: number) => {
    if (score >= 0.8) return { bg: 'rgba(16,185,129,0.12)', text: '#10b981', label: 'High Confidence' };
    if (score >= 0.5) return { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', label: 'Medium Confidence' };
    return { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', label: 'Low Confidence — Review Carefully' };
};

export function InvoiceScanner({ onDataExtracted, context = 'general', linkedAssetId, linkedTicketId, compact = false }: InvoiceScannerProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [extracted, setExtracted] = useState<(ExtractedInvoice & { documentId?: string; matchedVendor?: any; aiSource?: string }) | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [edited, setEdited] = useState<any>({});
    const [zoomOpen, setZoomOpen] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const processFile = useCallback(async (f: File) => {
        setFile(f);
        setError(null);
        setExtracted(null);

        // Local preview
        if (f.type.startsWith('image/')) {
            const url = URL.createObjectURL(f);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }

        // Send to OCR
        setScanning(true);
        const form = new FormData();
        form.append('invoice', f);
        if (linkedAssetId) form.append('linkedAssetId', linkedAssetId);
        if (linkedTicketId) form.append('linkedTicketId', linkedTicketId);

        try {
            const res = await api.post('/ocr/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const data = res.data.data;
            setExtracted({ ...data.extractedData, documentId: data.documentId, matchedVendor: data.matchedVendor, aiSource: data.aiSource });
            setEdited(data.extractedData);
        } catch (err: any) {
            setError(err.response?.data?.message || 'OCR scan failed. Please try again.');
        } finally {
            setScanning(false);
        }
    }, [linkedAssetId, linkedTicketId]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragActive(false);
        const f = e.dataTransfer.files[0];
        if (f) processFile(f);
    };

    const handleConfirm = () => {
        const finalData = editMode ? { ...extracted, ...edited } : extracted;
        if (finalData) onDataExtracted(finalData);
    };

    const reset = () => {
        setFile(null); setPreviewUrl(null); setExtracted(null); setEdited({});
        setScanning(false); setError(null); setEditMode(false);
    };

    const conf = extracted ? CONFIDENCE_COLOR(extracted.confidenceScore || 0) : null;

    return (
        <div style={{ fontFamily: 'system-ui, sans-serif' }}>
            {/* ── Source label hint ── */}
            {!file && (
                <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Sparkles style={{ width: '14px', height: '14px', color: '#10b981' }} />
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                        AI-powered OCR • Upload any invoice, receipt, or PO to auto-extract fields
                    </span>
                </div>
            )}

            {/* ── Drop Zone ── */}
            {!file && (
                <div
                    onDragEnter={e => { e.preventDefault(); setDragActive(true); }}
                    onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={e => { e.preventDefault(); setDragActive(false); }}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    style={{
                        border: `2px dashed ${dragActive ? '#10b981' : 'rgba(255,255,255,0.12)'}`,
                        borderRadius: '14px',
                        padding: compact ? '24px' : '40px 24px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        background: dragActive ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                        transition: 'all 0.2s',
                    }}
                >
                    <Upload style={{ width: compact ? '28px' : '40px', height: compact ? '28px' : '40px', color: '#10b981', margin: '0 auto', opacity: 0.7 }} />
                    <p style={{ marginTop: '12px', fontWeight: 600, fontSize: compact ? '13px' : '14px', color: 'var(--text-primary)' }}>
                        {dragActive ? 'Drop it here!' : 'Drag & Drop or Click to Upload'}
                    </p>
                    <p style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                        PNG, JPG, PDF • Max 5MB
                    </p>
                    <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                        onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
                </div>
            )}

            {/* ── File selected + preview ── */}
            {file && (
                <div style={{ display: 'flex', flexDirection: compact ? 'column' : 'row', gap: '14px' }}>
                    {/* Left: image preview */}
                    {previewUrl && (
                        <div style={{ position: 'relative', width: compact ? '100%' : '180px', flexShrink: 0 }}>
                            <img src={previewUrl} alt="Invoice preview"
                                style={{ width: '100%', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', objectFit: 'cover', maxHeight: '160px', cursor: 'zoom-in' }}
                                onClick={() => setZoomOpen(true)} />
                            <button onClick={() => setZoomOpen(true)}
                                style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', color: 'white', fontSize: '11px' }}>
                                <ZoomIn style={{ width: '11px', height: '11px' }} /> Zoom
                            </button>
                        </div>
                    )}
                    {!previewUrl && (
                        <div style={{ width: '60px', height: '60px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FileText style={{ width: '28px', height: '28px', color: '#10b981' }} />
                        </div>
                    )}

                    {/* Right: file name + status */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ minWidth: 0 }}>
                                <p style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <button onClick={reset} style={{ flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: '2px' }}>
                                <X style={{ width: '16px', height: '16px' }} />
                            </button>
                        </div>

                        {/* Scanning progress */}
                        {scanning && (
                            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {[0, 1, 2].map(i => (
                                        <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981', animation: `opsBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                                    ))}
                                </div>
                                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 500 }}>AI scanning invoice...</span>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center', color: '#ef4444', fontSize: '12px' }}>
                                <AlertCircle style={{ width: '13px', height: '13px', flexShrink: 0 }} /> {error}
                            </div>
                        )}

                        {/* Confidence badge */}
                        {extracted && conf && (
                            <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '20px', background: conf.bg, color: conf.text, fontSize: '11px', fontWeight: 600 }}>
                                <Sparkles style={{ width: '10px', height: '10px' }} />
                                {Math.round((extracted.confidenceScore || 0) * 100)}% • {conf.label}
                                {extracted.aiSource && <span style={{ opacity: 0.6 }}>• {extracted.aiSource}</span>}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Extracted Data Panel ── */}
            <AnimatePresence>
                {extracted && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{ marginTop: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden' }}>

                        {/* Panel header */}
                        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <Sparkles style={{ width: '13px', height: '13px', color: '#10b981' }} />
                                <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>Extracted Data</span>
                                {extracted.documentId && (
                                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>• Saved to Documents</span>
                                )}
                            </div>
                            <button onClick={() => setEditMode(e => !e)}
                                style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: editMode ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${editMode ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`, color: editMode ? '#10b981' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                                {editMode ? '✓ Editing' : '✏️ Edit'}
                            </button>
                        </div>

                        {/* Fields grid */}
                        <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                            {([
                                ['Invoice #', 'invoiceNumber'],
                                ['Date', 'date'],
                                ['Due Date', 'dueDate'],
                                ['Vendor', 'vendorName'],
                                ['Vendor GST', 'vendorGST'],
                                ['Total', 'totalAmount'],
                                ['Tax', 'taxAmount'],
                                ['Currency', 'currency'],
                                ['Doc Type', 'documentType'],
                            ] as [string, string][]).map(([label, key]) => {
                                const val = editMode ? edited[key] : (extracted as any)[key];
                                if (!val && !editMode) return null;
                                return (
                                    <div key={key}>
                                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>{label}</p>
                                        {editMode ? (
                                            <input
                                                value={edited[key] ?? ''}
                                                onChange={e => setEdited((prev: any) => ({ ...prev, [key]: e.target.value }))}
                                                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}
                                            />
                                        ) : (
                                            <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                                                {key === 'totalAmount' || key === 'taxAmount'
                                                    ? `₹${Number(val).toLocaleString('en-IN')}`
                                                    : String(val)}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Matched vendor */}
                        {extracted.matchedVendor && (
                            <div style={{ margin: '0 14px 12px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', fontSize: '12px', color: '#10b981' }}>
                                ✅ Matched vendor in system: <strong>{extracted.matchedVendor.name}</strong>
                            </div>
                        )}

                        {/* Line items */}
                        {extracted.lineItems && extracted.lineItems.length > 0 && (
                            <div style={{ margin: '0 14px 14px', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Line Items ({extracted.lineItems.length})</p>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                                        <thead>
                                            <tr style={{ color: 'rgba(255,255,255,0.4)' }}>
                                                {['Description', 'Qty', 'Unit Price', 'Total'].map(h => (
                                                    <th key={h} style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {extracted.lineItems.map((item, i) => (
                                                <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <td style={{ padding: '5px 6px', color: 'var(--text-primary)' }}>{item.description}</td>
                                                    <td style={{ padding: '5px 6px', color: 'rgba(255,255,255,0.6)' }}>{item.quantity}</td>
                                                    <td style={{ padding: '5px 6px', color: 'rgba(255,255,255,0.6)' }}>₹{Number(item.unitPrice).toLocaleString('en-IN')}</td>
                                                    <td style={{ padding: '5px 6px', color: '#10b981', fontWeight: 600 }}>₹{Number(item.total).toLocaleString('en-IN')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ padding: '10px 14px 14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                                onClick={handleConfirm}
                                style={{ flex: 1, minWidth: '120px', padding: '9px 16px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <Check style={{ width: '14px', height: '14px' }} />
                                {context === 'finance' ? 'Fill Expense Form' : context === 'grn' ? 'Fill GRN Form' : context === 'po' ? 'Fill PO Form' : 'Use This Data'}
                            </button>
                            <button
                                onClick={reset}
                                style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <RotateCcw style={{ width: '12px', height: '12px' }} /> Rescan
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Zoom modal ── */}
            <AnimatePresence>
                {zoomOpen && previewUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setZoomOpen(false)}
                        style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <img src={previewUrl} alt="Invoice" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()} />
                        <button onClick={() => setZoomOpen(false)} style={{ position: 'fixed', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: 'white' }}>
                            <X style={{ width: '20px', height: '20px' }} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes opsBounce {
                    0%,80%,100% { transform: scale(0.55); opacity: 0.35; }
                    40% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

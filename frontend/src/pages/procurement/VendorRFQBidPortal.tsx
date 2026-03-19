import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Loader2, Send, Building2, CalendarDays, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

interface RFQItem {
    id: string;
    description: string;
    quantity: number;
    unit: string;
    specs?: string;
}

interface RFQData {
    id: string;
    rfqNumber: string;
    title: string;
    description?: string;
    status: string;
    requiredByDate?: string;
    createdAt: string;
    items: RFQItem[];
    quotesReceived: number;
}

interface BidLine {
    rfqItemId: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export function VendorRFQBidPortal() {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();

    const [rfq, setRfq] = useState<RFQData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [bidLines, setBidLines] = useState<BidLine[]>([]);

    const [form, setForm] = useState({
        vendorCode: searchParams.get('vendorCode') || '',
        email: '',
        currency: 'INR',
        validUntil: '',
    });

    const rfqClosed = useMemo(() => {
        if (!rfq) return false;
        return ['AWARDED', 'CLOSED'].includes(rfq.status);
    }, [rfq]);

    useEffect(() => {
        if (!id) return;

        const fetchRFQ = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const res = await axios.get(`${API_BASE_URL}/vendor-portal/rfq/${id}`);
                if (res.data?.success) {
                    const rfqData = res.data.data as RFQData;
                    setRfq(rfqData);
                    setBidLines(
                        rfqData.items.map((item) => ({
                            rfqItemId: item.id,
                            description: item.description,
                            quantity: item.quantity,
                            unit: item.unit,
                            unitPrice: '',
                        }))
                    );
                }
            } catch (err: any) {
                setError(err?.response?.data?.message || 'Unable to load RFQ details.');
            } finally {
                setIsLoading(false);
            }
        };

        void fetchRFQ();
    }, [id]);

    const computedTotal = useMemo(() => {
        return bidLines.reduce((sum, line) => {
            const price = Number(line.unitPrice || 0);
            return sum + (Number.isFinite(price) ? price * line.quantity : 0);
        }, 0);
    }, [bidLines]);

    const hasCompleteLinePricing = useMemo(() => {
        if (bidLines.length === 0) return false;
        return bidLines.every((line) => line.unitPrice !== '' && Number(line.unitPrice) >= 0);
    }, [bidLines]);

    const submitBid = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || rfqClosed) return;

        try {
            setIsSubmitting(true);
            setError(null);
            setSuccessMessage(null);

            const payload = {
                vendorCode: form.vendorCode.trim(),
                email: form.email.trim() || undefined,
                currency: form.currency,
                totalAmount: computedTotal,
                validUntil: form.validUntil || undefined,
                items: bidLines.map((line) => {
                    const unitPrice = Number(line.unitPrice || 0);
                    return {
                        rfqItemId: line.rfqItemId,
                        description: line.description,
                        quantity: line.quantity,
                        unit: line.unit,
                        unitPrice,
                        totalPrice: unitPrice * line.quantity,
                    };
                }),
            };

            const res = await axios.post(`${API_BASE_URL}/vendor-portal/rfq/${id}/bid`, payload);
            if (res.data?.success) {
                setSuccessMessage(res.data.message || 'Quotation submitted successfully.');
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to submit quotation.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen grid place-items-center bg-[var(--bg-primary)] px-4">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8 md:py-12">
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 md:p-8">
                    <p className="text-xs tracking-[0.18em] uppercase text-[var(--text-muted)] mb-2">Vendor RFQ Bid Portal</p>
                    <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">Submit Your Quotation</h1>
                    <p className="text-sm md:text-base text-[var(--text-secondary)] mt-2">
                        Enter your vendor code and submit your competitive bid.
                    </p>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 px-4 py-3 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> {error}
                    </div>
                )}

                {successMessage && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-4 py-3 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> {successMessage}
                    </div>
                )}

                {rfq && (
                    <div className="grid gap-6 lg:grid-cols-5">
                        <motion.section
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="lg:col-span-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">RFQ Number</div>
                                    <div className="font-mono text-[var(--primary)] text-sm mt-1">{rfq.rfqNumber}</div>
                                </div>
                                <span className="text-xs px-2 py-1 rounded-full border border-[var(--border-color)] text-[var(--text-secondary)]">
                                    {rfq.status}
                                </span>
                            </div>

                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-4">{rfq.title}</h2>
                            {rfq.description && <p className="text-[var(--text-secondary)] mt-2">{rfq.description}</p>}

                            <div className="grid sm:grid-cols-2 gap-3 mt-5 text-sm">
                                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3">
                                    <div className="text-[var(--text-muted)] mb-1 flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Required By</div>
                                    <div className="text-[var(--text-primary)] font-medium">{rfq.requiredByDate ? new Date(rfq.requiredByDate).toLocaleDateString() : 'Not specified'}</div>
                                </div>
                                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3">
                                    <div className="text-[var(--text-muted)] mb-1 flex items-center gap-2"><Building2 className="w-4 h-4" /> Quotes Received</div>
                                    <div className="text-[var(--text-primary)] font-medium">{rfq.quotesReceived}</div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <div className="text-sm text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Requested Items
                                </div>
                                <div className="overflow-auto rounded-xl border border-[var(--border-color)]">
                                    <table className="w-full text-sm">
                                        <thead className="bg-[var(--bg-overlay)] text-[var(--text-muted)]">
                                            <tr>
                                                <th className="text-left p-3 font-medium">Description</th>
                                                <th className="text-right p-3 font-medium">Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rfq.items.map((item) => (
                                                <tr key={item.id} className="border-t border-[var(--border-color)]">
                                                    <td className="p-3 text-[var(--text-primary)]">{item.description}</td>
                                                    <td className="p-3 text-right text-[var(--text-secondary)]">{item.quantity} {item.unit}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.section>

                        <motion.section
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 }}
                            className="lg:col-span-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6"
                        >
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Your Bid</h3>

                            {rfqClosed ? (
                                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
                                    This RFQ is {rfq.status.toLowerCase()}. Bid submission is closed.
                                </div>
                            ) : (
                                <form onSubmit={submitBid} className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Vendor Code</label>
                                        <input
                                            required
                                            value={form.vendorCode}
                                            onChange={(e) => setForm((p) => ({ ...p, vendorCode: e.target.value }))}
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] px-3 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                            placeholder="e.g. VND-001234"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Vendor Email (optional)</label>
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] px-3 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                            placeholder="name@vendor.com"
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-sm text-[var(--text-secondary)] mb-1">Currency</label>
                                            <select
                                                value={form.currency}
                                                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] px-3 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                            >
                                                <option value="INR">INR</option>
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                                <option value="GBP">GBP</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm text-[var(--text-secondary)] mb-1">Total Amount (Auto)</label>
                                            <input
                                                readOnly
                                                type="number"
                                                value={computedTotal.toFixed(2)}
                                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] px-3 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-[var(--border-color)] overflow-hidden">
                                        <div className="bg-[var(--bg-overlay)] px-3 py-2 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Item-wise Bid</div>
                                        <div className="p-3 space-y-3">
                                            {bidLines.map((line) => (
                                                <div key={line.rfqItemId} className="rounded-lg border border-[var(--border-color)] p-3">
                                                    <div className="text-sm text-[var(--text-primary)] font-medium">{line.description}</div>
                                                    <div className="text-xs text-[var(--text-muted)] mt-0.5">Qty: {line.quantity} {line.unit}</div>
                                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                                        <input
                                                            min="0"
                                                            step="0.01"
                                                            type="number"
                                                            value={line.unitPrice}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setBidLines((prev) => prev.map((row) => row.rfqItemId === line.rfqItemId ? { ...row, unitPrice: val } : row));
                                                            }}
                                                            className="rounded-md border border-[var(--border-color)] bg-[var(--bg-overlay)] px-2 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                                            placeholder="Unit price"
                                                            required
                                                        />
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value={(Number(line.unitPrice || 0) * line.quantity).toFixed(2)}
                                                            className="rounded-md border border-[var(--border-color)] bg-[var(--bg-overlay)] px-2 py-2 text-sm text-[var(--text-secondary)]"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Valid Until (optional)</label>
                                        <input
                                            type="date"
                                            value={form.validUntil}
                                            onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))}
                                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] px-3 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !form.vendorCode || !hasCompleteLinePricing || computedTotal <= 0}
                                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] text-black font-semibold px-4 py-3 hover:brightness-110 disabled:opacity-60"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        {isSubmitting ? 'Submitting...' : 'Submit Bid'}
                                    </button>
                                </form>
                            )}
                        </motion.section>
                    </div>
                )}
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Building2, CheckCircle, Scale, DollarSign, Calendar, Upload, Award } from 'lucide-react';
import api from '../../lib/api';

interface RFQItem {
    id: string;
    description: string;
    quantity: number;
    unit: string;
    specs: string;
}

interface Quotation {
    id: string;
    vendorId: string;
    totalAmount: number;
    currency: string;
    validUntil: string;
    status: string;
    submittedAt: string;
}

interface RFQ {
    id: string;
    rfqNumber: string;
    title: string;
    description: string;
    status: string;
    requiredByDate: string;
    createdAt: string;
    items: RFQItem[];
    quotations: Quotation[];
}

interface Vendor {
    id: string;
    name: string;
    vendorCode: string;
    rating: number;
}

interface ComparisonData {
    id: string;
    vendor: { name: string, rating: number };
    totalAmount: number;
    currency: string;
    rank: number;
    priceDiffFromLowest: number;
    status: string;
    baseAmount?: number;
    baseCurrency?: string;
}

export function RFQDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [rfq, setRfq] = useState<RFQ | null>(null);
    const [comparison, setComparison] = useState<ComparisonData[] | null>(null);
    const [vendors, setVendors] = useState<Vendor[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'details' | 'quotes' | 'compare'>('details');

    // New Quotation Form
    const [isAddingQuote, setIsAddingQuote] = useState(false);
    const [newQuote, setNewQuote] = useState({ vendorId: '', totalAmount: '', currency: 'INR', validUntil: '' });
    const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

    // Awarding
    const [isAwarding, setIsAwarding] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            fetchRFQ();
            fetchVendors();
        }
    }, [id]);

    const fetchRFQ = async () => {
        try {
            setIsLoading(true);
            const res = await api.get(`/rfq/${id}`);
            if (res.data.success) {
                setRfq(res.data.data);

                // If there are quotes, also fetch comparison
                if (res.data.data.quotations?.length > 0) {
                    const compRes = await api.get(`/rfq/${id}/compare`);
                    if (compRes.data.success) {
                        setComparison(compRes.data.data.comparison);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch RFQ details', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchVendors = async () => {
        try {
            const res = await api.get('/vendors');
            if (res.data.success) {
                setVendors(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch vendors', error);
        }
    };

    const handleSubmitQuote = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmittingQuote(true);
            const res = await api.post(`/rfq/${id}/quotation`, {
                ...newQuote,
                totalAmount: parseFloat(newQuote.totalAmount)
            });
            if (res.data.success) {
                setIsAddingQuote(false);
                setNewQuote({ vendorId: '', totalAmount: '', currency: 'INR', validUntil: '' });
                fetchRFQ(); // Refresh
                setActiveTab('compare');
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to submit quotation');
        } finally {
            setIsSubmittingQuote(false);
        }
    };

    const handleAward = async (quotationId: string) => {
        if (!confirm('Are you sure you want to award this RFQ to this vendor? This will auto-create a Purchase Order and reject all other quotes.')) return;

        try {
            setIsAwarding(quotationId);
            const res = await api.post(`/rfq/${id}/award`, { quotationId });
            if (res.data.success) {
                alert(`Success: ${res.data.message}`);
                fetchRFQ();
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to award RFQ');
        } finally {
            setIsAwarding(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
            case 'SENT': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'CLOSED': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'AWARDED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'ACCEPTED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'REJECTED': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'SUBMITTED': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;
    if (!rfq) return <div className="text-center py-12 text-[var(--text-muted)]">RFQ not found.</div>;

    const availableVendors = vendors.filter(v => !rfq.quotations.some(q => q.vendorId === v.id));

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <button
                onClick={() => navigate('/procurement/rfq')}
                className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to RFQs
            </button>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{rfq.title}</h1>
                            <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(rfq.status)} font-semibold tracking-wider`}>
                                {rfq.status}
                            </span>
                        </div>
                        <p className="font-mono text-[var(--primary)]">{rfq.rfqNumber}</p>
                    </div>
                    {rfq.status !== 'AWARDED' && (
                        <button
                            onClick={() => setIsAddingQuote(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-overlay)] border border-[var(--border-color)] hover:border-[var(--primary)] text-[var(--text-primary)] rounded-lg transition-colors"
                        >
                            <Upload className="w-4 h-4" /> Record Quotation
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 bg-[var(--bg-overlay)] rounded-xl border border-[var(--border-color)] mt-6 text-sm">
                    <div>
                        <span className="text-[var(--text-muted)] block mb-1">Created On</span>
                        <span className="text-[var(--text-primary)] font-medium flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
                            {new Date(rfq.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    <div>
                        <span className="text-[var(--text-muted)] block mb-1">Required By</span>
                        <span className="text-[var(--text-primary)] font-medium flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[var(--primary)]" />
                            {rfq.requiredByDate ? new Date(rfq.requiredByDate).toLocaleDateString() : 'Unspecified'}
                        </span>
                    </div>
                    <div>
                        <span className="text-[var(--text-muted)] block mb-1">Total Items</span>
                        <span className="text-[var(--text-primary)] font-mono font-medium">{rfq.items.length}</span>
                    </div>
                    <div>
                        <span className="text-[var(--text-muted)] block mb-1">Quotations Received</span>
                        <span className="text-[var(--text-primary)] font-mono font-medium">{rfq.quotations.length}</span>
                    </div>
                </div>
            </div>

            {/* Submitting Quote Modal */}
            {isAddingQuote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl p-6 w-full max-w-md"
                    >
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Record Vendor Quotation</h2>
                        <form onSubmit={handleSubmitQuote} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Select Vendor</label>
                                <select
                                    required
                                    className="w-full p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                    value={newQuote.vendorId}
                                    onChange={e => setNewQuote({ ...newQuote, vendorId: e.target.value })}
                                >
                                    <option value="" disabled>Select a vendor...</option>
                                    {availableVendors.map(v => (
                                        <option key={v.id} value={v.id}>{v.name} ({v.vendorCode})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Currency</label>
                                    <select
                                        className="w-full p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                        value={newQuote.currency}
                                        onChange={e => setNewQuote({ ...newQuote, currency: e.target.value })}
                                    >
                                        <option value="INR">INR</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                        <option value="GBP">GBP</option>
                                        <option value="CAD">CAD</option>
                                        <option value="AUD">AUD</option>
                                        <option value="JPY">JPY</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Total Amount</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                        <input
                                            type="number"
                                            min="0" step="0.01"
                                            required
                                            className="w-full pl-10 pr-4 p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                            value={newQuote.totalAmount}
                                            onChange={e => setNewQuote({ ...newQuote, totalAmount: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Valid Until (optional)</label>
                                <input
                                    type="date"
                                    className="w-full p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                    value={newQuote.validUntil}
                                    onChange={e => setNewQuote({ ...newQuote, validUntil: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] mt-6">
                                <button type="button" onClick={() => setIsAddingQuote(false)} className="px-4 py-2 text-[var(--text-secondary)] hover:text-white transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmittingQuote || !newQuote.vendorId || !newQuote.totalAmount} className="flex items-center gap-2 px-6 py-2 bg-[var(--primary)] text-black font-medium rounded-lg hover:shadow-[0_0_15px_rgba(185,255,102,0.4)] transition-all disabled:opacity-50">
                                    {isSubmittingQuote ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    Submit
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* TABS */}
            <div className="flex space-x-1 bg-[var(--bg-card)] border border-[var(--border-color)] p-1 rounded-xl">
                <button
                    onClick={() => setActiveTab('details')}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'details' ? 'bg-[var(--primary)] text-black shadow-sm' : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-overlay)]'}`}
                >
                    Line Items
                </button>
                <button
                    onClick={() => setActiveTab('compare')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'compare' ? 'bg-[var(--primary)] text-black shadow-sm' : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-overlay)]'}`}
                >
                    <Scale className="w-4 h-4" /> Compare Quotes ({rfq.quotations.length})
                </button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'details' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-overlay)]">
                            <h3 className="font-semibold text-[var(--text-primary)]">Requested Line Items</h3>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[var(--border-color)]">
                                    <th className="p-4 font-medium text-[var(--text-muted)] text-sm">Description</th>
                                    <th className="p-4 font-medium text-[var(--text-muted)] text-sm">Specs / Notes</th>
                                    <th className="p-4 font-medium text-[var(--text-muted)] text-sm text-right">Quantity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rfq.items.map((item, idx) => (
                                    <tr key={idx} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-overlay)]/50 transition-colors">
                                        <td className="p-4 text-[var(--text-primary)] font-medium">{item.description}</td>
                                        <td className="p-4 text-[var(--text-secondary)] text-sm max-w-sm truncate">{item.specs || '-'}</td>
                                        <td className="p-4 text-right">
                                            <span className="font-mono text-[var(--primary)] font-medium">{item.quantity}</span>
                                            <span className="text-xs text-[var(--text-muted)] ml-1 uppercase">{item.unit}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {activeTab === 'compare' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    {rfq.quotations.length === 0 ? (
                        <div className="text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl py-16 text-[var(--text-muted)]">
                            <Scale className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p>No quotations have been received for this RFQ yet.</p>
                            {rfq.status !== 'AWARDED' && (
                                <button onClick={() => setIsAddingQuote(true)} className="mt-4 text-[var(--primary)] hover:underline text-sm font-medium">Record a Quote</button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {comparison?.map((quote) => (
                                <div key={quote.id} className={`bg-[var(--bg-card)] border rounded-xl p-6 transition-all ${quote.status === 'ACCEPTED' ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' :
                                    quote.rank === 1 && rfq.status !== 'AWARDED' ? 'border-[var(--primary)]' : 'border-[var(--border-color)]'
                                    }`}>
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${quote.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-400' :
                                                quote.rank === 1 ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'bg-[var(--bg-overlay)] text-[var(--text-muted)]'
                                                }`}>
                                                #{quote.rank}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{quote.vendor.name}</h3>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(quote.status)} uppercase tracking-wider font-semibold`}>
                                                        {quote.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <div className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
                                                        <Building2 className="w-4 h-4" /> Vendor Rating: {quote.vendor.rating}/5
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col md:items-end w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-[var(--border-color)] md:border-t-0 p-2 md:p-0">
                                            <div className="text-2xl font-mono font-bold text-[var(--primary)] text-right">
                                                {quote.currency} {quote.totalAmount.toLocaleString()}
                                            </div>
                                            {quote.baseCurrency && quote.currency !== quote.baseCurrency && (
                                                <div className="text-sm text-[var(--text-secondary)] font-mono text-right">
                                                    ~ {quote.baseCurrency} {quote.baseAmount?.toLocaleString() || 0}
                                                </div>
                                            )}
                                            {quote.rank > 1 && (
                                                <div className="text-xs text-red-400 mt-1 text-right">
                                                    +{quote.baseCurrency || quote.currency} {quote.priceDiffFromLowest.toLocaleString()} from lowest
                                                </div>
                                            )}
                                            {quote.rank === 1 && rfq.status !== 'AWARDED' && (
                                                <div className="text-xs text-emerald-400 mt-1 text-right font-bold">
                                                    Lowest Bid!
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {rfq.status !== 'AWARDED' && (
                                        <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex justify-end">
                                            <button
                                                onClick={() => handleAward(quote.id)}
                                                disabled={isAwarding === quote.id}
                                                className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-all text-sm ${quote.rank === 1
                                                    ? 'bg-[var(--primary)] text-black hover:shadow-[0_0_15px_rgba(185,255,102,0.4)]'
                                                    : 'bg-[var(--bg-overlay)] text-[var(--text-primary)] hover:border-[var(--primary)] border border-transparent'
                                                    }`}
                                            >
                                                {isAwarding === quote.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                                                Award Contract & PO
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}

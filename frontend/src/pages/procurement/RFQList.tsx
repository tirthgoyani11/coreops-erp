import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    FileSearch,
    Plus,
    Search,
    Loader2,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    FileText,
    Sparkles,
    Calendar,
    Clock3,
} from 'lucide-react';
import api from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface RFQItem {
    id?: string;
    description: string;
    quantity: number;
    unit: string;
    specs?: string;
}

interface RFQ {
    id: string;
    rfqNumber: string;
    title: string;
    status: 'DRAFT' | 'SENT' | 'CLOSED' | 'AWARDED';
    requiredByDate: string;
    createdAt: string;
    _count?: { quotations: number };
}

const DEFAULT_RFQ_ITEM: RFQItem = { description: '', quantity: 1, unit: 'pieces', specs: '' };

type StatusFilter = 'ALL' | 'DRAFT' | 'SENT' | 'CLOSED' | 'AWARDED';

export function RFQList() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [rfqs, setRfqs] = useState<RFQ[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [isCreating, setIsCreating] = useState(false);

    // Form state
    const [newRFQ, setNewRFQ] = useState({
        title: '',
        description: '',
        requiredByDate: '',
        items: [{ ...DEFAULT_RFQ_ITEM }] as RFQItem[]
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canCreateRFQ = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user?.role || '');

    useEffect(() => {
        void fetchRFQs();
    }, [statusFilter]);

    const fetchRFQs = async () => {
        try {
            setIsLoading(true);
            setErrorMessage('');
            const statusQuery = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
            const res = await api.get(`/procurement-ext/rfq${statusQuery}`);
            if (res.data.success) {
                setRfqs(Array.isArray(res.data.data) ? res.data.data : []);
            }
        } catch (error) {
            console.error('Failed to fetch RFQs', error);
            setErrorMessage('Could not load RFQs. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!canCreateRFQ) {
            setErrorMessage('You do not have permission to create RFQs.');
            return;
        }

        const sanitizedItems = (Array.isArray(newRFQ.items) ? newRFQ.items : [])
            .map((item) => ({
                ...item,
                description: String(item.description || '').trim(),
                unit: String(item.unit || '').trim(),
                specs: String(item.specs || '').trim(),
                quantity: Number(item.quantity || 0),
            }))
            .filter((item) => item.description && item.unit && item.quantity > 0);

        if (!newRFQ.title.trim()) {
            setErrorMessage('RFQ title is required.');
            return;
        }

        if (sanitizedItems.length === 0) {
            setErrorMessage('Add at least one valid item with description, quantity, and unit.');
            return;
        }

        try {
            setIsSubmitting(true);
            setErrorMessage('');
            const payload = {
                title: newRFQ.title.trim(),
                description: newRFQ.description.trim(),
                requiredByDate: newRFQ.requiredByDate || undefined,
                items: sanitizedItems,
            };
            const res = await api.post('/procurement-ext/rfq', payload);
            if (res.data.success) {
                await fetchRFQs();
                setIsCreating(false);
                setNewRFQ({
                    title: '',
                    description: '',
                    requiredByDate: '',
                    items: [{ ...DEFAULT_RFQ_ITEM }]
                });
            }
        } catch (error: any) {
            setErrorMessage(error.response?.data?.message || 'Failed to create RFQ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const addItemRow = () => {
        setNewRFQ({
            ...newRFQ,
            items: [...(Array.isArray(newRFQ.items) ? newRFQ.items : []), { ...DEFAULT_RFQ_ITEM }]
        });
    };

    const updateItemRow = (index: number, field: keyof RFQItem, value: string | number) => {
        const newItems = [...(Array.isArray(newRFQ.items) ? newRFQ.items : [])];
        newItems[index] = { ...newItems[index], [field]: value };
        setNewRFQ({ ...newRFQ, items: newItems });
    };

    const removeItemRow = (index: number) => {
        if (!Array.isArray(newRFQ.items) || newRFQ.items.length === 1) return;
        setNewRFQ({
            ...newRFQ,
            items: newRFQ.items.filter((_, i) => i !== index)
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
            case 'SENT': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'CLOSED': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'AWARDED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    const filteredRFQs = useMemo(() => rfqs.filter((rfq) => (
        rfq.rfqNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rfq.title.toLowerCase().includes(searchTerm.toLowerCase())
    )), [rfqs, searchTerm]);

    const stats = useMemo(() => {
        const draft = rfqs.filter((rfq) => rfq.status === 'DRAFT').length;
        const sent = rfqs.filter((rfq) => rfq.status === 'SENT').length;
        const awarded = rfqs.filter((rfq) => rfq.status === 'AWARDED').length;
        const open = rfqs.filter((rfq) => ['DRAFT', 'SENT'].includes(rfq.status)).length;
        const totalQuotes = rfqs.reduce((sum, rfq) => sum + Number(rfq._count?.quotations || 0), 0);
        return { draft, sent, awarded, open, totalQuotes };
    }, [rfqs]);

    const orchestratorSignal = stats.sent > 3
        ? 'RFQ cycle is active. Prioritize quote comparison and award high-urgency items first.'
        : stats.awarded > 0
            ? 'Awarded RFQs are healthy. Track post-award PO conversion and vendor performance.'
            : 'RFQ desk is stable. Focus on quality specs to improve quote competitiveness.';

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <FileSearch className="w-6 h-6 text-[var(--primary)]" />
                        Requests for Quotation
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Invite multiple vendors, compare bids, and drive controlled sourcing decisions.
                    </p>
                </div>
                <button
                    onClick={() => canCreateRFQ && setIsCreating(true)}
                    disabled={!canCreateRFQ}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-black rounded-lg hover:shadow-[0_0_15px_rgba(185,255,102,0.4)] transition-all font-medium"
                    title={canCreateRFQ ? 'Create RFQ' : 'Only managers/admin can create RFQs'}
                >
                    <Plus className="w-4 h-4" />
                    Create RFQ
                </button>
            </div>

            {errorMessage && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center justify-between gap-4">
                    <span>{errorMessage}</span>
                    <button
                        onClick={() => setErrorMessage('')}
                        className="text-red-200 hover:text-white"
                        type="button"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Draft</div>
                    <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{stats.draft}</div>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-blue-300">Sent</div>
                    <div className="text-2xl font-bold text-blue-200 mt-2">{stats.sent}</div>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">Awarded</div>
                    <div className="text-2xl font-bold text-emerald-200 mt-2">{stats.awarded}</div>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Open RFQs</div>
                    <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{stats.open}</div>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Quotes Received</div>
                    <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{stats.totalQuotes}</div>
                </div>
            </div>

            <div className="bg-[radial-gradient(circle_at_top_right,rgba(185,255,102,0.12),transparent_45%),var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">RFQ Orchestrator</div>
                        <p className="text-[var(--text-primary)] mt-2">{orchestratorSignal}</p>
                    </div>
                    <Sparkles className="w-5 h-5 text-[var(--primary)]" />
                </div>
            </div>

            {isCreating && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-lg"
                >
                    <form onSubmit={handleCreate} className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-[var(--text-primary)]">New RFQ Draft</h2>
                            <button type="button" onClick={() => setIsCreating(false)} className="text-[var(--text-muted)] hover:text-white">
                                <AlertCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">RFQ Title *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Q3 Office IT Equipment Supply"
                                    className="w-full p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                    value={newRFQ.title}
                                    onChange={(event) => setNewRFQ({ ...newRFQ, title: event.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Required By Date</label>
                                <input
                                    type="date"
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                    value={newRFQ.requiredByDate}
                                    onChange={(event) => setNewRFQ({ ...newRFQ, requiredByDate: event.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Description</label>
                                <textarea
                                    rows={2}
                                    placeholder="Scope of this RFQ..."
                                    className="w-full p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] resize-none"
                                    value={newRFQ.description}
                                    onChange={(event) => setNewRFQ({ ...newRFQ, description: event.target.value })}
                                />
                            </div>
                        </div>

                        <div className="mb-4 flex justify-between items-center bg-[var(--bg-overlay)] p-3 rounded-lg border border-[var(--border-color)]">
                            <h3 className="font-medium text-[var(--text-primary)]">Required Items</h3>
                            <button type="button" onClick={addItemRow} className="text-sm flex items-center gap-1 text-[var(--primary)] font-medium">
                                <Plus className="w-4 h-4" /> Add Row
                            </button>
                        </div>

                        <div className="space-y-3 mb-6">
                            {(Array.isArray(newRFQ.items) ? newRFQ.items : []).map((item, index) => (
                                <div key={index} className="flex flex-wrap md:flex-nowrap gap-4 items-start bg-[var(--bg-overlay)] p-4 rounded-lg border border-[var(--border-color)]">
                                    <div className="flex-1 min-w-[200px]">
                                        <input
                                            type="text"
                                            required
                                            placeholder="Item Description"
                                            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-[var(--text-primary)] mb-2"
                                            value={item.description}
                                            onChange={(event) => updateItemRow(index, 'description', event.target.value)}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Technical Specs (optional)"
                                            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-[var(--text-secondary)] text-sm"
                                            value={item.specs}
                                            onChange={(event) => updateItemRow(index, 'specs', event.target.value)}
                                        />
                                    </div>
                                    <div className="w-24">
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            placeholder="Qty"
                                            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
                                            value={item.quantity}
                                            onChange={(event) => updateItemRow(index, 'quantity', Math.max(1, parseInt(event.target.value, 10) || 1))}
                                        />
                                    </div>
                                    <div className="w-32">
                                        <input
                                            type="text"
                                            required
                                            placeholder="Unit"
                                            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
                                            value={item.unit}
                                            onChange={(event) => updateItemRow(index, 'unit', event.target.value)}
                                        />
                                    </div>
                                    <div className="pt-2">
                                        <button type="button" onClick={() => removeItemRow(index)} className="text-red-400 hover:text-red-300 disabled:opacity-30" disabled={!Array.isArray(newRFQ.items) || newRFQ.items.length === 1}>
                                            <AlertCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                            <button type="button" onClick={() => setIsCreating(false)} className="px-5 py-2 text-[var(--text-secondary)] hover:text-white">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-[var(--primary)] text-black rounded-lg font-medium disabled:opacity-50">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Save RFQ
                            </button>
                        </div>
                    </form>
                </motion.div>
            )}

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-4 border-b border-[var(--border-color)] flex flex-col md:flex-row gap-3 md:justify-between md:items-center bg-[var(--bg-overlay)]">
                    <div className="relative w-full md:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                        <input
                            type="text"
                            placeholder="Search RFQs..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(['ALL', 'DRAFT', 'SENT', 'CLOSED', 'AWARDED'] as StatusFilter[]).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-2.5 py-1 text-xs rounded-full border ${statusFilter === status ? 'bg-[var(--primary)] text-black border-[var(--primary)]' : 'text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--primary)]'}`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 p-4">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
                    ) : filteredRFQs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] space-y-4">
                            <FileSearch className="w-12 h-12 opacity-30" />
                            <p>No RFQs found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredRFQs.map((rfq) => (
                                <motion.button
                                    whileHover={{ y: -2 }}
                                    key={rfq.id}
                                    onClick={() => navigate(`/procurement/rfq/${rfq.id}`)}
                                    className="text-left bg-[var(--bg-overlay)] border border-[var(--border-color)] p-5 rounded-xl hover:border-[var(--primary)]/50 transition-all flex flex-col h-full group"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="font-bold text-[var(--text-primary)] text-lg">{rfq.rfqNumber}</span>
                                        <span className={`text-[10px] px-2 py-1 rounded-full border ${getStatusColor(rfq.status)} font-semibold tracking-wider`}>
                                            {rfq.status}
                                        </span>
                                    </div>

                                    <h3 className="font-medium text-[var(--text-primary)] mb-4 line-clamp-2 min-h-[3rem]">{rfq.title}</h3>

                                    <div className="space-y-2 text-xs text-[var(--text-secondary)] mb-4">
                                        <div className="flex items-center gap-2"><Calendar className="w-3 h-3" /> Created {new Date(rfq.createdAt).toLocaleDateString()}</div>
                                        <div className="flex items-center gap-2"><Clock3 className="w-3 h-3" /> Required {rfq.requiredByDate ? new Date(rfq.requiredByDate).toLocaleDateString() : 'Not specified'}</div>
                                    </div>

                                    <div className="flex justify-between items-center w-full mt-auto pt-4 border-t border-[var(--border-color)]">
                                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                            <FileText className="w-4 h-4 text-[var(--primary)]" />
                                            {rfq._count?.quotations || 0} Quotes
                                        </div>
                                        <div className="flex items-center gap-1 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors text-sm font-medium">
                                            View Details <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

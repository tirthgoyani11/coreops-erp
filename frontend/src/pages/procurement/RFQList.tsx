import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileSearch, Plus, Search, Loader2, ArrowRight, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import api from '../../lib/api';
import { useNavigate } from 'react-router-dom';

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
    status: string;
    requiredByDate: string;
    createdAt: string;
    _count?: { quotations: number };
}

export function RFQList() {
    const navigate = useNavigate();
    const [rfqs, setRfqs] = useState<RFQ[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Form state
    const [newRFQ, setNewRFQ] = useState({
        title: '',
        description: '',
        requiredByDate: '',
        items: [{ description: '', quantity: 1, unit: 'pieces', specs: '' }] as RFQItem[]
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchRFQs();
    }, []);

    const fetchRFQs = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/procurement-ext/rfq');
            if (res.data.success) {
                setRfqs(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch RFQs', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const res = await api.post('/procurement-ext/rfq', newRFQ);
            if (res.data.success) {
                fetchRFQs();
                setIsCreating(false);
                setNewRFQ({
                    title: '',
                    description: '',
                    requiredByDate: '',
                    items: [{ description: '', quantity: 1, unit: 'pieces', specs: '' }]
                });
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to create RFQ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const addItemRow = () => {
        setNewRFQ({
            ...newRFQ,
            items: [...newRFQ.items, { description: '', quantity: 1, unit: 'pieces', specs: '' }]
        });
    };

    const updateItemRow = (index: number, field: keyof RFQItem, value: any) => {
        const newItems = [...newRFQ.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setNewRFQ({ ...newRFQ, items: newItems });
    };

    const removeItemRow = (index: number) => {
        if (newRFQ.items.length === 1) return;
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

    const filteredRFQs = rfqs.filter(rfq =>
        rfq.rfqNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rfq.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <FileSearch className="w-6 h-6 text-[var(--primary)]" />
                        Requests for Quotation (RFQ)
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Invite multiple vendors to bid on your procurement needs.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-black rounded-lg hover:shadow-[0_0_15px_rgba(185,255,102,0.4)] transition-all font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Create RFQ
                </button>
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
                                <AlertCircle className="w-5 h-5" /> Cancel
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
                                    onChange={e => setNewRFQ({ ...newRFQ, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Required By Date</label>
                                <input
                                    type="date"
                                    className="w-full p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                    value={newRFQ.requiredByDate}
                                    onChange={e => setNewRFQ({ ...newRFQ, requiredByDate: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Description</label>
                                <textarea
                                    rows={2}
                                    placeholder="Scope of this RFQ..."
                                    className="w-full p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] resize-none"
                                    value={newRFQ.description}
                                    onChange={e => setNewRFQ({ ...newRFQ, description: e.target.value })}
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
                            {newRFQ.items.map((item, index) => (
                                <div key={index} className="flex flex-wrap md:flex-nowrap gap-4 items-start bg-[var(--bg-overlay)] p-4 rounded-lg border border-[var(--border-color)]">
                                    <div className="flex-1 min-w-[200px]">
                                        <input
                                            type="text"
                                            required
                                            placeholder="Item Description"
                                            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-[var(--text-primary)] mb-2"
                                            value={item.description}
                                            onChange={e => updateItemRow(index, 'description', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Technical Specs (optional)"
                                            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-[var(--text-secondary)] text-sm"
                                            value={item.specs}
                                            onChange={e => updateItemRow(index, 'specs', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-24">
                                        <input
                                            type="number"
                                            required min="1"
                                            placeholder="Qty"
                                            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
                                            value={item.quantity}
                                            onChange={e => updateItemRow(index, 'quantity', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="w-32">
                                        <input
                                            type="text"
                                            required
                                            placeholder="Unit (e.g., pcs)"
                                            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
                                            value={item.unit}
                                            onChange={e => updateItemRow(index, 'unit', e.target.value)}
                                        />
                                    </div>
                                    <div className="pt-2">
                                        <button type="button" onClick={() => removeItemRow(index)} className="text-red-400 hover:text-red-300 disabled:opacity-30" disabled={newRFQ.items.length === 1}>
                                            <AlertCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={() => setIsCreating(false)} className="px-5 py-2 text-[var(--text-secondary)] hover:text-white">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-[var(--primary)] text-black rounded-lg font-medium shadow-[0_0_15px_rgba(185,255,102,0.2)] disabled:opacity-50">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Save RFQ
                            </button>
                        </div>
                    </form>
                </motion.div>
            )}

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-overlay)]">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                        <input
                            type="text"
                            placeholder="Search RFQs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                        />
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
                            {filteredRFQs.map(rfq => (
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
                                    <h3 className="font-medium text-[var(--text-primary)] mb-4 flex-1">{rfq.title}</h3>

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

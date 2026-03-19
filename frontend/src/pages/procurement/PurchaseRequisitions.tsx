import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    FileText,
    Plus,
    Search,
    Loader2,
    AlertCircle,
    Trash2,
    Send,
    CheckCircle,
    Sparkles,
    Clock3,
    CircleDollarSign,
    ArrowRightLeft,
    Ban,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface PRItem {
    id?: string;
    description: string;
    quantity: number;
    estimatedPrice?: number;
    notes?: string;
    inventoryId?: string;
}

interface PurchaseRequisition {
    id: string;
    prNumber: string;
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CONVERTED';
    priority: string;
    justification: string;
    requiredByDate: string;
    totalEstimate: number;
    createdAt: string;
    requestedBy: { name: string };
    items: PRItem[];
}

interface Vendor {
    id: string;
    name: string;
    vendorCode?: string;
    isActive?: boolean;
    isBlacklisted?: boolean;
}

type StatusFilter = 'ALL' | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CONVERTED';

const formatCurrency = (amount: number) => `₹${Number(amount || 0).toLocaleString()}`;

export function PurchaseRequisitions() {
    const { user } = useAuthStore();
    const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [isCreating, setIsCreating] = useState(false);

    // Form state
    const [newPR, setNewPR] = useState({
        priority: 'MEDIUM',
        justification: '',
        requiredByDate: '',
        items: [{ description: '', quantity: 1, estimatedPrice: 0, notes: '', inventoryId: '' }] as PRItem[]
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Detail/Action state
    const [selectedPR, setSelectedPR] = useState<PurchaseRequisition | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState('');

    // Convert to PO state
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [convertVendorId, setConvertVendorId] = useState('');

    const isApprover = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user?.role || '');

    useEffect(() => {
        void fetchRequisitions();
        void fetchVendors();
    }, []);

    const fetchRequisitions = async () => {
        try {
            setIsLoading(true);
            const statusQuery = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
            const res = await api.get(`/procurement-ext/requisitions${statusQuery}`);
            if (res.data.success) {
                setRequisitions(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch requisitions', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void fetchRequisitions();
    }, [statusFilter]);

    const fetchVendors = async () => {
        try {
            const res = await api.get('/vendors?includeBlacklisted=true');
            if (res.data.success) {
                setVendors(res.data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch vendors', error);
        }
    };

    const handleCreate = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            setIsSubmitting(true);
            const res = await api.post('/procurement-ext/requisitions', newPR);
            if (res.data.success) {
                setRequisitions([res.data.data, ...requisitions]);
                setIsCreating(false);
                setNewPR({
                    priority: 'MEDIUM',
                    justification: '',
                    requiredByDate: '',
                    items: [{ description: '', quantity: 1, estimatedPrice: 0, notes: '', inventoryId: '' }] as PRItem[]
                });
                setActionMessage('Requisition draft created.');
                window.setTimeout(() => setActionMessage(''), 3500);
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to create PR');
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitDraft = async (id: string) => {
        try {
            setActionLoading(`submit-${id}`);
            const res = await api.post(`/procurement-ext/requisitions/${id}/submit`);
            if (res.data.success) {
                await fetchRequisitions();
                setSelectedPR(null);
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to submit PR');
        } finally {
            setActionLoading(null);
        }
    };

    const decidePR = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
        try {
            setActionLoading(`${decision}-${id}`);
            const res = await api.post(`/procurement-ext/requisitions/${id}/approve`, { decision });
            if (res.data.success) {
                await fetchRequisitions();
                setSelectedPR(null);
            }
        } catch (error: any) {
            alert(error.response?.data?.message || `Failed to ${decision === 'APPROVED' ? 'approve' : 'reject'} PR`);
        } finally {
            setActionLoading(null);
        }
    };

    const convertToPO = async () => {
        if (!selectedPR || !convertVendorId) return;

        try {
            setActionLoading(`convert-${selectedPR.id}`);
            const res = await api.post(`/procurement-ext/requisitions/${selectedPR.id}/convert-to-po`, {
                vendorId: convertVendorId,
            });
            if (res.data.success) {
                setShowConvertModal(false);
                setConvertVendorId('');
                await fetchRequisitions();
                setSelectedPR(null);
                setActionMessage(res.data.message || 'PR converted to PO successfully.');
                window.setTimeout(() => setActionMessage(''), 4500);
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to convert PR to PO');
        } finally {
            setActionLoading(null);
        }
    };

    const addItemRow = () => {
        setNewPR({
            ...newPR,
            items: [...newPR.items, { description: '', quantity: 1, estimatedPrice: 0 }]
        });
    };

    const updateItemRow = (index: number, field: keyof PRItem, value: string | number) => {
        const newItems = [...newPR.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setNewPR({ ...newPR, items: newItems });
    };

    const removeItemRow = (index: number) => {
        if (newPR.items.length === 1) return;
        setNewPR({
            ...newPR,
            items: newPR.items.filter((_, i) => i !== index)
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
            case 'SUBMITTED': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'APPROVED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'REJECTED': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'CONVERTED': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    const filteredPRs = useMemo(() => requisitions.filter((pr) => (
        pr.prNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pr.requestedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pr.justification?.toLowerCase().includes(searchTerm.toLowerCase())
    )), [requisitions, searchTerm]);

    const stats = useMemo(() => {
        const drafts = requisitions.filter((pr) => pr.status === 'DRAFT').length;
        const submitted = requisitions.filter((pr) => pr.status === 'SUBMITTED').length;
        const approved = requisitions.filter((pr) => pr.status === 'APPROVED').length;
        const converted = requisitions.filter((pr) => pr.status === 'CONVERTED').length;
        const openValue = requisitions
            .filter((pr) => ['DRAFT', 'SUBMITTED', 'APPROVED'].includes(pr.status))
            .reduce((sum, pr) => sum + Number(pr.totalEstimate || 0), 0);
        return { drafts, submitted, approved, converted, openValue };
    }, [requisitions]);

    const orchestratorMessage = stats.submitted > 3
        ? 'Approval queue is building up. Prioritize high-value submitted requisitions first.'
        : stats.approved > 0
            ? 'Approved requisitions are ready for PO conversion. Allocate vendors and move to sourcing.'
            : 'Requisition flow is stable. Maintain quality of justifications and timeline discipline.';

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <FileText className="w-6 h-6 text-[var(--primary)]" />
                        Purchase Requisitions
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Create, approve, and convert internal requests into procurement-ready purchase orders.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-black rounded-lg hover:shadow-[0_0_15px_rgba(185,255,102,0.4)] transition-all font-medium"
                >
                    <Plus className="w-4 h-4" />
                    New Requisition
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Drafts</div>
                    <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{stats.drafts}</div>
                </div>
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-yellow-300">Submitted</div>
                    <div className="text-2xl font-bold text-yellow-200 mt-2">{stats.submitted}</div>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">Approved</div>
                    <div className="text-2xl font-bold text-emerald-200 mt-2">{stats.approved}</div>
                </div>
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-blue-300">Converted</div>
                    <div className="text-2xl font-bold text-blue-200 mt-2">{stats.converted}</div>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] flex items-center gap-1"><CircleDollarSign className="w-3 h-3" /> Open Value</div>
                    <div className="text-xl font-bold text-[var(--text-primary)] mt-2">{formatCurrency(stats.openValue)}</div>
                </div>
            </div>

            <div className="rounded-xl border border-[var(--border-color)] bg-[radial-gradient(circle_at_top_right,rgba(185,255,102,0.12),transparent_45%),var(--bg-card)] p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Requisition Orchestrator</div>
                        <p className="text-[var(--text-primary)] mt-2">{orchestratorMessage}</p>
                    </div>
                    <Sparkles className="w-5 h-5 text-[var(--primary)]" />
                </div>
            </div>

            {actionMessage && (
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-sm">
                    {actionMessage}
                </div>
            )}

            {isCreating && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden"
                >
                    <form onSubmit={handleCreate} className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Create Purchase Requisition</h2>
                            <button type="button" onClick={() => setIsCreating(false)} className="text-[var(--text-muted)] hover:text-white">
                                <AlertCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Priority</label>
                                <select
                                    className="w-full p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                    value={newPR.priority}
                                    onChange={(event) => setNewPR({ ...newPR, priority: event.target.value })}
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                    <option value="URGENT">Urgent</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Required By Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                    value={newPR.requiredByDate}
                                    onChange={(event) => setNewPR({ ...newPR, requiredByDate: event.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Business Justification</label>
                                <textarea
                                    required
                                    rows={2}
                                    placeholder="Why is this purchase necessary?"
                                    className="w-full p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] resize-none"
                                    value={newPR.justification}
                                    onChange={(event) => setNewPR({ ...newPR, justification: event.target.value })}
                                />
                            </div>
                        </div>

                        <div className="mb-4 flex justify-between items-center">
                            <h3 className="font-medium text-[var(--text-primary)]">Line Items</h3>
                            <button type="button" onClick={addItemRow} className="text-sm flex items-center gap-1 text-[var(--primary)] hover:underline">
                                <Plus className="w-4 h-4" /> Add Item
                            </button>
                        </div>

                        <div className="space-y-3 mb-6">
                            {newPR.items.map((item, index) => (
                                <div key={index} className="flex gap-4 items-start bg-[var(--bg-overlay)] p-4 rounded-lg border border-[var(--border-color)]">
                                    <div className="flex-1">
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
                                            placeholder="Notes / Specs (optional)"
                                            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-[var(--text-secondary)] text-sm"
                                            value={item.notes}
                                            onChange={(event) => updateItemRow(index, 'notes', event.target.value)}
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
                                            onChange={(event) => updateItemRow(index, 'quantity', parseInt(event.target.value, 10) || 0)}
                                        />
                                    </div>
                                    <div className="w-32">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="Est. Price"
                                            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
                                            value={item.estimatedPrice}
                                            onChange={(event) => updateItemRow(index, 'estimatedPrice', parseFloat(event.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="pt-2">
                                        <button type="button" onClick={() => removeItemRow(index)} className="text-red-400 hover:text-red-300 disabled:opacity-30" disabled={newPR.items.length === 1}>
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-4 border-t border-[var(--border-color)] pt-4">
                            <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-[var(--text-secondary)] hover:text-white">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-[var(--primary)] text-black rounded-lg font-medium hover:brightness-110 disabled:opacity-50">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Save as Draft
                            </button>
                        </div>
                    </form>
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`flex flex-col bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl h-[620px] ${selectedPR ? 'lg:col-span-1 hidden lg:flex' : 'lg:col-span-3'}`}>
                    <div className="p-4 border-b border-[var(--border-color)] space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                            <input
                                type="text"
                                placeholder="Search PRs..."
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CONVERTED'] as StatusFilter[]).map((status) => (
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
                    <div className="flex-1 overflow-auto p-2 space-y-2">
                        {isLoading ? (
                            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" /></div>
                        ) : filteredPRs.length === 0 ? (
                            <div className="text-center p-8 text-[var(--text-muted)]">No Purchase Requisitions found.</div>
                        ) : (
                            filteredPRs.map((pr) => (
                                <button
                                    key={pr.id}
                                    onClick={() => setSelectedPR(pr)}
                                    className={`w-full text-left p-4 rounded-lg border transition-all ${selectedPR?.id === pr.id
                                        ? 'bg-[var(--primary)]/10 border-[var(--primary)] border-l-4 border-l-[var(--primary)]'
                                        : 'bg-[var(--bg-overlay)] border-[var(--border-color)] hover:border-[var(--primary)]/50'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-[var(--text-primary)]">{pr.prNumber}</span>
                                        <span className={`text-[10px] px-2 py-1 rounded-full border ${getStatusColor(pr.status)} font-semibold tracking-wider`}>
                                            {pr.status}
                                        </span>
                                    </div>
                                    <div className="text-sm text-[var(--text-secondary)] line-clamp-1 mb-2">{pr.justification}</div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-[var(--text-muted)]">By: {pr.requestedBy?.name || 'System'}</span>
                                        <span className="text-[var(--primary)] font-mono">{formatCurrency(pr.totalEstimate || 0)}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {selectedPR && (
                    <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex flex-col h-[620px] overflow-hidden">
                        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-start bg-[var(--bg-overlay)]">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-xl font-bold text-[var(--text-primary)]">{selectedPR.prNumber}</h2>
                                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(selectedPR.status)} font-semibold`}>
                                        {selectedPR.status}
                                    </span>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)]">Requested by {selectedPR.requestedBy?.name || 'System'} on {new Date(selectedPR.createdAt).toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => setSelectedPR(null)} className="lg:hidden p-2 text-[var(--text-muted)] hover:text-white rounded-lg bg-[var(--bg-card)]">
                                <AlertCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6 p-4 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl">
                                <div>
                                    <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Priority</div>
                                    <div className="text-[var(--text-primary)] font-medium">{selectedPR.priority}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Required By</div>
                                    <div className="text-[var(--text-primary)] font-medium">{selectedPR.requiredByDate ? new Date(selectedPR.requiredByDate).toLocaleDateString() : 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Line Items</div>
                                    <div className="text-[var(--text-primary)] font-medium flex items-center gap-2"><Clock3 className="w-4 h-4 text-[var(--text-secondary)]" /> {selectedPR.items?.length || 0}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Estimate</div>
                                    <div className="text-[var(--primary)] font-medium">{formatCurrency(selectedPR.totalEstimate || 0)}</div>
                                </div>
                                <div className="col-span-2">
                                    <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Justification</div>
                                    <div className="text-[var(--text-primary)]">{selectedPR.justification}</div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-4">Line Items</h3>
                                <div className="space-y-3">
                                    {selectedPR.items?.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg">
                                            <div>
                                                <div className="font-medium text-[var(--text-primary)]">{item.description}</div>
                                                {item.notes && <div className="text-xs text-[var(--text-muted)] mt-1">{item.notes}</div>}
                                            </div>
                                            <div className="text-right flex items-center gap-6">
                                                <div>
                                                    <div className="text-xs text-[var(--text-muted)]">Qty</div>
                                                    <div className="font-mono text-[var(--text-primary)]">{item.quantity}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-[var(--text-muted)]">Est. Price</div>
                                                    <div className="font-mono text-[var(--text-primary)]">{formatCurrency(item.estimatedPrice || 0)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-overlay)] flex justify-end gap-3 flex-wrap">
                            {selectedPR.status === 'DRAFT' && (
                                <button
                                    onClick={() => void submitDraft(selectedPR.id)}
                                    disabled={actionLoading === `submit-${selectedPR.id}`}
                                    className="flex items-center gap-2 px-5 py-2 bg-[var(--primary)] text-black rounded-lg font-medium hover:brightness-110 disabled:opacity-50"
                                >
                                    {actionLoading === `submit-${selectedPR.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Submit for Approval
                                </button>
                            )}

                            {selectedPR.status === 'SUBMITTED' && isApprover && (
                                <>
                                    <button
                                        onClick={() => void decidePR(selectedPR.id, 'APPROVED')}
                                        disabled={actionLoading === `APPROVED-${selectedPR.id}`}
                                        className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-400 disabled:opacity-50"
                                    >
                                        {actionLoading === `APPROVED-${selectedPR.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                        Approve PR
                                    </button>
                                    <button
                                        onClick={() => void decidePR(selectedPR.id, 'REJECTED')}
                                        disabled={actionLoading === `REJECTED-${selectedPR.id}`}
                                        className="flex items-center gap-2 px-5 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-400 disabled:opacity-50"
                                    >
                                        {actionLoading === `REJECTED-${selectedPR.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                                        Reject PR
                                    </button>
                                </>
                            )}

                            {selectedPR.status === 'APPROVED' && isApprover && (
                                <button
                                    onClick={() => setShowConvertModal(true)}
                                    disabled={actionLoading === `convert-${selectedPR.id}`}
                                    className="flex items-center gap-2 px-5 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-400 disabled:opacity-50"
                                >
                                    {actionLoading === `convert-${selectedPR.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                                    Convert to PO
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showConvertModal && selectedPR && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-md"
                    >
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Convert {selectedPR.prNumber} to PO</h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-4">Select the vendor for PO generation.</p>

                        <label className="block text-sm text-[var(--text-secondary)] mb-2">Vendor</label>
                        <select
                            value={convertVendorId}
                            onChange={(event) => setConvertVendorId(event.target.value)}
                            className="w-full p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
                        >
                            <option value="">Select a vendor</option>
                            {vendors.filter((vendor) => !vendor.isBlacklisted).map((vendor) => (
                                <option key={vendor.id} value={vendor.id}>{vendor.name}{vendor.vendorCode ? ` (${vendor.vendorCode})` : ''}</option>
                            ))}
                        </select>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border-color)]">
                            <button
                                onClick={() => {
                                    setShowConvertModal(false);
                                    setConvertVendorId('');
                                }}
                                className="px-4 py-2 text-[var(--text-secondary)] hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => void convertToPO()}
                                disabled={!convertVendorId || actionLoading === `convert-${selectedPR.id}`}
                                className="px-5 py-2 rounded-lg bg-[var(--primary)] text-black font-medium disabled:opacity-50"
                            >
                                {actionLoading === `convert-${selectedPR.id}` ? 'Converting...' : 'Convert'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

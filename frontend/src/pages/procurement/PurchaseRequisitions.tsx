import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Search, Loader2, AlertCircle, Trash2, Send, CheckCircle, RefreshCw } from 'lucide-react';
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
    status: string;
    priority: string;
    justification: string;
    requiredByDate: string;
    totalEstimate: number;
    createdAt: string;
    requestedBy: { name: string };
    items: PRItem[];
}

export function PurchaseRequisitions() {
    const { user } = useAuthStore();
    const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
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

    const isApprover = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user?.role || '');

    useEffect(() => {
        fetchRequisitions();
    }, []);

    const fetchRequisitions = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/procurement-ext/requisitions');
            if (res.data.success) {
                setRequisitions(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch requisitions', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
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
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to create PR');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAction = async (id: string, action: 'submit' | 'approve' | 'convert-to-po') => {
        try {
            setActionLoading(`${action}-${id}`);
            const res = await api.post(`/procurement-ext/requisitions/${id}/${action}`);
            if (res.data.success) {
                fetchRequisitions();
                if (selectedPR && selectedPR.id === id) {
                    setSelectedPR(null);
                }
            }
        } catch (error: any) {
            alert(error.response?.data?.message || `Failed to ${action} PR`);
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

    const updateItemRow = (index: number, field: keyof PRItem, value: any) => {
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
            case 'APPROVED': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'REJECTED': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'CONVERTED': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    const filteredPRs = requisitions.filter(pr =>
        pr.prNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pr.requestedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pr.justification?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <FileText className="w-6 h-6 text-[var(--primary)]" />
                        Purchase Requisitions
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Manage internal requests for purchases before converting them to POs.
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
                                <AlertCircle className="w-5 h-5" /> Cancel
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Priority</label>
                                <select
                                    className="w-full p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                    value={newPR.priority}
                                    onChange={e => setNewPR({ ...newPR, priority: e.target.value })}
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
                                    onChange={e => setNewPR({ ...newPR, requiredByDate: e.target.value })}
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
                                    onChange={e => setNewPR({ ...newPR, justification: e.target.value })}
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
                                            onChange={e => updateItemRow(index, 'description', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Notes / Specs (optional)"
                                            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-[var(--text-secondary)] text-sm"
                                            value={item.notes}
                                            onChange={e => updateItemRow(index, 'notes', e.target.value)}
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
                                            type="number"
                                            min="0" step="0.01"
                                            placeholder="Est. Price"
                                            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
                                            value={item.estimatedPrice}
                                            onChange={e => updateItemRow(index, 'estimatedPrice', parseFloat(e.target.value) || 0)}
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
                            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-[var(--primary)] text-black rounded-lg font-medium hover:shadow-[0_0_10px_rgba(185,255,102,0.3)] bg-opacity-90">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Save as Draft
                            </button>
                        </div>
                    </form>
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* List View */}
                <div className={`flex flex-col bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl h-[600px] ${selectedPR ? 'lg:col-span-1 hidden lg:flex' : 'lg:col-span-3'}`}>
                    <div className="p-4 border-b border-[var(--border-color)]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                            <input
                                type="text"
                                placeholder="Search PRs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-2 space-y-2">
                        {isLoading ? (
                            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" /></div>
                        ) : filteredPRs.length === 0 ? (
                            <div className="text-center p-8 text-[var(--text-muted)]">No Purchase Requisitions found.</div>
                        ) : (
                            filteredPRs.map(pr => (
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
                                        <span className="text-[var(--primary)] font-mono">${pr.totalEstimate?.toLocaleString() || '0'}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Detail View */}
                {selectedPR && (
                    <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex flex-col h-[600px] overflow-hidden">
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
                                <div className="col-span-2">
                                    <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Justification</div>
                                    <div className="text-[var(--text-primary)]">{selectedPR.justification}</div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-4">Line Items</h3>
                                <div className="space-y-3">
                                    {selectedPR.items?.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg">
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
                                                    <div className="font-mono text-[var(--text-primary)]">${item.estimatedPrice?.toLocaleString() || '0'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex justify-between p-3 border-t border-[var(--border-color)] mt-4">
                                        <span className="font-bold text-[var(--text-secondary)]">Total Estimate</span>
                                        <span className="font-bold font-mono text-lg text-[var(--primary)]">${selectedPR.totalEstimate?.toLocaleString() || '0'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-overlay)] flex justify-end gap-3">
                            {selectedPR.status === 'DRAFT' && (
                                <button
                                    onClick={() => handleAction(selectedPR.id, 'submit')}
                                    disabled={actionLoading === `submit-${selectedPR.id}`}
                                    className="flex items-center gap-2 px-5 py-2 bg-[var(--primary)] text-black rounded-lg font-medium hover:brightness-110 disabled:opacity-50"
                                >
                                    {actionLoading === `submit-${selectedPR.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Submit for Approval
                                </button>
                            )}

                            {selectedPR.status === 'SUBMITTED' && isApprover && (
                                <button
                                    onClick={() => handleAction(selectedPR.id, 'approve')}
                                    disabled={actionLoading === `approve-${selectedPR.id}`}
                                    className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
                                >
                                    {actionLoading === `approve-${selectedPR.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    Approve PR
                                </button>
                            )}

                            {selectedPR.status === 'APPROVED' && isApprover && (
                                <button
                                    onClick={() => handleAction(selectedPR.id, 'convert-to-po')}
                                    disabled={actionLoading === `convert-to-po-${selectedPR.id}`}
                                    className="flex items-center gap-2 px-5 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-50"
                                >
                                    {actionLoading === `convert-to-po-${selectedPR.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    Convert to PO
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

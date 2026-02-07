import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, CheckCircle, XCircle, Plus, Lock, X, Loader2, Download } from 'lucide-react';
import api from '../lib/api';
import { exportMaintenance } from '../utils/exportUtils';
import { formatCurrency, cn } from '../lib/utils';
import { useAuthStore } from '../stores/authStore';

export function Maintenance() {
    const { user } = useAuthStore();
    const [requests, setRequests] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        assetId: '',
        issueDescription: '',
        repairCost: '',
        currency: 'INR'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [reqRes, assetRes] = await Promise.all([
                api.get('/maintenance'),
                api.get('/assets')
            ]);
            setRequests(reqRes.data.data || []);
            setAssets(assetRes.data.data || []);
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setError(null);
        try {
            const payload = {
                assetId: formData.assetId,
                issueDescription: formData.issueDescription,
                repairCost: parseFloat(formData.repairCost) || 0,
                currency: formData.currency
            };
            await api.post('/maintenance', payload);
            setShowModal(false);
            fetchData();
            setFormData({ assetId: '', issueDescription: '', repairCost: '', currency: 'INR' });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create request');
        } finally {
            setFormLoading(false);
        }
    };

    const handleNumberChange = (value: string) => {
        // Allow empty string or valid numbers only
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setFormData({ ...formData, repairCost: value });
        }
    };

    const handleAction = async (id: string, action: 'approve' | 'reject' | 'close') => {
        if (!confirm(`Are you sure you want to ${action} this request?`)) return;
        setActionLoading(id);
        try {
            await api.post(`/maintenance/${id}/${action}`);
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.message || `Failed to ${action} request`);
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'REJECTED': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'CLOSED': return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
            default: return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        }
    };

    const getDecisionStyle = (decision: string) => {
        return decision === 'REPLACE'
            ? 'text-red-400 bg-red-500/10'
            : 'text-sky-400 bg-sky-500/10';
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-[#18181b] rounded-2xl animate-pulse border border-white/5" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center bg-[#18181b] p-6 rounded-3xl border border-white/5">
                <div>
                    <h2 className="text-2xl font-bold mb-1">Maintenance Requests</h2>
                    <p className="text-[var(--text-muted)] text-sm">
                        {requests.filter(r => r.status === 'REQUESTED').length} pending · {requests.filter(r => r.status === 'APPROVED').length} approved
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => exportMaintenance(requests as any, 'pdf')}
                        className="px-4 py-3 border border-white/10 rounded-xl hover:bg-white/5 flex items-center gap-2 text-white transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        PDF
                    </button>
                    <button
                        onClick={() => exportMaintenance(requests as any, 'excel')}
                        className="px-4 py-3 border border-white/10 rounded-xl hover:bg-white/5 flex items-center gap-2 text-white transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Excel
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-[var(--primary)] text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:opacity-90 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        New Request
                    </button>
                </div>

            </div>

            {/* Requests List */}
            <div className="space-y-4">
                {requests.length === 0 ? (
                    <div className="text-center py-20 bg-[#18181b] rounded-3xl border border-white/5">
                        <Wrench className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
                        <h3 className="text-xl font-bold mb-2">No Maintenance Requests</h3>
                        <p className="text-[var(--text-muted)]">Create your first request above.</p>
                    </div>
                ) : (
                    requests.map((req) => (
                        <motion.div
                            key={req._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#18181b] border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-white/10 transition-all"
                        >
                            <div className="flex items-start gap-4 flex-1">
                                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", getDecisionStyle(req.decision))}>
                                    <Wrench className="w-6 h-6" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-lg mb-1 truncate">{req.assetId?.name || 'Unknown Asset'}</h3>
                                    <p className="text-[var(--text-muted)] text-sm line-clamp-2">{req.issueDescription}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-3">
                                        <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", getStatusStyle(req.status))}>
                                            {req.status}
                                        </span>
                                        <span className={cn("px-3 py-1 rounded-full text-xs font-bold", getDecisionStyle(req.decision))}>
                                            {req.decision}
                                        </span>
                                        <span className="text-xs text-[var(--text-muted)] bg-white/5 px-3 py-1 rounded-full">
                                            {formatCurrency(req.repairCost)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                {!['TECHNICIAN', 'VIEWER'].includes(user?.role || '') && req.status === 'REQUESTED' && (
                                    <>
                                        <button
                                            onClick={() => handleAction(req._id, 'approve')}
                                            disabled={actionLoading === req._id}
                                            className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleAction(req._id, 'reject')}
                                            disabled={actionLoading === req._id}
                                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Reject
                                        </button>
                                    </>
                                )}
                                {!['TECHNICIAN', 'VIEWER'].includes(user?.role || '') && req.status === 'APPROVED' && (
                                    <button
                                        onClick={() => handleAction(req._id, 'close')}
                                        disabled={actionLoading === req._id}
                                        className="px-4 py-2 bg-[var(--primary)] text-black rounded-lg transition-colors flex items-center gap-2 text-sm font-bold hover:opacity-90 disabled:opacity-50"
                                    >
                                        <Lock className="w-4 h-4" />
                                        Close & Finalize
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#18181b] border border-white/10 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-[var(--text-muted)]">
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-2xl font-bold mb-6">Request Maintenance</h2>

                            {error && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Select Asset</label>
                                    <select
                                        className="w-full bg-[#27272a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)] transition-colors"
                                        value={formData.assetId}
                                        onChange={e => setFormData({ ...formData, assetId: e.target.value })}
                                        required
                                    >
                                        <option value="">Choose an asset...</option>
                                        {assets.filter(a => a.status === 'ACTIVE').map(asset => (
                                            <option key={asset._id} value={asset._id}>{asset.name} ({asset.guai})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Issue Description</label>
                                    <textarea
                                        className="w-full bg-[#27272a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)] transition-colors h-28 resize-none"
                                        placeholder="Describe the problem in detail..."
                                        value={formData.issueDescription}
                                        onChange={e => setFormData({ ...formData, issueDescription: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Estimated Repair Cost (INR)</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className="w-full bg-[#27272a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)] transition-colors"
                                        placeholder="Enter amount"
                                        value={formData.repairCost}
                                        onChange={e => handleNumberChange(e.target.value)}
                                        required
                                    />
                                    <p className="text-xs text-[var(--text-muted)] mt-2">
                                        💡 If cost exceeds 60% of asset value, system will recommend <strong className="text-red-400">REPLACE</strong>.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="w-full bg-[var(--primary)] text-black font-bold py-4 rounded-xl mt-2 hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Request'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Laptop, Armchair, Car, Package, Plus, X, Loader2, Building2, Download } from 'lucide-react';
import api from '../lib/api';
import { exportAssets } from '../utils/exportUtils';
import { formatCurrency } from '../lib/utils';
import type { Asset, Office } from '../types';
import { useAuthStore } from '../stores/authStore';

const categoryIcons: Record<string, any> = {
    laptop: Laptop,
    furniture: Armchair,
    vehicle: Car,
    default: Package
};

const CATEGORIES = ['Laptop', 'Furniture', 'Vehicle', 'Equipment', 'Other'];

export function Assets() {
    const { user } = useAuthStore();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [offices, setOffices] = useState<Office[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        category: 'Laptop',
        purchaseCost: '',
        currency: 'INR',
        officeId: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [assetsRes, officesRes] = await Promise.all([
                api.get('/assets'),
                user?.role === 'SUPER_ADMIN' ? api.get('/offices') : Promise.resolve({ data: { data: [] } })
            ]);
            setAssets(assetsRes.data.data || []);
            setOffices(officesRes.data.data || []);
        } catch (err) {
            console.error(err);
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
                name: formData.name,
                category: formData.category,
                purchaseCost: parseFloat(formData.purchaseCost) || 0,
                currency: formData.currency,
                ...(formData.officeId && { officeId: formData.officeId })
            };

            await api.post('/assets', payload);
            setShowModal(false);
            setFormData({ name: '', category: 'Laptop', purchaseCost: '', currency: 'INR', officeId: '' });
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create asset');
        } finally {
            setFormLoading(false);
        }
    };

    const handleNumberChange = (value: string, field: 'purchaseCost') => {
        // Allow empty string or valid numbers only
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setFormData({ ...formData, [field]: value });
        }
    };

    const totalValue = assets.reduce((sum, a) => sum + (a.purchaseInfo?.purchasePrice || 0), 0);

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-[var(--bg-card)] rounded-3xl animate-pulse border border-[var(--border-color)]" />
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-64 bg-[var(--bg-card)] rounded-[2rem] animate-pulse border border-[var(--border-color)]" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl relative overflow-hidden group hover:border-[var(--primary)]/30 transition-colors">
                    <div className="relative z-10">
                        <p className="text-[var(--text-secondary)] font-medium mb-1">Total Asset Value</p>
                        <h2 className="text-3xl font-bold text-[var(--text-primary)]">{formatCurrency(totalValue)}</h2>
                    </div>
                    <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-[var(--primary)]/5 to-transparent pointer-events-none" />
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl hover:border-[var(--primary)]/30 transition-colors">
                    <p className="text-[var(--text-secondary)] font-medium mb-1">Active Assets</p>
                    <h2 className="text-3xl font-bold text-[var(--text-primary)]">{assets.filter(a => a.status === 'ACTIVE').length}</h2>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="bg-[var(--primary)] text-black rounded-3xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-[var(--primary)]/90 transition-colors active:scale-95 transform duration-200"
                >
                    <Plus className="w-8 h-8 p-1.5 bg-black/10 rounded-full" />
                    <span className="font-bold">Add New Asset</span>
                </button>
            </div>

            {/* Grid */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-[var(--text-primary)]">
                        <div className="w-1.5 h-6 bg-[var(--primary)] rounded-full shadow-[0_0_10px_var(--primary)]" />
                        All Assets ({assets.length})
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => exportAssets(assets as any, 'pdf')}
                            className="px-3 py-1.5 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-overlay)] flex items-center gap-2 text-[var(--text-primary)] text-sm transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                            PDF
                        </button>
                        <button
                            onClick={() => exportAssets(assets as any, 'excel')}
                            className="px-3 py-1.5 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-overlay)] flex items-center gap-2 text-[var(--text-primary)] text-sm transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Excel
                        </button>
                    </div>
                </div>

                {assets.length === 0 ? (
                    <div className="text-center py-20 bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-color)]">
                        <Package className="w-12 h-12 mx-auto text-[var(--text-secondary)] mb-4 opacity-50" />
                        <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">No Assets Found</h3>
                        <p className="text-[var(--text-secondary)]">Get started by adding your first asset above.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assets.map((asset, i) => {
                            const Icon = categoryIcons[asset.category.toLowerCase()] || categoryIcons.default;
                            const statusColors: Record<string, string> = {
                                'ACTIVE': 'bg-emerald-500',
                                'MAINTENANCE': 'bg-amber-500',
                                'RETIRED': 'bg-zinc-500'
                            };

                            return (
                                <motion.div
                                    key={asset._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}

                                    className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-[2rem] hover:border-[var(--primary)]/30 hover:bg-[var(--bg-card-hover)] transition-all group cursor-pointer relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                        <div className="w-12 h-12 rounded-2xl bg-[var(--bg-overlay)] flex items-center justify-center text-[var(--primary)] group-hover:scale-110 group-hover:bg-[var(--primary)] group-hover:text-black transition-all duration-300 shadow-lg">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <span className="px-3 py-1 rounded-full bg-[var(--bg-overlay)] text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">
                                            {asset.category}
                                        </span>
                                    </div>

                                    <div className="mb-6 relative z-10">
                                        <h4 className="text-xl font-bold mb-1 truncate text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">{asset.name}</h4>
                                        <p className="text-xs text-[var(--text-secondary)] font-mono flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${statusColors[asset.status]}`} />
                                            {asset.guai}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-6 border-t border-[var(--border-color)] relative z-10">
                                        <span className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{formatCurrency(asset.purchaseInfo?.purchasePrice || 0)}</span>
                                        <span className="text-xs px-2 py-1 rounded-full bg-[var(--bg-overlay)] text-[var(--text-secondary)]">{asset.status}</span>
                                    </div>

                                    <div className="absolute -right-20 -bottom-20 w-40 h-40 bg-[var(--primary)]/10 blur-[80px] group-hover:bg-[var(--primary)]/20 transition-all duration-500" />
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Asset Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[var(--bg-card)] border border-[var(--border-color)] p-8 rounded-3xl w-full max-w-lg shadow-2xl relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-[var(--bg-overlay)] text-[var(--text-secondary)]">
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-2xl font-bold mb-6">Add New Asset</h2>

                            {error && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Asset Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                                        placeholder="e.g., MacBook Pro 16"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Category</label>
                                    <select
                                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Office Selection - Only show for SUPER_ADMIN */}
                                {user?.role === 'SUPER_ADMIN' && offices.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                                            <Building2 className="w-3 h-3 inline mr-1" />
                                            Office
                                        </label>
                                        <select
                                            className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                                            value={formData.officeId}
                                            onChange={e => setFormData({ ...formData, officeId: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Office</option>
                                            {offices.map(office => (
                                                <option key={office._id} value={office._id}>
                                                    {office.name} ({office.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Purchase Cost (INR)</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                                        placeholder="Enter amount"
                                        value={formData.purchaseCost}
                                        onChange={e => handleNumberChange(e.target.value, 'purchaseCost')}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="w-full bg-[var(--primary)] text-black font-bold py-4 rounded-xl mt-2 hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Asset'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

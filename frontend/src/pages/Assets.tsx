import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Laptop, Armchair, Car, Package, Plus, X, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import type { Asset } from '../types';

const categoryIcons: any = {
    laptop: Laptop,
    furniture: Armchair,
    vehicle: Car,
    default: Package
};

const CATEGORIES = ['Laptop', 'Furniture', 'Vehicle', 'Equipment', 'Other'];

export function Assets() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formLoading, setFormLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        category: 'Laptop',
        purchaseCost: 0,
        currency: 'INR'
    });

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            const res = await api.get('/assets');
            setAssets(res.data.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            await api.post('/assets', formData);
            setShowModal(false);
            setFormData({ name: '', category: 'Laptop', purchaseCost: 0, currency: 'INR' });
            fetchAssets();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to create asset');
        } finally {
            setFormLoading(false);
        }
    };

    const totalValue = assets.reduce((sum, a) => sum + a.purchaseCost, 0);

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-[#18181b] rounded-3xl animate-pulse border border-white/5" />
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-64 bg-[#18181b] rounded-[2rem] animate-pulse border border-white/5" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[var(--bg-card)] border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-[var(--primary)]/30 transition-colors">
                    <div className="relative z-10">
                        <p className="text-[var(--text-muted)] font-medium mb-1">Total Asset Value</p>
                        <h2 className="text-3xl font-bold text-white">{formatCurrency(totalValue)}</h2>
                    </div>
                    <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-[var(--primary)]/5 to-transparent pointer-events-none" />
                </div>

                <div className="bg-[var(--bg-card)] border border-white/5 p-6 rounded-3xl hover:border-[var(--primary)]/30 transition-colors">
                    <p className="text-[var(--text-muted)] font-medium mb-1">Active Assets</p>
                    <h2 className="text-3xl font-bold text-white">{assets.filter(a => a.status === 'ACTIVE').length}</h2>
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
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
                    <div className="w-1.5 h-6 bg-[var(--primary)] rounded-full shadow-[0_0_10px_var(--primary)]" />
                    All Assets ({assets.length})
                </h3>

                {assets.length === 0 ? (
                    <div className="text-center py-20 bg-[#18181b] rounded-[2rem] border border-white/5">
                        <Package className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
                        <h3 className="text-xl font-bold mb-2">No Assets Found</h3>
                        <p className="text-[var(--text-muted)]">Get started by adding your first asset above.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assets.map((asset, i) => {
                            const Icon = categoryIcons[asset.category.toLowerCase()] || categoryIcons.default;
                            const statusColors: any = {
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
                                    className="bg-[var(--bg-card)] border border-white/5 p-6 rounded-[2rem] hover:border-white/20 hover:bg-[#1f1f22] transition-all group cursor-pointer relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[var(--primary)] group-hover:scale-110 group-hover:bg-[var(--primary)] group-hover:text-black transition-all duration-300 shadow-lg">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                                            {asset.category}
                                        </span>
                                    </div>

                                    <div className="mb-6 relative z-10">
                                        <h4 className="text-xl font-bold mb-1 truncate text-white group-hover:text-[var(--primary)] transition-colors">{asset.name}</h4>
                                        <p className="text-xs text-[var(--text-muted)] font-mono flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${statusColors[asset.status]}`} />
                                            {asset.guai}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-6 border-t border-white/5 relative z-10">
                                        <span className="text-xl font-bold text-white tracking-tight">{formatCurrency(asset.purchaseCost)}</span>
                                        <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-[var(--text-muted)]">{asset.status}</span>
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
                            className="bg-[#18181b] border border-white/10 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-[var(--text-muted)]">
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-2xl font-bold mb-6">Add New Asset</h2>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Asset Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#27272a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)] transition-colors"
                                        placeholder="e.g., MacBook Pro 16"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Category</label>
                                    <select
                                        className="w-full bg-[#27272a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)] transition-colors"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Purchase Cost (INR)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full bg-[#27272a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)] transition-colors"
                                        value={formData.purchaseCost}
                                        onChange={e => setFormData({ ...formData, purchaseCost: Number(e.target.value) })}
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

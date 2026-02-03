import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Search, Plus, X, Loader2, Wrench, Building2 } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';
import type { InventoryItem, Office } from '../types';
import { useAuthStore } from '../stores/authStore';

export function Inventory() {
    const { user } = useAuthStore();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [offices, setOffices] = useState<Office[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'PRODUCT' | 'SPARE'>('ALL');
    const [showModal, setShowModal] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        type: 'PRODUCT' as 'PRODUCT' | 'SPARE',
        sku: '',
        quantity: '',
        unitCost: '',
        officeId: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [itemsRes, officesRes] = await Promise.all([
                api.get('/inventory'),
                user?.role === 'SUPER_ADMIN' ? api.get('/offices') : Promise.resolve({ data: { data: [] } })
            ]);
            setItems(itemsRes.data.data || []);
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
                type: formData.type,
                sku: formData.sku || undefined,
                quantity: parseInt(formData.quantity) || 0,
                unitCost: parseFloat(formData.unitCost) || 0,
                ...(formData.officeId && { officeId: formData.officeId })
            };

            await api.post('/inventory', payload);
            setShowModal(false);
            setFormData({ name: '', type: 'PRODUCT', sku: '', quantity: '', unitCost: '', officeId: '' });
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to add item');
        } finally {
            setFormLoading(false);
        }
    };

    const handleNumberChange = (value: string, field: 'quantity' | 'unitCost') => {
        // Allow empty string or valid numbers only
        if (field === 'quantity') {
            // Integer only for quantity
            if (value === '' || /^\d*$/.test(value)) {
                setFormData({ ...formData, [field]: value });
            }
        } else {
            // Allow decimals for unitCost
            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                setFormData({ ...formData, [field]: value });
            }
        }
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'ALL' || item.type === filterType;
        return matchesSearch && matchesType;
    });

    const totalValue = items.reduce((sum, i) => sum + (i.unitCost * i.quantity), 0);
    const lowStockCount = items.filter(i => i.quantity < 10).length;

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-16 w-full bg-[#18181b] rounded-2xl animate-pulse" />
                <div className="h-80 w-full bg-[#18181b] rounded-3xl animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#18181b] border border-white/5 p-5 rounded-2xl">
                    <p className="text-xs text-[var(--text-muted)] font-medium mb-1">Total Items</p>
                    <p className="text-2xl font-bold">{items.length}</p>
                </div>
                <div className="bg-[#18181b] border border-white/5 p-5 rounded-2xl">
                    <p className="text-xs text-[var(--text-muted)] font-medium mb-1">Inventory Value</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                </div>
                <div className="bg-[#18181b] border border-white/5 p-5 rounded-2xl">
                    <p className="text-xs text-[var(--text-muted)] font-medium mb-1">Low Stock Items</p>
                    <p className="text-2xl font-bold text-amber-400">{lowStockCount}</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-[var(--primary)] text-black p-5 rounded-2xl font-bold hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Add Item
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#18181b] p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-1 bg-[#27272a] p-1 rounded-lg">
                    {(['ALL', 'PRODUCT', 'SPARE'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={cn(
                                "px-4 py-2 rounded-md text-sm font-semibold transition-all",
                                filterType === type
                                    ? 'bg-[var(--primary)] text-black shadow-lg'
                                    : 'text-[var(--text-muted)] hover:text-white'
                            )}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search SKU or Name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-64 bg-[#27272a] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[var(--primary)] transition-colors text-sm"
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-[#18181b] border border-white/5 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-[#27272a]/50">
                                <th className="p-5 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Item</th>
                                <th className="p-5 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">SKU / Type</th>
                                <th className="p-5 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Stock</th>
                                <th className="p-5 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Unit Cost</th>
                                <th className="p-5 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item) => (
                                    <tr key={item._id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center",
                                                    item.type === 'SPARE' ? 'bg-orange-500/10 text-orange-400' : 'bg-sky-500/10 text-sky-400'
                                                )}>
                                                    {item.type === 'SPARE' ? <Wrench className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-white">{item.name}</p>
                                                    <p className="text-xs text-[var(--text-muted)]">{new Date(item.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <p className="font-mono text-sm mb-1">{item.sku}</p>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                item.type === 'PRODUCT' ? 'bg-sky-500/10 text-sky-400' : 'bg-orange-500/10 text-orange-400'
                                            )}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-20 h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full",
                                                            item.quantity < 10 ? 'bg-red-500' : item.quantity < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                                        )}
                                                        style={{ width: `${Math.min(item.quantity, 100)}%` }}
                                                    />
                                                </div>
                                                <span className={cn(
                                                    "font-bold",
                                                    item.quantity < 10 ? 'text-red-400' : 'text-white'
                                                )}>{item.quantity}</span>
                                            </div>
                                        </td>
                                        <td className="p-5 text-right font-mono text-[var(--text-muted)]">
                                            {formatCurrency(item.unitCost)}
                                        </td>
                                        <td className="p-5 text-right font-bold text-white">
                                            {formatCurrency(item.unitCost * item.quantity)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-[var(--text-muted)]">
                                        <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                        <p>No items found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Item Modal */}
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
                            <h2 className="text-2xl font-bold mb-6">Add Inventory Item</h2>

                            {error && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Item Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#27272a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)]"
                                        placeholder="e.g., RAM 16GB DDR4"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Type</label>
                                        <select
                                            className="w-full bg-[#27272a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)]"
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value as 'PRODUCT' | 'SPARE' })}
                                        >
                                            <option value="PRODUCT">Product</option>
                                            <option value="SPARE">Spare Part</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">SKU</label>
                                        <input
                                            type="text"
                                            className="w-full bg-[#27272a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)]"
                                            placeholder="Auto-generate"
                                            value={formData.sku}
                                            onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Office Selection - Only show for SUPER_ADMIN */}
                                {user?.role === 'SUPER_ADMIN' && offices.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                                            <Building2 className="w-3 h-3 inline mr-1" />
                                            Office
                                        </label>
                                        <select
                                            className="w-full bg-[#27272a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)]"
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

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Quantity</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className="w-full bg-[#27272a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)]"
                                            placeholder="Enter quantity"
                                            value={formData.quantity}
                                            onChange={e => handleNumberChange(e.target.value, 'quantity')}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Unit Cost (INR)</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            className="w-full bg-[#27272a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)]"
                                            placeholder="Enter cost"
                                            value={formData.unitCost}
                                            onChange={e => handleNumberChange(e.target.value, 'unitCost')}
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="w-full bg-[var(--primary)] text-black font-bold py-4 rounded-xl mt-2 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add to Inventory'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

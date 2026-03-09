import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, Search, Loader2, Play, CheckCircle2, ChevronRight, ChevronLeft, Save } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface StocktakeItem {
    id: string;
    stocktakeId: string;
    inventoryId: string;
    systemQuantity: number;
    countedQuantity: number | null;
    variance: number | null;
    notes: string | null;
    inventory?: {
        id: string;
        name: string;
        sku: string;
        category: string;
        unit: string;
    };
}

interface Stocktake {
    id: string;
    officeId: string;
    office?: { id: string; name: string };
    status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    notes: string | null;
    startedAt: string;
    completedAt: string | null;
    items?: StocktakeItem[];
    _count?: { items: number };
}

export function Stocktake() {
    const { user } = useAuthStore();
    const [view, setView] = useState<'LIST' | 'DETAIL'>('LIST');
    const [stocktakes, setStocktakes] = useState<Stocktake[]>([]);
    const [activeStocktake, setActiveStocktake] = useState<Stocktake | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // For detail view
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('ALL');
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        if (view === 'LIST') {
            fetchStocktakes();
        }
    }, [view]);

    const fetchStocktakes = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/inventory-ext/stocktake');
            if (res.data.success) setStocktakes(res.data.data);
        } catch (error) {
            console.error('Failed to fetch stocktakes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateStocktake = async () => {
        if (!confirm('Start a new cycle count for this office? This will snapshot current inventory quantities.')) return;

        try {
            setIsActionLoading(true);
            const res = await api.post('/inventory-ext/stocktake', { notes: `Routine count - ${new Date().toLocaleDateString()}` });
            if (res.data.success) {
                openDetail(res.data.data.id);
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to create stocktake');
        } finally {
            setIsActionLoading(false);
        }
    };

    const openDetail = async (id: string) => {
        try {
            setIsLoading(true);
            setView('DETAIL');
            const res = await api.get(`/inventory-ext/stocktake/${id}`);
            if (res.data.success) {
                setActiveStocktake(res.data.data);

                // Extract unique categories
                const items = res.data.data.items || [];
                const uniqueCats = Array.from(new Set(items.map((i: any) => i.inventory?.category || 'Uncategorized')));
                setCategories(uniqueCats as string[]);
            }
        } catch (error) {
            console.error('Failed to fetch detail', error);
            setView('LIST');
        } finally {
            setIsLoading(false);
        }
    };

    const updateCount = async (itemId: string, qty: string) => {
        if (!activeStocktake || activeStocktake.status !== 'IN_PROGRESS') return;

        const numQty = parseInt(qty, 10);
        if (isNaN(numQty) || numQty < 0) return;

        try {
            // Optimistic UI update
            const updatedItems = activeStocktake.items?.map(item => {
                if (item.id === itemId) {
                    return { ...item, countedQuantity: numQty, variance: numQty - item.systemQuantity };
                }
                return item;
            });
            setActiveStocktake({ ...activeStocktake, items: updatedItems });

            await api.patch(`/inventory-ext/stocktake/items/${itemId}`, { countedQuantity: numQty });
        } catch (err) {
            console.error('Failed to update count', err);
            // In a real app, revert optimistic update here
        }
    };

    const completeStocktake = async () => {
        if (!activeStocktake) return;

        const uncounted = activeStocktake.items?.filter(i => i.countedQuantity === null).length || 0;
        if (uncounted > 0) {
            alert(`You still have ${uncounted} items uncounted. You must enter a count for all items.`);
            return;
        }

        if (!confirm('Are you sure you want to complete this stocktake? System inventory quantities will be immediately overwritten by your counts.')) return;

        try {
            setIsActionLoading(true);
            const res = await api.post(`/inventory-ext/stocktake/${activeStocktake.id}/complete`);
            if (res.data.success) {
                alert(res.data.message);
                setView('LIST');
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to complete stocktake');
        } finally {
            setIsActionLoading(false);
        }
    };

    // Render List View
    if (view === 'LIST') {
        return (
            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                            <ClipboardCheck className="w-6 h-6 text-[var(--primary)]" />
                            Stocktakes & Cycle Counting
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Reconcile physical inventory counts against system records.
                        </p>
                    </div>
                    {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                        <button
                            onClick={handleCreateStocktake}
                            disabled={isActionLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-black rounded-lg hover:shadow-[0_0_15px_rgba(185,255,102,0.4)] transition-all font-medium disabled:opacity-50"
                        >
                            {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                            Start New Count
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" /></div>
                ) : stocktakes.length === 0 ? (
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-12 text-center text-[var(--text-secondary)] flex flex-col items-center">
                        <ClipboardCheck className="w-16 h-16 text-[var(--border-color)] mb-4" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Stocktakes Found</h3>
                        <p>Start a new cycle count to verify your office inventory.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {stocktakes.map((st, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={st.id}
                                onClick={() => openDetail(st.id)}
                                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 cursor-pointer hover:border-[var(--primary)] transition-all group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="text-xs text-[var(--text-secondary)] mb-1">
                                            {new Date(st.startedAt).toLocaleDateString()}
                                        </div>
                                        <div className="font-semibold text-[var(--text-primary)] text-lg">
                                            {st.office?.name || 'Office Count'}
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded border ${st.status === 'IN_PROGRESS' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                        st.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                        }`}>
                                        {st.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-sm text-[var(--text-secondary)]">
                                        <span className="font-bold text-[var(--text-primary)]">{st._count?.items || 0}</span> items matched
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Render Detail View
    if (!activeStocktake) return null;

    let displayItems = activeStocktake.items || [];
    if (searchTerm) {
        displayItems = displayItems.filter(i =>
            i.inventory?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.inventory?.sku.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    if (filterCategory !== 'ALL') {
        displayItems = displayItems.filter(i => i.inventory?.category === filterCategory);
    }

    const uncounted = activeStocktake.items?.filter(i => i.countedQuantity === null).length || 0;
    const itemsWithVariance = activeStocktake.items?.filter(i => i.variance !== null && i.variance !== 0).length || 0;
    const progressPerc = Math.round((((activeStocktake.items?.length || 0) - uncounted) / Math.max(activeStocktake.items?.length || 1, 1)) * 100);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Detail Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setView('LIST')}
                    className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-secondary)] transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                            {activeStocktake.office?.name} Stocktake
                        </h1>
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded border ${activeStocktake.status === 'IN_PROGRESS' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                            {activeStocktake.status.replace('_', ' ')}
                        </span>
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">
                        Started: {new Date(activeStocktake.startedAt).toLocaleString()}
                        {activeStocktake.completedAt && ` • Completed: ${new Date(activeStocktake.completedAt).toLocaleString()}`}
                    </p>
                </div>
                {activeStocktake.status === 'IN_PROGRESS' && (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                    <button
                        onClick={completeStocktake}
                        disabled={isActionLoading || uncounted > 0}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-black rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50"
                    >
                        {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Complete Count
                    </button>
                )}
            </div>

            {/* Status Bar */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
                <div className="flex flex-wrap justify-between items-center gap-6">
                    <div className="flex-1 min-w-[200px]">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-[var(--text-secondary)]">Count Progress</span>
                            <span className="font-bold text-[var(--text-primary)]">{progressPerc}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-[var(--bg-overlay)] rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--primary)] transition-all duration-500" style={{ width: `${progressPerc}%` }} />
                        </div>
                    </div>

                    <div className="flex gap-8 text-center">
                        <div>
                            <div className="text-2xl font-bold text-[var(--text-primary)]">{activeStocktake.items?.length || 0}</div>
                            <div className="text-xs text-[var(--text-secondary)] uppercase">Total SKUs</div>
                        </div>
                        <div>
                            <div className={`text-2xl font-bold ${uncounted === 0 ? 'text-emerald-400' : 'text-orange-400'}`}>{uncounted}</div>
                            <div className="text-xs text-[var(--text-secondary)] uppercase">Pending</div>
                        </div>
                        <div>
                            <div className={`text-2xl font-bold ${itemsWithVariance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{itemsWithVariance}</div>
                            <div className="text-xs text-[var(--text-secondary)] uppercase">Discrepancies</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Count Sheet */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex flex-col h-[calc(100vh-360px)] min-h-[500px]">
                <div className="p-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-4 bg-[var(--bg-overlay)] rounded-t-xl">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                        <input
                            type="text"
                            placeholder="Find item..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] text-sm"
                        />
                    </div>

                    <div className="flex overflow-x-auto gap-2 max-w-full custom-scrollbar pb-1">
                        <button
                            onClick={() => setFilterCategory('ALL')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterCategory === 'ALL' ? 'bg-[var(--primary)] text-black' : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)]'
                                }`}
                        >
                            All Categories
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setFilterCategory(cat)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterCategory === cat ? 'bg-[var(--primary)] text-black' : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)]'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-[var(--bg-card)] z-10 border-b border-[var(--border-color)]">
                                <tr>
                                    <th className="p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Item Details</th>
                                    <th className="p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-center">System Qty</th>
                                    <th className="p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-center">Physical Count</th>
                                    <th className="p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-center w-24">Variance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayItems.map((item) => {
                                    const isDiscrepant = item.variance !== null && item.variance !== 0;
                                    const isCounted = item.countedQuantity !== null;

                                    return (
                                        <tr
                                            key={item.id}
                                            className={`border-b border-[var(--border-color)] transition-colors ${isDiscrepant ? 'bg-red-500/5' : isCounted ? 'bg-emerald-500/5' : 'hover:bg-[var(--bg-overlay)]'
                                                }`}
                                        >
                                            <td className="p-4">
                                                <div className="font-semibold text-[var(--text-primary)]">{item.inventory?.name || 'Unknown'}</div>
                                                <div className="text-xs text-[var(--text-secondary)] mt-1 flex gap-2">
                                                    <span className="bg-[var(--bg-overlay)] px-1.5 rounded">{item.inventory?.sku}</span>
                                                    <span>{item.inventory?.category}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="font-mono text-[var(--text-secondary)]">{item.systemQuantity} {item.inventory?.unit}</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {activeStocktake.status === 'IN_PROGRESS' ? (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className={`w-24 text-center py-2 px-3 rounded-lg border focus:outline-none font-bold text-lg font-mono ${isCounted
                                                            ? isDiscrepant ? 'bg-red-500/10 border-red-500/30 text-red-500 focus:border-red-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 focus:border-emerald-500'
                                                            : 'bg-[var(--bg-overlay)] border-[var(--border-color)] text-[var(--text-primary)] focus:border-[var(--primary)]'
                                                            }`}
                                                        placeholder="Qty"
                                                        defaultValue={item.countedQuantity !== null ? item.countedQuantity : ''}
                                                        onBlur={(e) => {
                                                            if (e.target.value !== '' && e.target.value !== String(item.countedQuantity)) {
                                                                updateCount(item.id, e.target.value);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.currentTarget.blur();
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="font-mono font-bold text-lg text-[var(--text-primary)]">
                                                        {item.countedQuantity !== null ? item.countedQuantity : '-'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {item.variance === null ? (
                                                    <span className="text-[var(--text-muted)]">-</span>
                                                ) : item.variance === 0 ? (
                                                    <div className="flex justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
                                                ) : (
                                                    <span className={`font-bold font-mono py-1 px-2 rounded-md ${item.variance > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {item.variance > 0 ? '+' : ''}{item.variance}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {displayItems.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">
                                            No items match your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

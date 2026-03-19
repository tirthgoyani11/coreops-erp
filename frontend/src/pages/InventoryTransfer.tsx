import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeftRight,
    Search,
    Loader2,
    Building,
    Package,
    AlertCircle,
    CheckCircle2,
    Brain,
    Sparkles,
    Activity,
    Zap,
    ShieldAlert,
    CircleDot,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface InventoryItem {
    id: string;
    name: string;
    sku: string;
    category: string;
    currentQuantity: number;
    reorderPoint: number;
    unit: string;
    officeId: string;
    office?: { name: string };
}

interface Office {
    id: string;
    name: string;
}

interface InventoryOverview {
    summary: {
        totalItems: number;
        totalUnits: number;
        lowStockCount: number;
        outOfStockCount: number;
        movementCount30Days: number;
    };
}

interface InventoryInsights {
    source: string;
    headline: string;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendations: string[];
}

export function InventoryTransfer() {
    const { user } = useAuthStore();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [offices, setOffices] = useState<Office[]>([]);
    const [overview, setOverview] = useState<InventoryOverview | null>(null);
    const [insights, setInsights] = useState<InventoryInsights | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [targetOffice, setTargetOffice] = useState<string>('');
    const [quantity, setQuantity] = useState<string>('');
    const [notes, setNotes] = useState<string>('');

    // Search & Filter
    const [searchTerm, setSearchTerm] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [itemsRes, officesRes] = await Promise.all([
                api.get('/inventory'),
                api.get('/offices')
            ]);

            // Non-blocking orchestrator context.
            void Promise.allSettled([
                api.get('/inventory/overview'),
                api.get('/inventory/insights'),
            ]).then(([overviewRes, insightsRes]) => {
                if (overviewRes.status === 'fulfilled' && overviewRes.value.data?.success) {
                    setOverview(overviewRes.value.data.data);
                }
                if (insightsRes.status === 'fulfilled' && insightsRes.value.data?.success) {
                    setInsights(insightsRes.value.data.data);
                }
            });

            if (itemsRes.data.success) {
                // If user is not super admin, they can only transfer out of their own office
                const availableItems = user?.role === 'SUPER_ADMIN'
                    ? itemsRes.data.data
                    : itemsRes.data.data.filter((i: any) => i.officeId === user?.officeId);
                setItems(availableItems);
            }
            if (officesRes.data.success) {
                setOffices(officesRes.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch data for transfers', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedItem || !targetOffice || !quantity) return;

        const transferQty = parseInt(quantity, 10);
        if (isNaN(transferQty) || transferQty <= 0) {
            alert('Please enter a valid quantity');
            return;
        }
        if (transferQty > selectedItem.currentQuantity) {
            alert(`Cannot transfer more than available stock (${selectedItem.currentQuantity}).`);
            return;
        }
        if (selectedItem.officeId === targetOffice) {
            alert('Source and target offices cannot be the same.');
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await api.post('/inventory/transfer', {
                sourceItemId: selectedItem.id,
                targetOfficeId: targetOffice,
                quantity: transferQty,
                notes
            });

            if (res.data.success) {
                setSuccessMessage(`Successfully transferred ${transferQty} units of ${selectedItem.name}.`);
                // Reset form
                setSelectedItem(null);
                setTargetOffice('');
                setQuantity('');
                setNotes('');
                // Refresh data
                fetchData();

                setTimeout(() => setSuccessMessage(''), 5000);
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to transfer stock.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.currentQuantity > 0 &&
        (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getOfficeName = (item: InventoryItem | null) => {
        if (!item) return 'Unknown';
        if (item.office?.name) return item.office.name;
        const matched = offices.find((office) => office.id === item.officeId);
        return matched?.name || 'Unknown';
    };

    const numericQuantity = Number.parseInt(quantity || '0', 10);
    const validQuantity = Number.isFinite(numericQuantity) ? numericQuantity : 0;
    const postTransferQty = selectedItem ? Math.max(0, selectedItem.currentQuantity - validQuantity) : 0;
    const sourceRiskAfterTransfer = selectedItem
        ? postTransferQty <= selectedItem.reorderPoint
        : false;
    const transferableUnits = items.reduce((sum, item) => sum + Math.max(0, item.currentQuantity), 0);

    const setQuickQuantity = (fraction: number) => {
        if (!selectedItem) return;
        const q = Math.max(1, Math.floor(selectedItem.currentQuantity * fraction));
        setQuantity(String(q));
    };

    const urgencyStyle =
        insights?.urgency === 'CRITICAL'
            ? 'border-red-500/40 bg-red-500/10 text-red-300'
            : insights?.urgency === 'HIGH'
                ? 'border-orange-500/40 bg-orange-500/10 text-orange-300'
                : insights?.urgency === 'MEDIUM'
                    ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <ArrowLeftRight className="w-6 h-6 text-[var(--primary)]" />
                        Inventory Transfers
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Move stock items between different office locations.
                    </p>
                </div>
                <Link
                    to="/finance/exception-center?module=inventory_transfer"
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--primary)] transition-colors"
                >
                    <ShieldAlert className="w-4 h-4" />
                    Transfer Exceptions
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Transferable SKUs</div>
                    <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{filteredItems.length}</div>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Transferable Units</div>
                    <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{transferableUnits}</div>
                </div>
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-yellow-300">Low-Stock Alerts</div>
                    <div className="mt-2 text-2xl font-bold text-yellow-200">{overview?.summary.lowStockCount ?? 0}</div>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">30d Movements</div>
                    <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{overview?.summary.movementCount30Days ?? 0}</div>
                </div>
            </div>

            <div className={`rounded-xl border p-4 ${urgencyStyle}`}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-xs uppercase tracking-wide flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            Central AI Orchestrator Transfer Brief
                        </div>
                        <div className="mt-2 font-semibold">
                            {insights?.headline || 'Cross-office flow is stable. Prioritize transfers that reduce low-stock hotspots.'}
                        </div>
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full border border-current/30">
                        {insights?.urgency || 'LOW'}
                    </div>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {(insights?.recommendations?.slice(0, 3) || [
                        'Consolidate fragmented stock before raising external POs.',
                        'Avoid transfers that push source office below reorder point.',
                        'Escalate urgent inter-office demand mismatches in Exception Center.',
                    ]).map((rec) => (
                        <div key={rec} className="rounded-lg border border-current/20 bg-black/10 p-3 flex items-start gap-2">
                            <Sparkles className="w-4 h-4 mt-0.5" />
                            <span>{rec}</span>
                        </div>
                    ))}
                </div>
            </div>

            {successMessage && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-3"
                >
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    {successMessage}
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Item Selection */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex flex-col h-[600px]">
                    <div className="p-4 border-b border-[var(--border-color)]">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">1. Select Source Item</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                            <input
                                type="text"
                                placeholder="Search inventory by name or SKU..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar p-2">
                        {isLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" /></div>
                        ) : filteredItems.length === 0 ? (
                            <div className="text-center py-8 text-[var(--text-muted)]">No available items found.</div>
                        ) : (
                            <div className="space-y-2">
                                {filteredItems.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedItem(item)}
                                        className={`w-full text-left p-3 rounded-lg border transition-all ${selectedItem?.id === item.id
                                                ? 'bg-[var(--primary)]/10 border-[var(--primary)] border-l-4 border-l-[var(--primary)]'
                                                : 'bg-[var(--bg-overlay)] border-[var(--border-color)] hover:border-[var(--primary)]/50'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className={`font-semibold ${selectedItem?.id === item.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`}>
                                                    {item.name}
                                                </div>
                                                <div className="text-xs text-[var(--text-secondary)] mt-1 flex gap-2">
                                                    <span>{item.sku}</span>
                                                    <span>•</span>
                                                    <span>{getOfficeName(item)}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-mono text-sm font-bold text-[var(--text-primary)]">{item.currentQuantity}</div>
                                                <div className="text-[10px] text-[var(--text-muted)] uppercase">{item.unit}</div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Transfer Form */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex flex-col h-[600px]">
                    <div className="p-4 border-b border-[var(--border-color)]">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">2. Transfer Details</h2>
                    </div>

                    <div className="flex-1 p-6 overflow-auto custom-scrollbar">
                        {!selectedItem ? (
                            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] text-center p-6">
                                <Package className="w-16 h-16 mb-4 opacity-30" />
                                <p>Please select a source item from the list on the left to begin a transfer.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleTransfer} className="space-y-6">
                                <div className="bg-[var(--bg-overlay)] p-4 rounded-lg border border-[var(--border-color)]">
                                    <div className="text-sm text-[var(--text-secondary)] mb-1">Transferring Item:</div>
                                    <div className="font-semibold text-[var(--text-primary)] text-lg">{selectedItem.name}</div>
                                    <div className="flex gap-4 mt-2 text-sm text-[var(--text-secondary)]">
                                        <div className="flex items-center gap-1.5"><Package className="w-4 h-4" /> {selectedItem.sku}</div>
                                        <div className="flex items-center gap-1.5 font-mono text-[var(--primary)]">{selectedItem.currentQuantity} {selectedItem.unit} Available</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                            Current Office (Source)
                                        </label>
                                        <div className="p-3 bg-gray-500/5 border border-gray-500/20 rounded-lg text-[var(--text-secondary)] flex items-center gap-2">
                                            <Building className="w-4 h-4" />
                                            {getOfficeName(selectedItem)}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                            Target Office (Destination) <span className="text-red-400">*</span>
                                        </label>
                                        <select
                                            required
                                            value={targetOffice}
                                            onChange={(e) => setTargetOffice(e.target.value)}
                                            className="w-full p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                        >
                                            <option value="">Select an office...</option>
                                            {offices
                                                .filter(o => o.id !== selectedItem.officeId)
                                                .map(office => (
                                                    <option key={office.id} value={office.id}>{office.name}</option>
                                                ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                            Quantity to Transfer <span className="text-red-400">*</span>
                                        </label>
                                        <div className="mb-2 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setQuickQuantity(0.25)}
                                                className="px-2.5 py-1 text-xs rounded-full border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--primary)]"
                                            >
                                                25%
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setQuickQuantity(0.5)}
                                                className="px-2.5 py-1 text-xs rounded-full border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--primary)]"
                                            >
                                                50%
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setQuickQuantity(0.75)}
                                                className="px-2.5 py-1 text-xs rounded-full border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--primary)]"
                                            >
                                                75%
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                required
                                                type="number"
                                                min="1"
                                                max={selectedItem.currentQuantity}
                                                value={quantity}
                                                onChange={(e) => setQuantity(e.target.value)}
                                                className="w-full p-3 pr-16 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                                placeholder="0"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">
                                                {selectedItem.unit}
                                            </span>
                                        </div>
                                        {parseInt(quantity || '0', 10) > selectedItem.currentQuantity && (
                                            <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                Quantity exceeds available stock.
                                            </p>
                                        )}
                                        <div className="mt-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3 text-sm">
                                            <div className="font-medium text-[var(--text-primary)] flex items-center gap-2 mb-2">
                                                <Activity className="w-4 h-4 text-[var(--primary)]" />
                                                Transfer Impact Simulation
                                            </div>
                                            <div className="flex items-center justify-between text-[var(--text-secondary)]">
                                                <span>Projected source balance</span>
                                                <span className="font-semibold text-[var(--text-primary)]">{postTransferQty} {selectedItem.unit}</span>
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[var(--text-secondary)]">Post-transfer risk</span>
                                                <span className={`text-xs px-2 py-1 rounded-full border ${sourceRiskAfterTransfer ? 'text-red-300 border-red-500/40 bg-red-500/10' : 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'}`}>
                                                    {sourceRiskAfterTransfer ? 'Below reorder point' : 'Within policy'}
                                                </span>
                                            </div>
                                            {sourceRiskAfterTransfer && (
                                                <Link
                                                    to={`/finance/exception-center?module=inventory_transfer&ref=${selectedItem.id}`}
                                                    className="mt-2 inline-flex items-center gap-2 text-xs text-red-300 hover:text-red-200"
                                                >
                                                    <CircleDot className="w-3 h-3" />
                                                    Raise transfer risk exception
                                                </Link>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                            Transfer Notes
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] resize-none"
                                            placeholder="Reason or reference for this transfer..."
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 mt-4 border-t border-[var(--border-color)] flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedItem(null)}
                                        className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mr-4 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !targetOffice || !quantity || parseInt(quantity, 10) > selectedItem.currentQuantity}
                                        className="flex items-center gap-2 px-6 py-2 bg-[var(--primary)] text-black rounded-lg hover:shadow-[0_0_15px_rgba(185,255,102,0.4)] transition-all font-medium disabled:opacity-50 disabled:hover:shadow-none"
                                    >
                                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                                        Execute Transfer
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

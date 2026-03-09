import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, AlertTriangle, Calendar, Search, Loader2, ArrowRight, Activity, TrendingDown } from 'lucide-react';
import api from '../lib/api';
import type { InventoryItem } from '../types';

interface Batch {
    id: string;
    inventoryId: string;
    inventory?: InventoryItem;
    batchNumber: string;
    lotNumber: string | null;
    quantity: number;
    remainingQuantity: number;
    expiryDate: string | null;
    manufacturingDate: string | null;
    receivedDate: string;
    costPerUnit: number | null;
    status: 'AVAILABLE' | 'EXPIRED' | 'CONSUMED' | 'QUARANTINE';
    notes: string | null;
}

export function BatchTracker() {
    const [expiringBatches, setExpiringBatches] = useState<Batch[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<string>('');
    const [itemBatches, setItemBatches] = useState<Batch[]>([]);

    const [isLoadingExpiring, setIsLoadingExpiring] = useState(true);
    const [isLoadingBatches, setIsLoadingBatches] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setIsLoadingExpiring(true);
                const [expiringRes, inventoryRes] = await Promise.all([
                    api.get('/inventory-ext/batches/expiring?days=60'),
                    api.get('/inventory')
                ]);

                if (expiringRes.data.success) {
                    setExpiringBatches(expiringRes.data.data);
                }
                if (inventoryRes.data.success) {
                    setInventoryItems(inventoryRes.data.data);
                }
            } catch (err) {
                console.error('Failed to fetch initial batch data', err);
            } finally {
                setIsLoadingExpiring(false);
            }
        };

        fetchDashboardData();
    }, []);

    useEffect(() => {
        if (!selectedItem) {
            setItemBatches([]);
            return;
        }

        const fetchItemBatches = async () => {
            try {
                setIsLoadingBatches(true);
                const res = await api.get(`/inventory-ext/${selectedItem}/batches`);
                if (res.data.success) {
                    setItemBatches(res.data.data);
                }
            } catch (err) {
                console.error('Failed to fetch item batches', err);
            } finally {
                setIsLoadingBatches(false);
            }
        };

        fetchItemBatches();
    }, [selectedItem]);

    const getStatusColor = (status: string, remaining: number, expiry: string | null) => {
        if (status === 'EXPIRED') return 'bg-red-500/20 text-red-400 border-red-500/20';
        if (remaining === 0 || status === 'CONSUMED') return 'bg-gray-500/20 text-gray-400 border-gray-500/20';

        if (expiry) {
            const daysToExpiry = (new Date(expiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
            if (daysToExpiry < 0) return 'bg-red-500/20 text-red-400 border-red-500/20';
            if (daysToExpiry <= 30) return 'bg-orange-500/20 text-orange-400 border-orange-500/20';
            if (daysToExpiry <= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20';
        }

        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
    };

    const filteredInventory = inventoryItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                    <Package className="w-6 h-6 text-[var(--primary)]" />
                    Batch & Lot Tracking
                </h1>
                <p className="text-[var(--text-secondary)] mt-1">
                    Monitor inventory batches, check expiry dates, and trace lot histories.
                </p>
            </div>

            {/* Expiring Soon Alerts */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <h2 className="text-lg font-bold text-[var(--text-primary)] text-red-400">Expiring Within 60 Days</h2>
                </div>

                {isLoadingExpiring ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
                    </div>
                ) : expiringBatches.length === 0 ? (
                    <div className="text-[var(--text-secondary)] text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        No batches are expiring within the next 60 days. System stock is healthy.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {expiringBatches.map(batch => (
                            <div key={batch.id} className="bg-[var(--bg-card)] border border-red-500/20 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-[var(--text-primary)] truncate" title={batch.inventory?.name}>
                                        {batch.inventory?.name || 'Unknown Item'}
                                    </h3>
                                    <span className="text-xs font-bold px-2 py-1 rounded bg-red-500/10 text-red-400">
                                        Lot: {batch.batchNumber}
                                    </span>
                                </div>
                                <div className="text-sm text-[var(--text-secondary)] space-y-1">
                                    <div className="flex justify-between">
                                        <span>Remaining:</span>
                                        <span className="text-[var(--text-primary)] font-medium">{batch.remainingQuantity} units</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Expires:</span>
                                        <span className="text-red-400 font-medium">
                                            {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Inventory Item Selector (Left Column) */}
                <div className="lg:col-span-1 border-r border-[var(--border-color)] pr-6 space-y-4">
                    <h3 className="font-semibold text-[var(--text-primary)]">Select Item to View Batches</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                        <input
                            type="text"
                            placeholder="Search by SKU or Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                        />
                    </div>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredInventory.length === 0 ? (
                            <p className="text-[var(--text-muted)] text-sm text-center py-4">No tracking-enabled items found.</p>
                        ) : (
                            filteredInventory.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setSelectedItem(item.id)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedItem === item.id
                                        ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]'
                                        : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--primary)]/50'
                                        }`}
                                >
                                    <div className="font-medium truncate">{item.name}</div>
                                    <div className={`text-xs mt-1 flex justify-between ${selectedItem === item.id ? 'text-[var(--primary)]/80' : 'text-[var(--text-secondary)]'}`}>
                                        <span>{item.sku}</span>
                                        <span>Qty: {item.quantity}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Batch List for Selected Item (Right Column) */}
                <div className="lg:col-span-2">
                    {!selectedItem ? (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-[var(--text-muted)] p-8 border border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-overlay)]">
                            <ArrowRight className="w-8 h-8 mb-4 opacity-50" />
                            <p>Select an inventory item from the left panel to view its complete batch history and lot trace.</p>
                        </div>
                    ) : isLoadingBatches ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-[var(--text-primary)]">Batch History</h3>
                                <div className="text-sm px-3 py-1 bg-[var(--bg-overlay)] rounded-full text-[var(--text-secondary)] border border-[var(--border-color)]">
                                    Total Active Lots: <span className="font-bold text-[var(--text-primary)]">{itemBatches.filter(b => b.remainingQuantity > 0).length}</span>
                                </div>
                            </div>

                            {itemBatches.length === 0 ? (
                                <div className="text-center py-12 border border-[var(--border-color)] rounded-xl bg-[var(--bg-card)]">
                                    <Activity className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                                    <p className="text-[var(--text-primary)] font-medium">No batch tracking data found</p>
                                    <p className="text-[var(--text-muted)] text-sm mt-1">This item has not received any serialized or batched stock yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                        <div className="col-span-3">Batch/Lot #</div>
                                        <div className="col-span-3">Received / Qty</div>
                                        <div className="col-span-3">Stock Remaining</div>
                                        <div className="col-span-3 text-right">Status & Expiry</div>
                                    </div>

                                    {itemBatches.map((batch, index) => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            key={batch.id}
                                            className="grid grid-cols-12 gap-4 items-center p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-card-hover)] transition-colors"
                                        >
                                            <div className="col-span-3">
                                                <div className="font-bold text-[var(--text-primary)]">{batch.batchNumber}</div>
                                                {batch.lotNumber && <div className="text-xs text-[var(--text-secondary)]">M-Lot: {batch.lotNumber}</div>}
                                            </div>

                                            <div className="col-span-3">
                                                <div className="text-sm font-medium text-[var(--text-primary)]">{batch.quantity} initial units</div>
                                                <div className="text-xs text-[var(--text-secondary)] mt-0.5">On {new Date(batch.receivedDate).toLocaleDateString()}</div>
                                            </div>

                                            <div className="col-span-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-[var(--bg-overlay)] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-[var(--primary)] rounded-full"
                                                            style={{ width: `${(batch.remainingQuantity / batch.quantity) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-bold text-[var(--text-primary)] min-w-[40px] text-right">
                                                        {batch.remainingQuantity}
                                                    </span>
                                                </div>
                                                {batch.remainingQuantity === 0 && (
                                                    <span className="text-[10px] uppercase font-bold text-gray-500 mt-1 flex items-center gap-1">
                                                        <TrendingDown className="w-3 h-3" /> Fully Depleted
                                                    </span>
                                                )}
                                            </div>

                                            <div className="col-span-3 flex flex-col items-end">
                                                <span className={`px-2.5 py-1 rounded text-xs font-bold border ${getStatusColor(batch.status, batch.remainingQuantity, batch.expiryDate)}`}>
                                                    {batch.remainingQuantity === 0 ? 'CONSUMED' : batch.status}
                                                </span>
                                                {batch.expiryDate && (
                                                    <div className="text-xs mt-1.5 text-[var(--text-secondary)] flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        Exp: {new Date(batch.expiryDate).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

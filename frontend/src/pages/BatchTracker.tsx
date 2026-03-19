import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, AlertTriangle, Calendar, Search, Loader2, ArrowRight, Activity, TrendingDown, RefreshCw, ShieldAlert } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../hooks/useToast';
import { useAuthStore } from '../stores/authStore';
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
    const navigate = useNavigate();
    const toast = useToast();
    const { user } = useAuthStore();

    const [expiringBatches, setExpiringBatches] = useState<Batch[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<string>('');
    const [itemBatches, setItemBatches] = useState<Batch[]>([]);
    const [batchStockSummary, setBatchStockSummary] = useState<Record<string, number>>({});

    const [isLoadingExpiring, setIsLoadingExpiring] = useState(true);
    const [isLoadingBatches, setIsLoadingBatches] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isConsuming, setIsConsuming] = useState(false);
    const [isUpdatingTracking, setIsUpdatingTracking] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [daysWindow, setDaysWindow] = useState(60);
    const [consumeQuantity, setConsumeQuantity] = useState(1);
    const [batchCapability, setBatchCapability] = useState<{ enabled: boolean; reason?: string }>({ enabled: true });

    const canConsume = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'].includes(String(user?.role || ''));
    const canConfigureTracking = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(String(user?.role || ''));

    const fetchDashboardData = async (showRefresh = false) => {
        try {
            if (showRefresh) setIsRefreshing(true);
            setIsLoadingExpiring(true);
            const [expiringRes, inventoryRes] = await Promise.all([
                api.get(`/inventory-ext/batches/expiring?days=${daysWindow}`),
                api.get('/inventory')
            ]);

            const summaryRes = await api.get('/inventory-ext/batches/stock-summary');

            if (expiringRes.data.success) {
                setExpiringBatches(expiringRes.data.data);
                if (expiringRes.data.capability) {
                    setBatchCapability(expiringRes.data.capability);
                }
            }
            if (inventoryRes.data.success) {
                setInventoryItems(inventoryRes.data.data);
            }
            if (summaryRes.data?.success) {
                const map: Record<string, number> = {};
                for (const row of summaryRes.data.data || []) {
                    map[row.inventoryId] = Number(row.availableQuantity || 0);
                }
                setBatchStockSummary(map);
                if (summaryRes.data.capability) {
                    setBatchCapability(summaryRes.data.capability);
                }
            }
        } catch (err) {
            console.error('Failed to fetch initial batch data', err);
            toast.error('Failed to load batch dashboard');
        } finally {
            setIsLoadingExpiring(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [daysWindow]);

    useEffect(() => {
        if (!selectedItem) {
            setItemBatches([]);
            return;
        }
        setConsumeQuantity(1);

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
        (item.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const kpis = useMemo(() => {
        const now = Date.now();
        const expiringIn15 = expiringBatches.filter((b) => {
            if (!b.expiryDate) return false;
            const days = (new Date(b.expiryDate).getTime() - now) / (1000 * 3600 * 24);
            return days >= 0 && days <= 15;
        }).length;

        const expiringIn30 = expiringBatches.filter((b) => {
            if (!b.expiryDate) return false;
            const days = (new Date(b.expiryDate).getTime() - now) / (1000 * 3600 * 24);
            return days >= 0 && days <= 30;
        }).length;

        const totalExpiringUnits = expiringBatches.reduce((sum, b) => sum + Number(b.remainingQuantity || 0), 0);
        const distinctItemsAtRisk = new Set(expiringBatches.map((b) => b.inventoryId)).size;

        return {
            totalExpiringBatches: expiringBatches.length,
            expiringIn15,
            expiringIn30,
            totalExpiringUnits,
            distinctItemsAtRisk,
        };
    }, [expiringBatches]);

    const selectedItemData: any = useMemo(
        () => inventoryItems.find((i) => i.id === selectedItem),
        [inventoryItems, selectedItem]
    );

    const selectedAvailableQty = Number(selectedItemData?.currentQuantity ?? selectedItemData?.quantity ?? 0);
    const selectedTrackingType = String((selectedItemData as any)?.trackingType || 'QUANTITY').toUpperCase();
    const totalBatchAvailableQty = useMemo(
        () => itemBatches
            .filter((b) => b.status === 'AVAILABLE' && Number(b.remainingQuantity || 0) > 0)
            .reduce((sum, b) => sum + Number(b.remainingQuantity || 0), 0),
        [itemBatches]
    );

    const consumeFromFifo = async () => {
        if (!selectedItem) return;
        if (selectedTrackingType !== 'BATCH') {
            toast.error('Selected SKU is not batch-tracked. Enable batch tracking first.');
            return;
        }
        if (!consumeQuantity || consumeQuantity <= 0) {
            toast.error('Enter a valid consume quantity');
            return;
        }
        if (totalBatchAvailableQty <= 0) {
            toast.error('No available batch stock to consume');
            return;
        }
        if (consumeQuantity > totalBatchAvailableQty) {
            toast.error(`Only ${totalBatchAvailableQty} unit(s) available in open batches`);
            setConsumeQuantity(totalBatchAvailableQty);
            return;
        }

        try {
            setIsConsuming(true);
            const res = await api.post(`/inventory-ext/${selectedItem}/batches/consume`, {
                quantity: Number(consumeQuantity),
                reason: 'Quick consume from Batch Tracker',
                reference: `BATCH_TRACKER_${new Date().toISOString().slice(0, 10)}`,
            });

            if (res.data?.success) {
                toast.success(res.data.message || 'Batch consumption successful');
                const [itemRes] = await Promise.all([
                    api.get(`/inventory-ext/${selectedItem}/batches`),
                    fetchDashboardData(true),
                ]);
                if (itemRes.data?.success) {
                    setItemBatches(itemRes.data.data);
                }
            }
        } catch (err: any) {
            const apiMessage = err?.response?.data?.message || 'Failed to consume batch';
            toast.error(apiMessage);

            const shortMatch = String(apiMessage).match(/Short by\s+(\d+)\s+units/i);
            if (shortMatch && totalBatchAvailableQty > 0) {
                setConsumeQuantity(totalBatchAvailableQty);
            }
        } finally {
            setIsConsuming(false);
        }
    };

    const enableBatchTracking = async () => {
        if (!selectedItem) return;
        if (selectedTrackingType === 'BATCH') return;

        try {
            setIsUpdatingTracking(true);
            const res = await api.put(`/inventory/${selectedItem}`, { trackingType: 'BATCH' });
            if (res.data?.success) {
                toast.success('Batch tracking enabled for selected SKU');
                await fetchDashboardData(true);
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to enable batch tracking');
        } finally {
            setIsUpdatingTracking(false);
        }
    };

    const hasOpenBatchStock = totalBatchAvailableQty > 0;

    return (
        <div className="space-y-8">
            {!batchCapability.enabled && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-200">
                    <div className="font-semibold">Batch module is not initialized in this database</div>
                    <div className="text-sm mt-1">{batchCapability.reason || 'Run database migrations for InventoryBatch and related tables.'}</div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <Package className="w-6 h-6 text-[var(--primary)]" />
                        Batch & Lot Tracking
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Monitor inventory batches, check expiry dates, and trace lot histories.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={daysWindow}
                        onChange={(e) => setDaysWindow(Number(e.target.value))}
                        className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)]"
                    >
                        <option value={30}>Next 30 days</option>
                        <option value={60}>Next 60 days</option>
                        <option value={90}>Next 90 days</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => fetchDashboardData(true)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Expiring Batches</div>
                    <div className="text-xl font-bold text-[var(--text-primary)] mt-1">{kpis.totalExpiringBatches}</div>
                </div>
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                    <div className="text-xs uppercase tracking-wider text-red-200">Critical 15d</div>
                    <div className="text-xl font-bold text-red-300 mt-1">{kpis.expiringIn15}</div>
                </div>
                <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3">
                    <div className="text-xs uppercase tracking-wider text-orange-200">Risk 30d</div>
                    <div className="text-xl font-bold text-orange-300 mt-1">{kpis.expiringIn30}</div>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Units At Risk</div>
                    <div className="text-xl font-bold text-[var(--text-primary)] mt-1">{kpis.totalExpiringUnits}</div>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Items Impacted</div>
                    <div className="text-xl font-bold text-[var(--text-primary)] mt-1">{kpis.distinctItemsAtRisk}</div>
                </div>
            </div>

            {/* Expiring Soon Alerts */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <h2 className="text-lg font-bold text-[var(--text-primary)] text-red-400">Expiring Within {daysWindow} Days</h2>
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
                                <button
                                    type="button"
                                    onClick={() => navigate(`/finance/exception-center?module=INVENTORY&ref=${batch.inventoryId}`)}
                                    className="mt-3 inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-red-500/30 text-red-300 hover:bg-red-500/10"
                                >
                                    <ShieldAlert className="w-3 h-3" /> Open Exception
                                </button>
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
                            <div className="text-[var(--text-muted)] text-sm text-center py-4 space-y-2">
                                <p>No inventory items found.</p>
                                <p className="text-xs">Try adjusting the search text.</p>
                            </div>
                        ) : (
                            filteredInventory.map(item => (
                                // In batch tracker, prefer live batch-derived stock over generic inventory quantity.
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
                                        <span>Qty: {batchStockSummary[item.id] ?? (item as any).currentQuantity ?? item.quantity ?? 0}</span>
                                    </div>
                                    <div className={`text-[10px] mt-1 ${selectedItem === item.id ? 'text-[var(--primary)]/75' : 'text-[var(--text-muted)]'}`}>
                                        {(item as any).trackingType || 'QUANTITY'} tracking
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

                            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div className="text-sm text-[var(--text-secondary)]">
                                        Selected SKU stock: <span className="font-semibold text-[var(--text-primary)]">{selectedAvailableQty}</span>
                                    </div>
                                    <div className="text-sm text-[var(--text-secondary)]">
                                        Tracking mode: <span className="font-semibold text-[var(--text-primary)]">{selectedTrackingType}</span>
                                    </div>
                                    <div className="text-sm text-[var(--text-secondary)]">
                                        Open batch availability: <span className="font-semibold text-[var(--text-primary)]">{totalBatchAvailableQty}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={1}
                                            max={Math.max(1, totalBatchAvailableQty)}
                                            value={consumeQuantity}
                                            onChange={(e) => setConsumeQuantity(Math.max(1, Number(e.target.value || 1)))}
                                            className="w-24 px-2 py-1.5 rounded border border-[var(--border-color)] bg-[var(--bg-overlay)] text-[var(--text-primary)]"
                                            disabled={!hasOpenBatchStock}
                                        />
                                        <button
                                            type="button"
                                            onClick={consumeFromFifo}
                                            disabled={!canConsume || isConsuming || !hasOpenBatchStock || selectedTrackingType !== 'BATCH'}
                                            className="px-3 py-1.5 rounded border border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--primary)]/10 disabled:opacity-50"
                                        >
                                            {isConsuming
                                                ? 'Consuming...'
                                                : selectedTrackingType !== 'BATCH'
                                                    ? 'Batch Tracking Required'
                                                    : hasOpenBatchStock
                                                        ? 'One-click FIFO Consume'
                                                        : 'No Batch Stock'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/finance/exception-center?module=INVENTORY&ref=${selectedItem}`)}
                                            className="px-3 py-1.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
                                        >
                                            Exception View
                                        </button>
                                    </div>
                                </div>
                                {!hasOpenBatchStock && (
                                    <div className="mt-3 text-xs text-orange-300 flex flex-wrap gap-2 items-center">
                                        <span>
                                            {selectedTrackingType !== 'BATCH'
                                                ? 'This SKU is not batch-tracked yet.'
                                                : 'No available lot in batches for this SKU.'}
                                        </span>
                                        {selectedTrackingType !== 'BATCH' && canConfigureTracking && (
                                            <button
                                                type="button"
                                                onClick={enableBatchTracking}
                                                disabled={isUpdatingTracking}
                                                className="px-2 py-1 rounded border border-emerald-400/40 hover:bg-emerald-500/10 disabled:opacity-50"
                                            >
                                                {isUpdatingTracking ? 'Enabling...' : 'Enable Batch Tracking'}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/inventory/operations?type=IN&item=${selectedItem}`)}
                                            className="px-2 py-1 rounded border border-orange-400/40 hover:bg-orange-500/10"
                                        >
                                            Add Stock / Create Batch
                                        </button>
                                    </div>
                                )}
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
                                                            style={{ width: `${batch.quantity > 0 ? (batch.remainingQuantity / batch.quantity) * 100 : 0}%` }}
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

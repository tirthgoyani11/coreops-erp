import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PackageCheck, Plus, Search, Loader2, CheckCircle2, AlertCircle, ShoppingCart, ShieldAlert, Sparkles, Clock3, CircleDollarSign } from 'lucide-react';
import api from '../../lib/api';

interface POItem {
    id: string;
    name: string;
    quantity: number;
    receivedQuantity: number;
}

interface PO {
    id: string;
    poNumber: string;
    status: string;
    vendor: { name: string };
    items: POItem[];
}

interface GRNItem {
    id: string;
    poItem: { name: string };
    quantityReceived: number;
    quantityAccepted: number;
    quantityRejected: number;
}

interface GRN {
    id: string;
    grnNumber: string;
    purchaseOrder: { poNumber: string; vendorId: string };
    createdAt: string;
    items: GRNItem[];
}

export function GoodsReceipt() {
    const [grns, setGrns] = useState<GRN[]>([]);
    const [pendingPOs, setPendingPOs] = useState<PO[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Create Flow State
    const [isCreating, setIsCreating] = useState(false);
    const [selectedPOId, setSelectedPOId] = useState('');
    const [selectedPO, setSelectedPO] = useState<PO | null>(null);
    const [notes, setNotes] = useState('');

    // Receipt form state - keyed by poItemId
    const [receiptData, setReceiptData] = useState<Record<string, {
        quantityReceived: number,
        hasInspection: boolean,
        quantityAccepted: number,
        quantityRejected: number,
        rejectionReason: string,
        batchNumber: string
    }>>({});

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchGRNs();
        fetchPendingPOs();
    }, []);

    const fetchGRNs = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/procurement-ext/grn');
            if (res.data.success) {
                setGrns(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch GRNs', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPendingPOs = async () => {
        try {
            const res = await api.get('/purchase-orders');
            if (res.data.success) {
                const validPOs = res.data.data.filter((po: PO) =>
                    ['APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status)
                );
                setPendingPOs(validPOs);
            }
        } catch (error) {
            console.error('Failed to fetch POs', error);
        }
    };

    // When PO is selected, initialize the receipt form
    useEffect(() => {
        if (selectedPOId) {
            const po = pendingPOs.find(p => p.id === selectedPOId);
            setSelectedPO(po || null);

            if (po) {
                const initialData: typeof receiptData = {};
                po.items.forEach(item => {
                    const remaining = item.quantity - (item.receivedQuantity || 0);
                    if (remaining > 0) {
                        initialData[item.id] = {
                            quantityReceived: 0,
                            hasInspection: false,
                            quantityAccepted: 0,
                            quantityRejected: 0,
                            rejectionReason: '',
                            batchNumber: ''
                        };
                    }
                });
                setReceiptData(initialData);
            }
        } else {
            setSelectedPO(null);
            setReceiptData({});
        }
    }, [selectedPOId, pendingPOs]);

    const handleReceiptChange = (itemId: string, field: string, value: any) => {
        setReceiptData(prev => {
            const current = { ...prev[itemId], [field]: value };

            // Auto-calculate accepted if rejected changes or inspection is toggled
            if (field === 'hasInspection') {
                if (value) {
                    current.quantityAccepted = current.quantityReceived;
                    current.quantityRejected = 0;
                } else {
                    current.quantityAccepted = current.quantityReceived;
                    current.quantityRejected = 0;
                }
            } else if (field === 'quantityReceived' && !current.hasInspection) {
                current.quantityAccepted = value; // Default to full acceptance if no inspection
            } else if (field === 'quantityRejected') {
                current.quantityAccepted = Math.max(0, current.quantityReceived - value);
            } else if (field === 'quantityAccepted') {
                current.quantityRejected = Math.max(0, current.quantityReceived - value);
            }

            return { ...prev, [itemId]: current };
        });
    };

    const handleCreateGRN = async (e: React.FormEvent) => {
        e.preventDefault();

        // Filter out items with 0 received
        const itemsToSubmit = Object.entries(receiptData)
            .filter(([_, data]) => data.quantityReceived > 0)
            .map(([poItemId, data]) => ({
                poItemId,
                quantityReceived: data.quantityReceived,
                quantityAccepted: data.hasInspection ? data.quantityAccepted : data.quantityReceived,
                quantityRejected: data.hasInspection ? data.quantityRejected : 0,
                rejectionReason: data.hasInspection ? data.rejectionReason : '',
                batchNumber: data.batchNumber
            }));

        if (itemsToSubmit.length === 0) {
            alert('Please enter received quantities for at least one item.');
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await api.post('/procurement-ext/grn', {
                purchaseOrderId: selectedPOId,
                notes,
                items: itemsToSubmit
            });
            if (res.data.success) {
                setIsCreating(false);
                setSelectedPOId('');
                setNotes('');
                fetchGRNs();
                fetchPendingPOs();
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to create GRN');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredGRNs = grns.filter(grn =>
        grn.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grn.purchaseOrder.poNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pendingReceiptsCount = pendingPOs.length;
    const totalAcceptedQty = grns.reduce((sum, grn) => {
        const accepted = grn.items.reduce((inner, item) => inner + Number(item.quantityAccepted || 0), 0);
        return sum + accepted;
    }, 0);
    const qualityRejectQty = grns.reduce((sum, grn) => {
        const rejected = grn.items.reduce((inner, item) => inner + Number(item.quantityRejected || 0), 0);
        return sum + rejected;
    }, 0);

    const orchestratorSignal = pendingReceiptsCount > 6
        ? 'Receipt backlog is rising. Prioritize aged ORDERED and PARTIALLY_RECEIVED purchase orders first.'
        : qualityRejectQty > 0
            ? 'Quality rejections detected in recent GRNs. Trigger supplier corrective action workflow.'
            : 'Receiving operations are stable. Keep inspection discipline for sensitive line items.';

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <PackageCheck className="w-6 h-6 text-[var(--primary)]" />
                        Goods Receipt Notes (GRN)
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Receive items from vendors and update inventory levels.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-black rounded-lg hover:shadow-[0_0_15px_rgba(185,255,102,0.4)] transition-all font-medium"
                >
                    <Plus className="w-4 h-4" />
                    New GRN
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Pending Receipts</div>
                    <div className="text-2xl font-bold text-[var(--text-primary)] mt-2 flex items-center gap-2"><Clock3 className="w-5 h-5 text-amber-300" /> {pendingReceiptsCount}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-2">POs still awaiting full inward completion</div>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">GRNs Recorded</div>
                    <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{grns.length}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-2">Total receipts logged in this view</div>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Accepted Units</div>
                    <div className="text-2xl font-bold text-emerald-300 mt-2">{totalAcceptedQty.toLocaleString()}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-2">Inventory-ready quantity from GRN postings</div>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Rejected Units</div>
                    <div className="text-2xl font-bold text-rose-300 mt-2 flex items-center gap-2"><CircleDollarSign className="w-5 h-5" /> {qualityRejectQty.toLocaleString()}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-2">Requires quality and vendor recovery review</div>
                </div>
            </div>

            <div className="bg-[radial-gradient(circle_at_top_right,rgba(185,255,102,0.12),transparent_45%),var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Receiving Orchestrator</div>
                        <p className="text-[var(--text-primary)] mt-2">{orchestratorSignal}</p>
                    </div>
                    <Sparkles className="w-5 h-5 text-[var(--primary)]" />
                </div>
            </div>

            {isCreating && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-lg"
                >
                    <form onSubmit={handleCreateGRN} className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Receive Goods</h2>
                            <button type="button" onClick={() => { setIsCreating(false); setSelectedPOId(''); }} className="text-[var(--text-muted)] hover:text-white">
                                <AlertCircle className="w-5 h-5" /> Cancel
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Select Purchase Order *</label>
                                <select
                                    required
                                    className="w-full p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                    value={selectedPOId}
                                    onChange={e => setSelectedPOId(e.target.value)}
                                >
                                    <option value="" disabled>Select a PO to receive against</option>
                                    {pendingPOs.map(po => (
                                        <option key={po.id} value={po.id}>{po.poNumber} - {po.vendor.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Delivery Note / Waybill Ref</label>
                                <input
                                    type="text"
                                    className="w-full p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="e.g., Waybill #123456"
                                />
                            </div>
                        </div>

                        {selectedPO && (
                            <div className="space-y-4 mb-6">
                                <h3 className="font-medium text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2 flex items-center justify-between">
                                    <span>Line Items for {selectedPO.poNumber}</span>
                                    <span className="text-xs text-[var(--text-muted)] font-normal flex items-center gap-1">
                                        <ShieldAlert className="w-3 h-3" /> Toggle Inspection where needed
                                    </span>
                                </h3>

                                {Object.keys(receiptData).length === 0 ? (
                                    <div className="p-4 text-center text-emerald-400 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                        All items for this PO have already been fully received.
                                    </div>
                                ) : (
                                    Object.entries(receiptData).map(([itemId, data]) => {
                                        const poItem = selectedPO.items.find(i => i.id === itemId)!;
                                        const remaining = poItem.quantity - (poItem.receivedQuantity || 0);

                                        return (
                                            <div key={itemId} className={`bg-[var(--bg-overlay)] p-4 rounded-lg border transition-colors ${data.hasInspection ? 'border-yellow-500/50' : 'border-[var(--border-color)]'}`}>
                                                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                                                    <div className="flex-1">
                                                        <div className="font-medium text-[var(--text-primary)]">{poItem.name}</div>
                                                        <div className="text-xs text-[var(--text-muted)] mt-1">
                                                            Ordered: {poItem.quantity} | Received: {poItem.receivedQuantity || 0} | Remaining: {remaining}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                                        <div className="w-32">
                                                            <label className="text-[10px] text-[var(--text-muted)] uppercase mb-1 block">Rcvd Qty</label>
                                                            <input
                                                                type="number"
                                                                min="0" max={remaining}
                                                                placeholder="Qty"
                                                                className="w-full p-2 text-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
                                                                value={data.quantityReceived || ''}
                                                                onChange={e => handleReceiptChange(itemId, 'quantityReceived', parseInt(e.target.value) || 0)}
                                                            />
                                                        </div>
                                                        <div className="w-32">
                                                            <label className="text-[10px] text-[var(--text-muted)] uppercase mb-1 block">Batch #</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Optional"
                                                                className="w-full p-2 text-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
                                                                value={data.batchNumber}
                                                                onChange={e => handleReceiptChange(itemId, 'batchNumber', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2 pt-4">
                                                            <input
                                                                type="checkbox"
                                                                id={`inspect-${itemId}`}
                                                                checked={data.hasInspection}
                                                                onChange={e => handleReceiptChange(itemId, 'hasInspection', e.target.checked)}
                                                                className="rounded border-[var(--border-color)] text-[var(--primary)] focus:ring-[var(--primary)] bg-[var(--bg-card)]"
                                                            />
                                                            <label htmlFor={`inspect-${itemId}`} className="text-sm font-medium text-[var(--text-secondary)]">Inspect</label>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* INSECTION PANEL */}
                                                {data.hasInspection && (
                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-yellow-500/20 grid grid-cols-1 md:grid-cols-3 gap-4 bg-yellow-500/5 p-3 rounded-lg">
                                                        <div>
                                                            <label className="text-[10px] text-[var(--text-muted)] uppercase mb-1 block">Accepted (Ok)</label>
                                                            <input
                                                                type="number"
                                                                min="0" max={data.quantityReceived}
                                                                className="w-full p-2 text-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-emerald-400"
                                                                value={data.quantityAccepted || ''}
                                                                onChange={e => handleReceiptChange(itemId, 'quantityAccepted', parseInt(e.target.value) || 0)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-[var(--text-muted)] uppercase mb-1 block">Rejected (Damaged)</label>
                                                            <input
                                                                type="number"
                                                                min="0" max={data.quantityReceived}
                                                                className="w-full p-2 text-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-red-400"
                                                                value={data.quantityRejected || ''}
                                                                onChange={e => handleReceiptChange(itemId, 'quantityRejected', parseInt(e.target.value) || 0)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-[var(--text-muted)] uppercase mb-1 block">Rejection Reason</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Why rejected?"
                                                                required={data.quantityRejected > 0}
                                                                className="w-full p-2 text-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
                                                                value={data.rejectionReason}
                                                                onChange={e => handleReceiptChange(itemId, 'rejectionReason', e.target.value)}
                                                            />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                            <button type="button" onClick={() => setIsCreating(false)} className="px-5 py-2 text-[var(--text-secondary)] hover:text-white">Cancel</button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !selectedPOId || Object.keys(receiptData).length === 0}
                                className="flex items-center gap-2 px-6 py-2 bg-[var(--primary)] text-black rounded-lg font-medium shadow-[0_0_15px_rgba(185,255,102,0.2)] disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Complete GRN
                            </button>
                        </div>
                    </form>
                </motion.div>
            )}

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-overlay)]">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                        <input
                            type="text"
                            placeholder="Search GRNs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                        />
                    </div>
                </div>

                <div className="flex-1 p-4">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
                    ) : filteredGRNs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] space-y-4">
                            <PackageCheck className="w-12 h-12 opacity-30" />
                            <p>No GRNs found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredGRNs.map(grn => (
                                <div
                                    key={grn.id}
                                    className="bg-[var(--bg-overlay)] border border-[var(--border-color)] p-5 rounded-xl flex flex-col h-full"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="font-bold text-[var(--text-primary)] text-lg block">{grn.grnNumber}</span>
                                            <span className="text-xs text-[var(--text-muted)]">{new Date(grn.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                                            <ShoppingCart className="w-5 h-5" />
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4 flex-1">
                                        <div className="text-sm">
                                            <span className="text-[var(--text-muted)]">PO Reference:</span>{' '}
                                            <span className="font-mono text-[var(--primary)]">{grn.purchaseOrder.poNumber}</span>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-[var(--border-color)]">
                                        <div className="text-xs text-[var(--text-secondary)]">Items Received:</div>
                                        <div className="mt-2 space-y-1 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                                            {grn.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-sm bg-[var(--bg-card)] p-1.5 rounded border border-[var(--border-color)]">
                                                    <span className="text-[var(--text-primary)] truncate max-w-[150px]">{item.poItem?.name || 'Item'}</span>
                                                    <span className="font-mono text-[var(--primary)]">+{item.quantityAccepted}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

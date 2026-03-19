import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    RotateCcw,
    Search,
    Loader2,
    Package,
    ArrowLeft,
    Building2,
    CheckCircle2,
    Brain,
    TriangleAlert,
    Sparkles,
    CircleDollarSign,
    ClipboardCheck,
} from 'lucide-react';
import api from '../lib/api';
import { Link } from 'react-router-dom';

interface InventoryItem {
    id: string;
    name: string;
    sku: string;
    category: string;
    currentQuantity: number;
    unit: string;
    unitCost?: number;
    costPrice?: number;
    officeId: string;
    office?: { name: string };
}

interface Vendor {
    id: string;
    name: string;
    vendorCode: string;
}

interface InventoryInsights {
    source: string;
    headline: string;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendations: string[];
}

export function InventoryReturns() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [insights, setInsights] = useState<InventoryInsights | null>(null);

    // Form state
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [selectedVendor, setSelectedVendor] = useState<string>('');
    const [quantity, setQuantity] = useState<string>('');
    const [reason, setReason] = useState<string>('');

    // UI state
    const [searchTerm, setSearchTerm] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [returnCode, setReturnCode] = useState<'DAMAGED' | 'EXCESS' | 'WRONG_SPEC' | 'WARRANTY_RECALL'>('DAMAGED');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [itemsRes, vendorsRes] = await Promise.all([
                api.get('/inventory'),
                api.get('/vendors')
            ]);

            void api.get('/inventory/insights')
                .then((res) => {
                    if (res.data?.success) setInsights(res.data.data);
                })
                .catch(() => undefined);

            if (itemsRes.data.success) {
                setItems(itemsRes.data.data);
            }
            if (vendorsRes.data.success) {
                setVendors(vendorsRes.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReturn = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedItem || !selectedVendor || !quantity || !reason) return;

        const returnQty = parseInt(quantity, 10);
        if (isNaN(returnQty) || returnQty <= 0) {
            alert('Please enter a valid quantity.');
            return;
        }
        if (returnQty > selectedItem.currentQuantity) {
            alert(`Cannot return more than available stock (${selectedItem.currentQuantity}).`);
            return;
        }

        const vendorName = vendors.find(v => v.id === selectedVendor)?.name || 'Unknown Vendor';
        const formattedReason = `Return to Vendor (${vendorName}) [${returnCode}]: ${reason}`;

        try {
            setIsSubmitting(true);
            const res = await api.post(`/inventory/${selectedItem.id}/adjust`, {
                type: 'RETURN',
                quantity: returnQty,
                reason: formattedReason,
                notes: reason,
                reference: selectedVendor
            });

            if (res.data.success) {
                setSuccessMessage(`Successfully processed return of ${returnQty} units of ${selectedItem.name}.`);
                // Reset form
                setSelectedItem(null);
                setSelectedVendor('');
                setQuantity('');
                setReason('');
                // Refresh data
                fetchData();

                setTimeout(() => setSuccessMessage(''), 5000);
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to process return.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.currentQuantity > 0 &&
        (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const numericQuantity = Number.parseInt(quantity || '0', 10);
    const safeQty = Number.isFinite(numericQuantity) ? numericQuantity : 0;
    const estimatedUnitValue = selectedItem ? Number(selectedItem.unitCost || selectedItem.costPrice || 0) : 0;
    const estimatedRecovery = safeQty * estimatedUnitValue;
    const postReturnBalance = selectedItem ? Math.max(0, selectedItem.currentQuantity - safeQty) : 0;

    const returnRiskLevel = safeQty >= 50 ? 'HIGH' : safeQty >= 20 ? 'MEDIUM' : 'LOW';

    const reasonPresets = [
        'Damaged on arrival',
        'Wrong item specification',
        'Over-procured quantity',
        'Quality non-conformance',
    ];

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <RotateCcw className="w-6 h-6 text-[var(--primary)]" />
                        Return to Vendor
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Process inventory returns for defective or excess items.
                    </p>
                </div>
                <Link
                    to="/finance/exception-center?module=inventory_returns"
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--primary)] transition-colors"
                >
                    <TriangleAlert className="w-4 h-4" />
                    Return Exceptions
                </Link>
            </div>

            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)] flex items-center gap-2">
                            <Brain className="w-4 h-4 text-[var(--primary)]" />
                            Central AI Orchestrator - Returns Mission
                        </div>
                        <div className="mt-1 font-semibold text-[var(--text-primary)]">
                            {insights?.headline || 'Protect margin by prioritizing high-value returns and documenting recoverable claims.'}
                        </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full border border-[var(--border-color)] text-[var(--text-secondary)]">
                        {insights?.urgency || 'LOW'}
                    </span>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {(insights?.recommendations?.slice(0, 3) || [
                        'Attach traceable reason codes for every vendor return.',
                        'Escalate repeated defects by vendor in exception workflow.',
                        'Track recovery value versus purchase value each week.',
                    ]).map((rec) => (
                        <div key={rec} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3 flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-[var(--primary)] mt-0.5" />
                            <span className="text-[var(--text-secondary)]">{rec}</span>
                        </div>
                    ))}
                </div>
            </div>

            {successMessage && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-3 shadow-lg shadow-emerald-500/5 transition-all"
                >
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{successMessage}</span>
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Panel: Item Selection */}
                <div className="lg:col-span-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex flex-col h-[650px]">
                    <div className="p-5 border-b border-[var(--border-color)]">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">1. Select Inventory Item</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                            <input
                                type="text"
                                placeholder="Search inventory..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar p-3">
                        {isLoading ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" /></div>
                        ) : filteredItems.length === 0 ? (
                            <div className="text-center py-12 text-[var(--text-muted)]">No match found.</div>
                        ) : (
                            <div className="space-y-2.5">
                                {filteredItems.map((item, i) => (
                                    <motion.button
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.02 }}
                                        key={item.id}
                                        onClick={() => setSelectedItem(item)}
                                        className={`w-full text-left p-4 rounded-xl border transition-all ${selectedItem?.id === item.id
                                                ? 'bg-gradient-to-r from-[var(--primary)]/10 to-transparent border-[var(--primary)] shadow-sm'
                                                : 'bg-[var(--bg-overlay)] border-[var(--border-color)] hover:border-[var(--primary)]/50'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-semibold text-[var(--text-primary)]">
                                                    {item.name}
                                                </div>
                                                <div className="text-xs text-[var(--text-secondary)] mt-1.5 flex flex-wrap gap-2">
                                                    <span className="bg-[var(--bg-card)] px-1.5 rounded text-[var(--primary)]">{item.sku}</span>
                                                    <span>{item.category}</span>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <div className="font-mono text-lg leading-none font-bold text-[var(--text-primary)]">{item.currentQuantity}</div>
                                                <div className="text-[10px] text-[var(--text-muted)] mt-1 tracking-wider uppercase">{item.unit}</div>
                                            </div>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Return Details */}
                <div className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex flex-col h-[650px] relative overflow-hidden">
                    <div className="p-5 border-b border-[var(--border-color)] bg-[var(--bg-overlay)]">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">2. Return Details</h2>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar p-6">
                        {!selectedItem ? (
                            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] text-center p-8">
                                <div className="w-20 h-20 rounded-full bg-[var(--bg-overlay)] flex items-center justify-center mb-6">
                                    <Package className="w-10 h-10 opacity-40" />
                                </div>
                                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No Item Selected</h3>
                                <p className="max-w-md">Select an inventory item from the list to initiate a return to the supplier.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleReturn} className="space-y-6">
                                {/* Selected Item Summary */}
                                <div className="flex gap-4 items-start p-4 bg-[var(--bg-overlay)] rounded-xl border border-[var(--border-color)]">
                                    <div className="w-12 h-12 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0">
                                        <Package className="w-6 h-6 text-[var(--primary)]" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg text-[var(--text-primary)]">{selectedItem.name}</h3>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-sm font-medium text-[var(--text-secondary)]">SKU: {selectedItem.sku}</span>
                                            <span className="text-sm px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-medium">
                                                Available: {selectedItem.currentQuantity} {selectedItem.unit}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                            Return To Vendor <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                            <select
                                                required
                                                value={selectedVendor}
                                                onChange={(e) => setSelectedVendor(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-colors appearance-none"
                                            >
                                                <option value="" disabled>Select a supplier/vendor...</option>
                                                {vendors.map(vendor => (
                                                    <option key={vendor.id} value={vendor.id}>{vendor.name} ({vendor.vendorCode})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                            Quantity to Return <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="number"
                                                min="1"
                                                max={selectedItem.currentQuantity}
                                                value={quantity}
                                                onChange={(e) => setQuantity(e.target.value)}
                                                className="w-full p-3 pr-16 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] text-lg font-mono"
                                                placeholder="0"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-medium">
                                                {selectedItem.unit}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                            Return Code
                                        </label>
                                        <select
                                            value={returnCode}
                                            onChange={(e) => setReturnCode(e.target.value as 'DAMAGED' | 'EXCESS' | 'WRONG_SPEC' | 'WARRANTY_RECALL')}
                                            className="w-full p-3 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                        >
                                            <option value="DAMAGED">Damaged</option>
                                            <option value="EXCESS">Excess Stock</option>
                                            <option value="WRONG_SPEC">Wrong Specification</option>
                                            <option value="WARRANTY_RECALL">Warranty Recall</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                            Reason for Return <span className="text-red-400">*</span>
                                        </label>
                                        <div className="mb-2 flex flex-wrap gap-2">
                                            {reasonPresets.map((preset) => (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    onClick={() => setReason(preset)}
                                                    className="px-2.5 py-1 text-xs rounded-full border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--primary)]"
                                                >
                                                    {preset}
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            required
                                            rows={4}
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            className="w-full p-4 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] resize-none"
                                            placeholder="Example: Defective batch, overstock, wrong item received..."
                                        />
                                    </div>

                                    <div className="md:col-span-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-overlay)] p-4">
                                        <div className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-3">
                                            <ClipboardCheck className="w-4 h-4 text-[var(--primary)]" />
                                            Return Decision Engine
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                            <div className="rounded-lg border border-[var(--border-color)] p-3">
                                                <div className="text-[var(--text-secondary)]">Estimated Recovery</div>
                                                <div className="mt-1 font-bold text-[var(--text-primary)] flex items-center gap-1">
                                                    <CircleDollarSign className="w-4 h-4 text-emerald-400" />
                                                    ₹ {estimatedRecovery.toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-[var(--border-color)] p-3">
                                                <div className="text-[var(--text-secondary)]">Post-Return Balance</div>
                                                <div className="mt-1 font-bold text-[var(--text-primary)]">
                                                    {postReturnBalance} {selectedItem.unit}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-[var(--border-color)] p-3">
                                                <div className="text-[var(--text-secondary)]">Workflow Risk</div>
                                                <div className={`mt-1 inline-flex px-2 py-1 text-xs rounded-full border ${returnRiskLevel === 'HIGH' ? 'text-red-300 border-red-500/40 bg-red-500/10' : returnRiskLevel === 'MEDIUM' ? 'text-yellow-300 border-yellow-500/40 bg-yellow-500/10' : 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'}`}>
                                                    {returnRiskLevel}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 mt-4 border-t border-[var(--border-color)] flex justify-between items-center">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedItem(null)}
                                        className="flex items-center gap-2 px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Go Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !selectedVendor || !quantity || !reason || parseInt(quantity, 10) > selectedItem.currentQuantity}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-black rounded-xl hover:shadow-[0_0_15px_rgba(185,255,102,0.4)] transition-all font-bold disabled:opacity-50 disabled:hover:shadow-none"
                                    >
                                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
                                        Process Return
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

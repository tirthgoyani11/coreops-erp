import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart, Plus, X, Loader2, Check, XCircle,
    Clock, Truck, FileText, ChevronRight
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';

interface PurchaseOrder {
    _id: string;
    poNumber: string;
    vendor: { _id: string; name: string; vendorCode: string };
    items: Array<{ name: string; quantity: number; unitPrice: number }>;
    subtotal: number;
    totalAmount: number;
    status: string;
    orderDate: string;
    expectedDeliveryDate?: string;
    approval?: { status: string; approvedBy?: { name: string } };
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
    'DRAFT': { color: 'text-zinc-600 dark:text-zinc-400', bg: 'bg-zinc-500/10 dark:bg-zinc-500/20', icon: FileText },
    'PENDING_APPROVAL': { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 dark:bg-amber-500/20', icon: Clock },
    'APPROVED': { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 dark:bg-blue-500/20', icon: Check },
    'REJECTED': { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 dark:bg-red-500/20', icon: XCircle },
    'RECEIVED': { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', icon: Truck },
    'PARTIALLY_RECEIVED': { color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10 dark:bg-cyan-500/20', icon: Truck },
    'CANCELLED': { color: 'text-zinc-600 dark:text-zinc-500', bg: 'bg-zinc-500/10 dark:bg-zinc-500/20', icon: XCircle },
};

export function PurchaseOrders() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [vendors, setVendors] = useState<Array<{ _id: string; name: string; vendorCode: string }>>([]);
    const [statusFilter, setStatusFilter] = useState('');

    const [formData, setFormData] = useState({
        vendor: '',
        items: [{ name: '', quantity: '1', unitPrice: '' }],
        notes: ''
    });

    useEffect(() => {
        fetchOrders();
        fetchVendors();
    }, [statusFilter]);

    const fetchOrders = async () => {
        try {
            const params: any = {};
            if (statusFilter) params.status = statusFilter;
            const res = await api.get('/purchase-orders', { params });
            setOrders(res.data.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVendors = async () => {
        try {
            const res = await api.get('/vendors', { params: { limit: 100 } });
            setVendors(res.data.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const payload = {
                vendorId: formData.vendor,
                items: formData.items.map(item => ({
                    itemType: 'product', // Default item type
                    name: item.name,
                    quantity: parseInt(item.quantity) || 1,
                    unitPrice: parseFloat(item.unitPrice) || 0
                })),
                totalAmount: formData.items.reduce((sum, item) =>
                    sum + (parseInt(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0), 0),
                notes: formData.notes
            };
            await api.post('/purchase-orders', payload);
            setShowModal(false);
            setFormData({ vendor: '', items: [{ name: '', quantity: '1', unitPrice: '' }], notes: '' });
            fetchOrders();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to create PO');
        } finally {
            setFormLoading(false);
        }
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { name: '', quantity: '1', unitPrice: '' }]
        });
    };

    const removeItem = (index: number) => {
        if (formData.items.length > 1) {
            setFormData({
                ...formData,
                items: formData.items.filter((_, i) => i !== index)
            });
        }
    };

    const updateItem = (index: number, field: string, value: any) => {
        const items = [...formData.items];
        (items[index] as any)[field] = value;
        setFormData({ ...formData, items });
    };

    const submitForApproval = async (id: string) => {
        try {
            await api.put(`/purchase-orders/${id}`, { status: 'PENDING_APPROVAL' });
            fetchOrders();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to submit');
        }
    };

    const byStatus = {
        pending: orders.filter(o => o.status === 'PENDING_APPROVAL').length,
        approved: orders.filter(o => o.status === 'APPROVED').length,
        received: orders.filter(o => ['RECEIVED', 'PARTIALLY_RECEIVED'].includes(o.status)).length,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl">
                    <p className="text-[var(--text-secondary)] font-medium mb-1">Total Orders</p>
                    <h2 className="text-3xl font-bold text-[var(--text-primary)]">{orders.length}</h2>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl">
                    <p className="text-[var(--text-secondary)] font-medium mb-1">Pending Approval</p>
                    <h2 className="text-3xl font-bold text-amber-600 dark:text-amber-400">{byStatus.pending}</h2>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl">
                    <p className="text-[var(--text-secondary)] font-medium mb-1">Received</p>
                    <h2 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{byStatus.received}</h2>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="bg-[var(--primary)] text-black rounded-3xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-[var(--primary)]/90 transition-colors active:scale-95"
                >
                    <Plus className="w-8 h-8 p-1.5 bg-black/10 rounded-full" />
                    <span className="font-bold">New Order</span>
                </button>
            </div>

            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
                {['', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'RECEIVED'].map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${statusFilter === status
                            ? 'bg-[var(--primary)] text-black'
                            : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                            }`}
                    >
                        {status || 'All'}
                    </button>
                ))}
            </div>

            {/* Orders List */}
            <div>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)]">
                    <div className="w-1.5 h-6 bg-[var(--primary)] rounded-full shadow-[0_0_10px_var(--primary)]" />
                    Purchase Orders ({orders.length})
                </h3>

                {orders.length === 0 ? (
                    <div className="text-center py-20 bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-color)]">
                        <ShoppingCart className="w-12 h-12 mx-auto text-[var(--text-secondary)] mb-4 opacity-50" />
                        <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">No Purchase Orders</h3>
                        <p className="text-[var(--text-secondary)]">Create your first purchase order above.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order, i) => {
                            const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.DRAFT;
                            const StatusIcon = config.icon;

                            return (
                                <motion.div
                                    key={order._id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl hover:border-[var(--primary)]/30 transition-all group cursor-pointer"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
                                                <StatusIcon className={`w-5 h-5 ${config.color}`} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                                                    {order.poNumber}
                                                </h4>
                                                <p className="text-sm text-[var(--text-secondary)]">
                                                    {(order as any).vendorId?.name || order.vendor?.name || 'Unknown Vendor'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="font-bold text-[var(--text-primary)]">{formatCurrency(order.totalAmount)}</p>
                                                <p className="text-xs text-[var(--text-secondary)]">
                                                    {order.items?.length || 0} items
                                                </p>
                                            </div>

                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.color}`}>
                                                {order.status.replace(/_/g, ' ')}
                                            </span>

                                            {order.status === 'DRAFT' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); submitForApproval(order._id); }}
                                                    className="px-4 py-2 bg-[var(--primary)] text-black text-sm font-bold rounded-xl hover:opacity-90"
                                                >
                                                    Submit
                                                </button>
                                            )}

                                            <ChevronRight className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors" />
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create PO Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[var(--bg-card)] border border-[var(--border-color)] p-8 rounded-3xl w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-[var(--bg-overlay)] text-[var(--text-secondary)]">
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-2xl font-bold mb-6">New Purchase Order</h2>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Vendor</label>
                                    <select
                                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                        value={formData.vendor}
                                        onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Vendor</option>
                                        {vendors.map(v => (
                                            <option key={v._id} value={v._id}>{v.name} ({v.vendorCode})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Items</label>
                                        <button type="button" onClick={addItem} className="text-[var(--primary)] text-sm font-medium hover:underline">
                                            + Add Item
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {formData.items.map((item, index) => (
                                            <div key={index} className="flex gap-3 items-start">
                                                <input
                                                    type="text"
                                                    placeholder="Item name"
                                                    className="flex-1 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                                    value={item.name}
                                                    onChange={e => updateItem(index, 'name', e.target.value)}
                                                    required
                                                />
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder="Qty"
                                                    className="w-20 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                                    value={item.quantity}
                                                    onChange={e => {
                                                        if (e.target.value === '' || /^\d*$/.test(e.target.value)) {
                                                            updateItem(index, 'quantity', e.target.value);
                                                        }
                                                    }}
                                                    required
                                                />
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder="Price"
                                                    className="w-28 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                                    value={item.unitPrice}
                                                    onChange={e => {
                                                        if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                                                            updateItem(index, 'unitPrice', e.target.value);
                                                        }
                                                    }}
                                                    required
                                                />
                                                {formData.items.length > 1 && (
                                                    <button type="button" onClick={() => removeItem(index)} className="p-3 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-xl">
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <p className="text-right mt-3 text-lg font-bold text-[var(--text-primary)]">
                                        Total: {formatCurrency(formData.items.reduce((sum, i) => sum + ((parseInt(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0)), 0))}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Notes</label>
                                    <textarea
                                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] resize-none"
                                        rows={3}
                                        placeholder="Optional notes..."
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="w-full bg-[var(--primary)] text-black font-bold py-4 rounded-xl hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Draft Order'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { ShoppingCart, Package } from 'lucide-react';
import api from '../../lib/api';

interface SalesOrder {
    id: string;
    orderNumber: string;
    customer: { name: string };
    totalAmount: number;
    status: string;
    createdAt: string;
}

export function SalesOrders() {
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await api.get('/sales-orders');
                setOrders(res.data.data || []);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const fulfillOrder = async (id: string, currentStatus: string) => {
        if (currentStatus === 'DELIVERED') return alert("Order is already delivered.");
        try {
            await api.post(`/sales-orders/${id}/fulfill`);
            alert("Order fulfilled! Inventory deducted, and AR Invoice generated.");
            const res = await api.get('/sales-orders');
            setOrders(res.data.data || []);
        } catch (error: any) {
            alert(`Error: ${error.response?.data?.message}`);
        }
    };

    if (loading) return <div className="h-96 animate-pulse bg-[var(--bg-card)] rounded-3xl" />;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                <ShoppingCart className="w-6 h-6 text-[var(--primary)]" />
                Sales Orders
            </h2>
            
            <div className="overflow-x-auto rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[var(--border-color)] bg-[var(--bg-overlay)] text-[var(--text-secondary)]">
                            <th className="p-4 font-medium pl-6">Order No</th>
                            <th className="p-4 font-medium">Customer</th>
                            <th className="p-4 font-medium">Date</th>
                            <th className="p-4 font-medium">Total</th>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium text-right pr-6">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-[var(--text-secondary)]">No orders found.</td></tr>
                        )}
                        {orders.map((order) => (
                            <tr key={order.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-overlay)] transition-colors">
                                <td className="p-4 pl-6 font-mono text-sm">{order.orderNumber}</td>
                                <td className="p-4 font-bold">{order.customer?.name}</td>
                                <td className="p-4 text-sm text-[var(--text-secondary)]">{new Date(order.createdAt).toLocaleDateString()}</td>
                                <td className="p-4 font-mono font-medium">${order.totalAmount}</td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 text-xs rounded-full ${order.status === 'DELIVERED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="p-4 pr-6 text-right">
                                    <button
                                        onClick={() => fulfillOrder(order.id, order.status)}
                                        disabled={order.status === 'DELIVERED'}
                                        className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-[var(--bg-overlay)] hover:bg-[var(--primary)] hover:text-black transition-colors disabled:opacity-50"
                                    >
                                        <Package className="w-3 h-3" />
                                        Fulfill
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

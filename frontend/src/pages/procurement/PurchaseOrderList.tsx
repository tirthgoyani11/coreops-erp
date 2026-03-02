import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    Plus,
    FileText,
    Calendar,
} from 'lucide-react';

export function PurchaseOrderList() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        fetchOrders();
    }, [statusFilter]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
            const res = await api.get(`/purchase-orders${query}`);
            setOrders(res.data.data);
        } catch (error) {
            console.error('Failed to fetch POs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: any = {
            DRAFT: 'bg-gray-100 text-gray-700',
            PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
            APPROVED: 'bg-purple-100 text-purple-700',
            ORDERED: 'bg-blue-100 text-blue-700',
            PARTIALLY_RECEIVED: 'bg-orange-100 text-orange-700',
            RECEIVED: 'bg-green-100 text-green-700',
            CANCELLED: 'bg-red-100 text-red-700'
        };
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{status.replace(/_/g, ' ')}</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Purchase Orders</h1>
                    <p className="text-sm text-gray-500">Track and manage procurement orders</p>
                </div>
                <Button onClick={() => navigate('/procurement/orders/new')}>
                    <Plus className="w-4 h-4 mr-2" /> Create PO
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 text-sm">
                {['ALL', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-full transition-colors border ${statusFilter === status
                            ? 'bg-[var(--primary)] text-black border-[var(--primary)] shadow-[0_0_10px_var(--primary-glow)] font-semibold'
                            : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]'
                            }`}
                    >
                        {status.replace(/_/g, ' ')}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="grid gap-4">
                {orders.map((po: any) => (
                    <Card key={po.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/procurement/orders/${po.id}`)}>
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-[var(--primary)]/10 rounded-lg">
                                    <FileText className="w-6 h-6 text-emerald-600 dark:text-[var(--primary)]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        {po.poNumber}
                                        {getStatusBadge(po.status)}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">{po.vendor?.name || 'Unknown Vendor'}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(po.createdAt).toLocaleDateString()}
                                        </div>
                                        <div>Created by {po.requestedBy?.name}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Total Amount</p>
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                        ₹{po.totalAmount?.toLocaleString()}
                                    </h4>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}

                {orders.length === 0 && !loading && (
                    <div className="text-center py-12 text-gray-500">
                        No purchase orders found.
                    </div>
                )}
            </div>
        </div>
    );
}

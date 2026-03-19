import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    Plus,
    FileText,
    Calendar,
    Search,
    AlertTriangle,
    Clock3,
    CircleDollarSign,
    Package,
    Sparkles,
} from 'lucide-react';

type POStatus =
    | 'DRAFT'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'ORDERED'
    | 'PARTIALLY_RECEIVED'
    | 'RECEIVED'
    | 'CANCELLED';

interface PurchaseOrder {
    id: string;
    poNumber: string;
    status: POStatus;
    createdAt: string;
    expectedDeliveryDate?: string | null;
    totalAmount?: number;
    vendor?: { name?: string | null };
    requestedBy?: { name?: string | null };
    items?: Array<{
        id: string;
        quantity: number;
        receivedQuantity?: number;
    }>;
}

const STATUS_OPTIONS: Array<POStatus | 'ALL'> = [
    'ALL',
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'ORDERED',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
    'CANCELLED'
];

const statusClasses: Record<POStatus, string> = {
    DRAFT: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
    PENDING_APPROVAL: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    APPROVED: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    ORDERED: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    PARTIALLY_RECEIVED: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
    RECEIVED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    CANCELLED: 'bg-rose-500/10 text-rose-300 border-rose-500/20'
};

const formatCurrency = (amount?: number) => `₹${Number(amount || 0).toLocaleString()}`;

export function PurchaseOrderList() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<POStatus | 'ALL'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

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
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${(statusClasses as any)[status] || 'bg-slate-500/10 text-slate-300 border-slate-500/20'}`}>
                {status.replace(/_/g, ' ')}
            </span>
        );
    };

    const searchedOrders = orders.filter((po) => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return true;
        return (
            po.poNumber?.toLowerCase().includes(q) ||
            po.vendor?.name?.toLowerCase().includes(q) ||
            po.requestedBy?.name?.toLowerCase().includes(q)
        );
    });

    const allOrders = orders.length;
    const pendingApprovals = orders.filter((po) => po.status === 'PENDING_APPROVAL').length;
    const inReceiving = orders.filter((po) => po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED').length;
    const totalOpenValue = orders
        .filter((po) => ['PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status))
        .reduce((sum, po) => sum + Number(po.totalAmount || 0), 0);

    const atRisk = orders.filter((po) => {
        if (!po.expectedDeliveryDate) return false;
        const date = new Date(po.expectedDeliveryDate);
        if (Number.isNaN(date.getTime())) return false;
        const now = new Date();
        const ageMs = now.getTime() - date.getTime();
        const overdue = ageMs > 0;
        const active = ['APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status);
        return overdue && active;
    });

    const aiSignal = pendingApprovals > 3
        ? 'Approval queue is building up. Prioritize high-value pending POs first.'
        : atRisk.length > 0
            ? 'Some active POs are overdue against expected delivery. Trigger vendor follow-ups.'
            : 'Procurement flow is healthy. Focus on reducing draft aging and cycle time.';

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Purchase Command Center</h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Track approvals, dispatch, and receipt progression from one control surface.</p>
                </div>
                <Button onClick={() => navigate('/procurement/orders/new')} className="bg-[var(--primary)] text-black hover:shadow-[0_0_15px_rgba(185,255,102,0.4)]">
                    <Plus className="w-4 h-4 mr-2" /> Create PO
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="p-5 border-[var(--border-color)] bg-[var(--bg-card)]">
                    <div className="text-[var(--text-muted)] text-xs uppercase tracking-[0.2em]">Orders Visible</div>
                    <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{allOrders}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-2">Current filter: {statusFilter.replace(/_/g, ' ')}</div>
                </Card>
                <Card className="p-5 border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.2em] text-amber-300">Pending Approval</span>
                        <Clock3 className="w-4 h-4 text-amber-300" />
                    </div>
                    <div className="text-2xl font-bold text-amber-200 mt-2">{pendingApprovals}</div>
                    <div className="text-xs text-amber-300/80 mt-2">Escalate if queue exceeds policy threshold</div>
                </Card>
                <Card className="p-5 border-blue-500/20 bg-blue-500/5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.2em] text-blue-300">In Receiving Flow</span>
                        <Package className="w-4 h-4 text-blue-300" />
                    </div>
                    <div className="text-2xl font-bold text-blue-200 mt-2">{inReceiving}</div>
                    <div className="text-xs text-blue-300/80 mt-2">Active orders requiring delivery tracking</div>
                </Card>
                <Card className="p-5 border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.2em] text-emerald-300">Open Value</span>
                        <CircleDollarSign className="w-4 h-4 text-emerald-300" />
                    </div>
                    <div className="text-2xl font-bold text-emerald-200 mt-2">{formatCurrency(totalOpenValue)}</div>
                    <div className="text-xs text-emerald-300/80 mt-2">Committed spend not yet closed</div>
                </Card>
            </div>

            <Card className="p-5 border-[var(--border-color)] bg-[radial-gradient(circle_at_top_right,rgba(185,255,102,0.12),transparent_45%),var(--bg-card)]">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">Procurement Orchestrator</div>
                        <p className="text-[var(--text-primary)] leading-relaxed">{aiSignal}</p>
                    </div>
                    <Sparkles className="w-5 h-5 text-[var(--primary)] shrink-0 mt-1" />
                </div>
                {atRisk.length > 0 && (
                    <div className="mt-4 p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 text-sm text-rose-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {atRisk.length} order(s) appear overdue against expected delivery.
                    </div>
                )}
            </Card>

            <div className="space-y-4">
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                    <div className="relative w-full lg:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by PO number, vendor, or requester"
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                        {STATUS_OPTIONS.map((status) => (
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
                </div>

                <div className="grid gap-4">
                    {searchedOrders.map((po) => (
                        <Card key={po.id} className="p-5 hover:border-[var(--primary)] transition-colors cursor-pointer" onClick={() => navigate(`/procurement/orders/${po.id}`)}>
                            <div className="flex flex-col xl:flex-row justify-between gap-4">
                                <div className="flex items-start gap-4 min-w-0">
                                    <div className="p-3 bg-[var(--primary)]/10 rounded-lg shrink-0">
                                        <FileText className="w-6 h-6 text-[var(--primary)]" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-[var(--text-primary)] flex flex-wrap items-center gap-2">
                                            <span className="truncate">{po.poNumber}</span>
                                            {getStatusBadge(po.status)}
                                        </h3>
                                        <p className="text-sm text-[var(--text-secondary)] mt-1 truncate">{po.vendor?.name || 'Unknown Vendor'}</p>
                                        <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(po.createdAt).toLocaleDateString()}
                                            </div>
                                            <div>Created by {po.requestedBy?.name || 'System'}</div>
                                            {po.expectedDeliveryDate && (
                                                <div>
                                                    ETA: {new Date(po.expectedDeliveryDate).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-xs text-[var(--text-muted)]">Total Amount</p>
                                        <h4 className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(po.totalAmount)}</h4>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}

                    {searchedOrders.length === 0 && !loading && (
                        <div className="text-center py-12 text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
                            No purchase orders matched your criteria.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

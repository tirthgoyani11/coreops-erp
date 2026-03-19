import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Clock,
    Package,
    Edit,
    Loader2,
    AlertTriangle,
    Sparkles,
    Brain,
    ShieldAlert,
    Ban,
    Undo2,
    CheckCircle2,
    Building2,
    Calendar,
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface Vendor {
    id: string;
    name: string;
    vendorCode: string;
    email?: string;
    phone?: string;
    address?: string;
    contactPerson?: string;
    isActive: boolean;
    isBlacklisted: boolean;
    reliabilityMetrics?: {
        overallScore?: number;
        deliveryScore?: number;
        fulfillmentScore?: number;
        totalOrdersValuated?: number;
    };
    purchaseOrders?: PurchaseOrder[];
}

interface PurchaseOrder {
    id: string;
    poNumber: string;
    status: string;
    createdAt: string;
    totalAmount?: number;
    expectedDeliveryDate?: string | null;
    deliveryDate?: string | null;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

export function VendorDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionBusy, setActionBusy] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!id) {
                setLoading(false);
                setError('Vendor ID is missing.');
                return;
            }

            try {
                setLoading(true);
                const [vendorRes, poRes] = await Promise.all([
                    api.get<ApiResponse<Vendor>>(`/vendors/${id}`),
                    api.get<ApiResponse<PurchaseOrder[]>>(`/purchase-orders?vendorId=${id}&limit=50`),
                ]);

                setVendor(vendorRes.data.data);
                setOrders(poRes.data.data || []);
                setError('');
            } catch (err) {
                console.error('Error fetching vendor details:', err);
                setError('Unable to load vendor details right now.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const orderStats = useMemo(() => {
        const totalOrders = orders.length;
        const completedOrders = orders.filter((po) => po.status === 'RECEIVED').length;
        const totalSpend = orders.reduce((sum, po) => sum + Number(po.totalAmount || 0), 0);

        const onTimeEvaluated = orders.filter((po) => po.expectedDeliveryDate && po.deliveryDate);
        const onTimeDelivered = onTimeEvaluated.filter((po) => {
            if (!po.expectedDeliveryDate || !po.deliveryDate) return false;
            return new Date(po.deliveryDate) <= new Date(po.expectedDeliveryDate);
        }).length;

        const onTimeRate = onTimeEvaluated.length > 0
            ? Math.round((onTimeDelivered / onTimeEvaluated.length) * 100)
            : (vendor?.reliabilityMetrics?.deliveryScore || 0);

        return {
            totalOrders,
            completedOrders,
            totalSpend,
            onTimeRate,
        };
    }, [orders, vendor?.reliabilityMetrics?.deliveryScore]);

    const trendData = useMemo(() => {
        const monthlyMap = new Map<string, { month: string; value: number }>();

        orders.forEach((po) => {
            const d = new Date(po.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const month = d.toLocaleString('en-IN', { month: 'short' });
            const existing = monthlyMap.get(key);
            const value = Number(po.totalAmount || 0);

            if (existing) {
                existing.value += value;
            } else {
                monthlyMap.set(key, { month, value });
            }
        });

        return Array.from(monthlyMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-6)
            .map(([, row]) => row);
    }, [orders]);

    const reliability = vendor?.reliabilityMetrics?.overallScore || 0;
    const delivery = vendor?.reliabilityMetrics?.deliveryScore || 0;
    const fulfillment = vendor?.reliabilityMetrics?.fulfillmentScore || 0;
    const riskLevel = reliability < 60 ? 'HIGH' : reliability < 75 ? 'MEDIUM' : 'LOW';

    const orchestratorHeadline = vendor
        ? riskLevel === 'HIGH'
            ? `${vendor.name} is high-risk for sourcing. Review open orders and trigger corrective action.`
            : riskLevel === 'MEDIUM'
                ? `${vendor.name} is trending moderate risk. Tighten SLA monitoring and delivery follow-ups.`
                : `${vendor.name} is currently stable. Keep strategic allocation and periodic score review.`
        : '';

    const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

    const performBlacklist = async () => {
        if (!vendor) return;

        try {
            setActionBusy(true);
            await api.delete(`/vendors/${vendor.id}`);
            setVendor({ ...vendor, isActive: false, isBlacklisted: true });
            setMessage('Vendor blacklisted successfully.');
            window.setTimeout(() => setMessage(''), 4000);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to blacklist vendor.');
        } finally {
            setActionBusy(false);
        }
    };

    const performRestore = async () => {
        if (!vendor) return;

        try {
            setActionBusy(true);
            await api.put(`/vendors/${vendor.id}`, { isBlacklisted: false, isActive: true });
            setVendor({ ...vendor, isActive: true, isBlacklisted: false });
            setMessage('Vendor restored successfully.');
            window.setTimeout(() => setMessage(''), 4000);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to restore vendor.');
        } finally {
            setActionBusy(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[55vh] grid place-items-center">
                <div className="inline-flex items-center gap-3 text-[var(--text-secondary)]">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--primary)]" />
                    Loading vendor cockpit...
                </div>
            </div>
        );
    }

    if (!vendor) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" className="pl-0" onClick={() => navigate('/vendors')}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Vendors
                </Button>
                <Card className="p-8 text-center">
                    <AlertTriangle className="w-8 h-8 mx-auto text-red-300 mb-3" />
                    <p className="text-[var(--text-secondary)]">Vendor not found.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Button variant="ghost" className="pl-0" onClick={() => navigate('/vendors')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Vendors
            </Button>

            {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> {error}
                </div>
            )}
            {message && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {message}
                </div>
            )}

            <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-[var(--bg-overlay)] border border-[var(--border-color)] flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-[var(--primary)]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)]">{vendor.name}</h1>
                        <div className="flex items-center gap-2 mt-1 text-sm">
                            <span className="bg-[var(--bg-overlay)] px-2 py-0.5 rounded border border-[var(--border-color)] font-mono text-[var(--text-secondary)]">{vendor.vendorCode}</span>
                            <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${vendor.isBlacklisted ? 'text-red-300 border-red-500/30 bg-red-500/10' : vendor.isActive ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : 'text-gray-300 border-gray-500/30 bg-gray-500/10'}`}>
                                {vendor.isBlacklisted ? 'Blacklisted' : vendor.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate(`/vendors/${vendor.id}/edit`)}>
                        <Edit className="w-4 h-4 mr-2" /> Edit Vendor
                    </Button>
                    {vendor.isBlacklisted ? (
                        <Button variant="outline" disabled={actionBusy} onClick={performRestore}>
                            {actionBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Undo2 className="w-4 h-4 mr-2" />}
                            Restore
                        </Button>
                    ) : (
                        <Button variant="destructive" disabled={actionBusy} onClick={performBlacklist}>
                            {actionBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Ban className="w-4 h-4 mr-2" />}
                            Blacklist
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => navigate(`/finance/exception-center?module=vendor&ref=${vendor.id}`)}>
                        <ShieldAlert className="w-4 h-4 mr-2" /> Exception Center
                    </Button>
                </div>
            </div>

            <Card className={`p-5 ${riskLevel === 'HIGH' ? 'border-red-500/40 bg-red-500/10' : riskLevel === 'MEDIUM' ? 'border-yellow-500/40 bg-yellow-500/10' : 'border-emerald-500/40 bg-emerald-500/10'}`}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-xs uppercase tracking-wide flex items-center gap-2">
                            <Brain className="w-4 h-4" /> Central AI Orchestrator - Supplier Brief
                        </div>
                        <div className="mt-2 font-semibold">{orchestratorHeadline}</div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full border border-current/30">{riskLevel}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm">
                    <div className="rounded-lg border border-current/20 bg-black/10 p-3 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 mt-0.5" />
                        Reliability: {reliability}% with delivery at {delivery}%.
                    </div>
                    <div className="rounded-lg border border-current/20 bg-black/10 p-3 flex items-start gap-2">
                        <Clock className="w-4 h-4 mt-0.5" />
                        On-time performance monitored across {vendor.reliabilityMetrics?.totalOrdersValuated || 0} evaluated PO(s).
                    </div>
                    <div className="rounded-lg border border-current/20 bg-black/10 p-3 flex items-start gap-2">
                        <Package className="w-4 h-4 mt-0.5" />
                        Total managed spend: {currency.format(orderStats.totalSpend)}.
                    </div>
                </div>
            </Card>

            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                <Card className="p-4">
                    <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Reliability</div>
                    <div className={`mt-1 text-2xl font-bold ${reliability >= 80 ? 'text-emerald-300' : reliability >= 65 ? 'text-yellow-300' : 'text-red-300'}`}>{reliability}%</div>
                </Card>
                <Card className="p-4">
                    <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">On-Time Delivery</div>
                    <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{orderStats.onTimeRate}%</div>
                </Card>
                <Card className="p-4">
                    <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Fulfillment</div>
                    <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{fulfillment}%</div>
                </Card>
                <Card className="p-4">
                    <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Total Orders</div>
                    <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{orderStats.totalOrders}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Total Spend</div>
                    <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{currency.format(orderStats.totalSpend)}</div>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="p-6 space-y-4 lg:col-span-1">
                    <h3 className="font-semibold text-lg">Contact Information</h3>
                    <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                        <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4" />
                            <a href={vendor.email ? `mailto:${vendor.email}` : '#'} className="text-[var(--primary)] hover:underline">
                                {vendor.email || 'N/A'}
                            </a>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4" />
                            <span>{vendor.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4" />
                            <span>Contact: {vendor.contactPerson || 'N/A'}</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 mt-1" />
                            <span className="whitespace-pre-wrap">{vendor.address || 'N/A'}</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Performance Trend (Spend by Month)</h3>
                        <span className="text-xs text-[var(--text-secondary)]">Last 6 months</span>
                    </div>
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `₹${Math.round(Number(v) / 1000)}k`} />
                                <Tooltip formatter={(value) => [currency.format(Number(value || 0)), 'Spend']} />
                                <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    {trendData.length === 0 && (
                        <p className="text-sm text-[var(--text-secondary)]">No trend data yet. Create purchase orders to build supplier trend intelligence.</p>
                    )}
                </Card>
            </div>

            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Purchase Order History</h3>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/procurement/orders?vendorId=${vendor.id}`)}>View All</Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                            <tr>
                                <th className="text-left pb-3 pl-4">PO Number</th>
                                <th className="text-left pb-3">Date</th>
                                <th className="text-left pb-3">Status</th>
                                <th className="text-right pb-3">Amount</th>
                                <th className="text-right pb-3 pr-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {orders.slice(0, 12).map((po) => (
                                <tr key={po.id} className="hover:bg-[var(--bg-overlay)] transition-colors">
                                    <td className="py-3 pl-4 font-medium text-[var(--primary)]">{po.poNumber}</td>
                                    <td className="py-3 text-[var(--text-secondary)]">{new Date(po.createdAt).toLocaleDateString()}</td>
                                    <td className="py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${po.status === 'RECEIVED' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : po.status === 'ORDERED' ? 'text-blue-300 border-blue-500/30 bg-blue-500/10' : po.status === 'PARTIALLY_RECEIVED' ? 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10' : 'text-[var(--text-secondary)] border-[var(--border-color)] bg-[var(--bg-overlay)]'}`}>
                                            {po.status}
                                        </span>
                                    </td>
                                    <td className="py-3 text-right font-medium text-[var(--text-primary)]">{currency.format(Number(po.totalAmount || 0))}</td>
                                    <td className="py-3 pr-4 text-right">
                                        <Button size="sm" variant="ghost" onClick={() => navigate(`/procurement/orders/${po.id}`)}>
                                            Open
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {orders.length === 0 && <p className="text-center py-6 text-[var(--text-secondary)]">No purchase orders found.</p>}
                </div>
            </Card>
        </div>
    );
}

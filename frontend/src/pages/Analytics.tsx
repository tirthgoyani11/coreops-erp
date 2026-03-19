import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Activity,
    ArrowRight,
    BarChart3,
    CircleAlert,
    HandCoins,
    Loader2,
    ShieldAlert,
    TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { useAuthStore } from '../stores/authStore';

interface DashboardStats {
    assets?: {
        total?: number;
        active?: number;
        totalValue?: number;
    };
    inventory?: {
        total?: number;
        lowStock?: number;
    };
    maintenance?: {
        openTickets?: number;
        pendingApprovals?: number;
    };
}

interface PendingApprovalItem {
    id: string;
    type: 'MAINTENANCE' | 'PURCHASE_ORDER' | 'EXPENSE_CLAIM';
    number: string;
    title: string;
    amount: number;
    priority: string;
    createdAt: string;
}

interface InventoryStatusResponse {
    lowStockItems?: Array<{
        name: string;
        sku: string;
        currentQuantity: number;
        reorderPoint: number;
    }>;
    totalInventoryValue?: number;
}

interface FinanceSummaryCategory {
    category: string;
    total: number;
}

interface FinanceSummary {
    id: 'INCOME' | 'EXPENSE';
    typeTotal: number;
    categories: FinanceSummaryCategory[];
}

interface VendorPerformanceData {
    totalVendors?: number;
    topVendors?: Array<{ name: string; overallScore: number }>;
}

export function Analytics() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [stats, setStats] = useState<DashboardStats>({});
    const [approvals, setApprovals] = useState<PendingApprovalItem[]>([]);
    const [inventoryStatus, setInventoryStatus] = useState<InventoryStatusResponse>({});
    const [financeSummary, setFinanceSummary] = useState<FinanceSummary[]>([]);
    const [vendors, setVendors] = useState<VendorPerformanceData>({});

    const canSeeFinance = ['SUPER_ADMIN', 'MANAGER'].includes(user?.role || '');

    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true);
                setError('');

                const requests: Promise<any>[] = [
                    api.get('/analytics/dashboard'),
                    api.get('/analytics/pending-approvals?limit=8'),
                    api.get('/analytics/inventory/status'),
                    api.get('/analytics/vendors/performance'),
                ];

                if (canSeeFinance) {
                    requests.push(api.get('/analytics/finance/summary'));
                }

                const settled = await Promise.allSettled(requests);

                const [dashboardRes, approvalsRes, inventoryRes, vendorRes, financeRes] = settled;

                if (dashboardRes.status === 'fulfilled') {
                    setStats(dashboardRes.value.data?.data || {});
                }

                if (approvalsRes.status === 'fulfilled') {
                    const data = approvalsRes.value.data?.data;
                    setApprovals(Array.isArray(data) ? data : []);
                }

                if (inventoryRes.status === 'fulfilled') {
                    setInventoryStatus(inventoryRes.value.data?.data || {});
                }

                if (vendorRes.status === 'fulfilled') {
                    setVendors(vendorRes.value.data?.data || {});
                }

                if (financeRes?.status === 'fulfilled') {
                    const data = financeRes.value.data?.data;
                    setFinanceSummary(Array.isArray(data) ? data : []);
                }
            } catch (fetchError) {
                console.error('Failed to load analytics control tower', fetchError);
                setError('Analytics control tower is temporarily unavailable.');
            } finally {
                setLoading(false);
            }
        };

        void fetchAll();
    }, [canSeeFinance]);

    const totalPendingAmount = useMemo(
        () => approvals.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        [approvals]
    );

    const financePulse = useMemo(() => {
        const income = financeSummary.find((item) => item.id === 'INCOME')?.typeTotal || 0;
        const expense = financeSummary.find((item) => item.id === 'EXPENSE')?.typeTotal || 0;
        return {
            income,
            expense,
            net: income - expense,
        };
    }, [financeSummary]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[radial-gradient(circle_at_top_right,rgba(185,255,102,0.12),transparent_42%),var(--bg-card)] p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mt-1">Analytics</h1>
                    </div>
                    <BarChart3 className="w-7 h-7 text-[var(--primary)]" />
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Pending Approvals</div>
                    <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{approvals.length}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">{formatCurrency(totalPendingAmount)} at stake</div>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Open Maintenance</div>
                    <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{stats.maintenance?.openTickets || 0}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">{stats.maintenance?.pendingApprovals || 0} awaiting decision</div>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Low Stock Risks</div>
                    <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{stats.inventory?.lowStock || 0}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">Inventory value {formatCurrency(inventoryStatus.totalInventoryValue || 0)}</div>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Vendor Base</div>
                    <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">{vendors.totalVendors || 0}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">Top reliability tracked monthly</div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="xl:col-span-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-amber-400" />
                            Approval Pressure Queue
                        </h2>
                        <button
                            onClick={() => navigate('/dashboard/admin')}
                            className="text-xs px-3 py-1.5 rounded-md border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white"
                        >
                            Open Approval Desk
                        </button>
                    </div>

                    {approvals.length === 0 ? (
                        <p className="text-[var(--text-secondary)] text-sm py-6">No pending approvals right now.</p>
                    ) : (
                        <div className="space-y-3">
                            {approvals.map((item) => (
                                <div key={`${item.type}-${item.id}`} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-overlay)] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-medium text-[var(--text-primary)]">{item.number} • {item.title}</div>
                                            <div className="text-xs text-[var(--text-secondary)] mt-1">{item.type.replace('_', ' ')} • {new Date(item.createdAt).toLocaleDateString()}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(item.amount || 0)}</div>
                                            <div className="text-[10px] uppercase tracking-[0.12em] text-amber-300">{item.priority || 'MEDIUM'}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 }}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"
                >
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
                        <Activity className="w-5 h-5 text-red-400" />
                        Inventory Exposure
                    </h2>

                    {Array.isArray(inventoryStatus.lowStockItems) && inventoryStatus.lowStockItems.length > 0 ? (
                        <div className="space-y-2">
                            {inventoryStatus.lowStockItems.slice(0, 6).map((item) => (
                                <div key={item.sku || item.name} className="rounded-lg border border-[var(--border-color)] p-3 bg-[var(--bg-overlay)]">
                                    <div className="text-sm font-medium text-[var(--text-primary)]">{item.name}</div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-1">{item.currentQuantity} / {item.reorderPoint} • {item.sku}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[var(--text-secondary)] text-sm py-6">No low stock alerts detected.</p>
                    )}

                    <button
                        onClick={() => navigate('/inventory')}
                        className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] py-2.5 text-sm text-[var(--text-secondary)] hover:text-white"
                    >
                        Review Inventory <ArrowRight className="w-4 h-4" />
                    </button>
                </motion.section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"
                >
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        Vendor Reliability Snapshot
                    </h2>

                    {Array.isArray(vendors.topVendors) && vendors.topVendors.length > 0 ? (
                        <div className="space-y-2">
                            {vendors.topVendors.map((vendor, index) => (
                                <div key={`${vendor.name}-${index}`} className="rounded-lg border border-[var(--border-color)] p-3 bg-[var(--bg-overlay)] flex items-center justify-between">
                                    <span className="text-sm text-[var(--text-primary)]">{vendor.name}</span>
                                    <span className="text-xs px-2 py-1 rounded-full border border-emerald-500/30 text-emerald-300">Score {vendor.overallScore || 0}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[var(--text-secondary)] text-sm py-6">Vendor performance data is not available yet.</p>
                    )}

                    <button
                        onClick={() => navigate('/vendors')}
                        className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] py-2.5 text-sm text-[var(--text-secondary)] hover:text-white"
                    >
                        Open Vendor Command Center <ArrowRight className="w-4 h-4" />
                    </button>
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.14 }}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"
                >
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
                        <HandCoins className="w-5 h-5 text-blue-400" />
                        Finance Pulse
                    </h2>

                    {!canSeeFinance ? (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200 flex items-start gap-2">
                            <CircleAlert className="w-4 h-4 mt-0.5" />
                            Finance pulse is restricted to manager-level roles.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3">
                                <div className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Income</div>
                                <div className="text-xl font-semibold text-emerald-300 mt-1">{formatCurrency(financePulse.income)}</div>
                            </div>
                            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3">
                                <div className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Expense</div>
                                <div className="text-xl font-semibold text-red-300 mt-1">{formatCurrency(financePulse.expense)}</div>
                            </div>
                            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3">
                                <div className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Net</div>
                                <div className={`text-xl font-semibold mt-1 ${financePulse.net >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                                    {formatCurrency(financePulse.net)}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-4">
                        <button
                            onClick={() => navigate('/profit-loss')}
                            className="rounded-lg border border-[var(--border-color)] py-2 text-xs text-[var(--text-secondary)] hover:text-white"
                        >
                            P&L
                        </button>
                        <button
                            onClick={() => navigate('/cash-flow')}
                            className="rounded-lg border border-[var(--border-color)] py-2 text-xs text-[var(--text-secondary)] hover:text-white"
                        >
                            Cash Flow
                        </button>
                    </div>
                </motion.section>
            </div>

        </div>
    );
}

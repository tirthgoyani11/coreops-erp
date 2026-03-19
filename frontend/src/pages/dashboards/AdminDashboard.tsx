import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import {
    Package,
    Wrench,
    ClipboardCheck,
    DollarSign,
    AlertTriangle,
    CheckCircle2,
    FileText,
    Receipt,
    BellRing,
    Wallet,
    Activity,
    Building2,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';
import { StatCard } from '../../components/dashboard/StatCard';
import { DashboardChart } from '../../components/dashboard/DashboardChart';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { Skeleton } from '../../components/ui/Skeleton';
import { RecentActivity } from '../../components/dashboard/RecentActivity';
import { KpiAlertsModal } from '../../components/dashboards/KpiAlertsModal';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';

interface ApprovalItem {
    id: string;
    type: 'MAINTENANCE' | 'PURCHASE_ORDER' | 'EXPENSE_CLAIM';
    number: string;
    title: string;
    amount: number;
    office?: { name: string } | null;
    requestedBy?: { id: string; name: string } | null;
    priority: string;
    createdAt: string;
}

const typeConfig: Record<string, { label: string; color: string; icon: any }> = {
    MAINTENANCE: { label: 'Maintenance', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: Wrench },
    PURCHASE_ORDER: { label: 'Purchase Order', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: FileText },
    EXPENSE_CLAIM: { label: 'Expense', color: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20', icon: Receipt },
};

interface DashboardStats {
    totalAssets: number;
    activeAssets: number;
    totalAssetValue: number;
    totalAssetPurchaseValue: number;
    activeTickets: number;
    pendingApprovals: number;
    totalInventory: number;
    lowStock: number;
    totalVendors: number;
    monthlyIncome: number;
    monthlyExpense: number;
}

function getPriorityClass(priority: string) {
    const p = String(priority || '').toUpperCase();
    if (p === 'CRITICAL' || p === 'HIGH') {
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
    if (p === 'MEDIUM') {
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    return 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20';
}

export const AdminDashboard = memo(function AdminDashboard() {
    const { user } = useAuthStore();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const [stats, setStats] = useState<DashboardStats>({
        totalAssets: 0,
        activeAssets: 0,
        totalAssetValue: 0,
        totalAssetPurchaseValue: 0,
        activeTickets: 0,
        pendingApprovals: 0,
        totalInventory: 0,
        lowStock: 0,
        totalVendors: 0,
        monthlyIncome: 0,
        monthlyExpense: 0,
    });
    const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [assetCategoryData, setAssetCategoryData] = useState<{ name: string; value: number }[]>([]);
    const [maintenanceTrendData, setMaintenanceTrendData] = useState<{ name: string; value: number }[]>([]);
    const [inventoryData, setInventoryData] = useState<{ name: string; value: number }[]>([]);
    const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                const [dashboardRes, categoryRes, trendsRes, inventoryRes, approvalsRes] = await Promise.allSettled([
                    api.get('/analytics/dashboard'),
                    api.get('/analytics/assets/by-category'),
                    api.get('/analytics/maintenance/trends?months=6'),
                    api.get('/analytics/inventory/status'),
                    api.get('/analytics/pending-approvals?limit=8'),
                ]);

                if (dashboardRes.status === 'fulfilled' && dashboardRes.value.data?.data) {
                    const d = dashboardRes.value.data.data;
                    setStats({
                        totalAssets: d.assets?.total || 0,
                        activeAssets: d.assets?.active || 0,
                        totalAssetValue: d.assets?.totalValue || 0,
                        totalAssetPurchaseValue: d.assets?.totalPurchaseValue || 0,
                        activeTickets: d.maintenance?.openTickets || 0,
                        pendingApprovals: d.maintenance?.pendingApprovals || 0,
                        totalInventory: d.inventory?.total || 0,
                        lowStock: d.inventory?.lowStock || 0,
                        totalVendors: d.vendors?.total || 0,
                        monthlyIncome: d.finance?.monthlyTransactions?.find((t: any) => t.id === 'INCOME')?.total || 0,
                        monthlyExpense: d.finance?.monthlyTransactions?.find((t: any) => t.id === 'EXPENSE')?.total || 0,
                    });
                }

                if (categoryRes.status === 'fulfilled' && categoryRes.value.data?.data) {
                    setAssetCategoryData(categoryRes.value.data.data.map((c: any) => ({ name: c.id, value: c.count })));
                }

                if (trendsRes.status === 'fulfilled' && trendsRes.value.data?.data) {
                    setMaintenanceTrendData(trendsRes.value.data.data.map((t: any) => ({
                        name: new Date(t.period + '-01').toLocaleString('default', { month: 'short' }),
                        value: Math.round(t.totalCost),
                    })));
                }

                if (inventoryRes.status === 'fulfilled' && inventoryRes.value.data?.data) {
                    const inv = inventoryRes.value.data.data;
                    setInventoryData(inv.byType?.map((t: any) => ({ name: t.id, value: t.totalQuantity })) || []);
                }

                if (approvalsRes.status === 'fulfilled' && approvalsRes.value.data?.data) {
                    setApprovals(approvalsRes.value.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const netCashFlow = stats.monthlyIncome - stats.monthlyExpense;
    const utilization = stats.totalAssets > 0 ? Math.round((stats.activeAssets / stats.totalAssets) * 100) : 0;

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-[1700px] mx-auto pb-24">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">
                        {isSuperAdmin ? 'Super Admin Command Center' : 'Admin Operations Dashboard'}
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Enterprise performance, risk signals, approvals, and operational throughput in one view.
                    </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <button
                        onClick={() => setIsAlertsModalOpen(true)}
                        className="px-4 py-2 border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <BellRing className="w-4 h-4" />
                        KPI Alerts
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[var(--text-secondary)]">Live</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="xl:col-span-8 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 via-emerald-400/5 to-transparent p-6"
                >
                    {loading ? (
                        <Skeleton variant="card" className="h-[220px]" />
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                                        <Wallet className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-[var(--text-secondary)] text-sm">Monthly Financial Posture</p>
                                        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Cashflow Spotlight</h2>
                                    </div>
                                </div>
                                <div className={`text-sm px-3 py-1 rounded-full border ${netCashFlow >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                                    {netCashFlow >= 0 ? 'Positive Flow' : 'Negative Flow'}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="rounded-xl bg-[var(--bg-card)]/80 border border-[var(--border-color)] p-4">
                                    <p className="text-xs text-[var(--text-secondary)] mb-1">Income (Month)</p>
                                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.monthlyIncome)}</p>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> Revenue inflow</p>
                                </div>
                                <div className="rounded-xl bg-[var(--bg-card)]/80 border border-[var(--border-color)] p-4">
                                    <p className="text-xs text-[var(--text-secondary)] mb-1">Expense (Month)</p>
                                    <p className="text-2xl font-bold text-amber-400">{formatCurrency(stats.monthlyExpense)}</p>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1"><ArrowDownRight className="w-3 h-3" /> Operational outflow</p>
                                </div>
                                <div className="rounded-xl bg-[var(--bg-card)]/80 border border-[var(--border-color)] p-4">
                                    <p className="text-xs text-[var(--text-secondary)] mb-1">Net Position</p>
                                    <p className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {formatCurrency(netCashFlow)}
                                    </p>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">Income minus expense</p>
                                </div>
                            </div>
                        </>
                    )}
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="xl:col-span-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[var(--text-primary)] font-semibold">System Signals</h3>
                        <Activity className="w-4 h-4 text-[var(--primary)]" />
                    </div>
                    {loading ? (
                        <Skeleton variant="card" className="h-[180px]" />
                    ) : (
                        <div className="space-y-3">
                            <div className="rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-color)] p-3 flex items-center justify-between">
                                <span className="text-sm text-[var(--text-secondary)]">Pending approvals</span>
                                <span className="text-lg font-bold text-amber-400">{stats.pendingApprovals}</span>
                            </div>
                            <div className="rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-color)] p-3 flex items-center justify-between">
                                <span className="text-sm text-[var(--text-secondary)]">Open tickets</span>
                                <span className="text-lg font-bold text-blue-400">{stats.activeTickets}</span>
                            </div>
                            <div className="rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-color)] p-3 flex items-center justify-between">
                                <span className="text-sm text-[var(--text-secondary)]">Low stock skus</span>
                                <span className="text-lg font-bold text-rose-400">{stats.lowStock}</span>
                            </div>
                            <div className="rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-color)] p-3 flex items-center justify-between">
                                <span className="text-sm text-[var(--text-secondary)]">Asset utilization</span>
                                <span className="text-lg font-bold text-emerald-400">{utilization}%</span>
                            </div>
                        </div>
                    )}
                </motion.section>
            </div>

            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard title="Total Assets" value={stats.totalAssets} icon={Package} color="primary" loading={loading} />
                <StatCard title="Active Assets" value={stats.activeAssets} icon={CheckCircle2} color="green" loading={loading} />
                <StatCard title="Inventory Items" value={stats.totalInventory} icon={Building2} color="blue" loading={loading} />
                <StatCard title="Asset Book Value" value={formatCurrency(stats.totalAssetValue)} subtitle={`Cost: ${formatCurrency(stats.totalAssetPurchaseValue)}`} icon={DollarSign} color="orange" loading={loading} />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-4">
                    <DashboardChart type="donut" data={assetCategoryData} title="Asset Category Distribution" loading={loading} height={280} />
                </div>
                <div className="xl:col-span-4">
                    <DashboardChart type="area" data={maintenanceTrendData} title="Maintenance Cost Trend" loading={loading} height={280} />
                </div>
                <div className="xl:col-span-4">
                    <DashboardChart type="bar" data={inventoryData} title="Inventory by Type" loading={loading} height={280} />
                </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-8 min-h-[520px]">
                    <RecentActivity />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="xl:col-span-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 min-h-[520px] flex flex-col"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[var(--text-primary)] font-semibold">Approval Queue</h3>
                        <span className="text-xs text-[var(--text-secondary)]">{approvals.length} pending</span>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                        {loading ? (
                            <Skeleton variant="card" className="h-[260px]" />
                        ) : approvals.length === 0 ? (
                            <div className="text-center py-8 text-[var(--text-secondary)] my-auto h-full flex flex-col justify-center">
                                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No pending approvals</p>
                            </div>
                        ) : (
                            approvals.slice(0, 8).map((item) => {
                                const cfg = typeConfig[item.type] || typeConfig.MAINTENANCE;
                                const TypeIcon = cfg.icon;
                                return (
                                    <div key={item.id} className="p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-color)]">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.color}`}>
                                                <TypeIcon className="w-3 h-3" />
                                                {cfg.label}
                                            </span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getPriorityClass(item.priority)}`}>
                                                {item.priority || 'LOW'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-primary)] font-medium truncate">{item.title}</p>
                                        <div className="mt-1 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                                            <span className="font-mono">#{item.number}</span>
                                            <span>{formatCurrency(item.amount || 0)}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </motion.div>
            </section>

            <section>
                <QuickActions title="Operational Shortcuts" />
            </section>

            <KpiAlertsModal isOpen={isAlertsModalOpen} onClose={() => setIsAlertsModalOpen(false)} />
        </div>
    );
});

export default AdminDashboard;
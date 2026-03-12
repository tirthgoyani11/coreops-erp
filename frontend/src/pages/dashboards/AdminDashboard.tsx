import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import {
    Package,
    Wrench,
    ClipboardCheck,
    DollarSign,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    FileText,
    Receipt,
} from 'lucide-react';
import { StatCard } from '../../components/dashboard/StatCard';
import { DashboardChart } from '../../components/dashboard/DashboardChart';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { RecentActivity } from '../../components/dashboard/RecentActivity';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

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
    EXPENSE_CLAIM: { label: 'Expense', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Receipt },
};

interface DashboardStats {
    totalAssets: number;
    activeAssets: number;
    totalAssetValue: number;
    activeTickets: number;
    pendingApprovals: number;
    totalInventory: number;
    lowStock: number;
    totalVendors: number;
    monthlyIncome: number;
    monthlyExpense: number;
}

// Main Dashboard Component
export const AdminDashboard = memo(function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        totalAssets: 0,
        activeAssets: 0,
        totalAssetValue: 0,
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

    // Chart data from API
    const [assetCategoryData, setAssetCategoryData] = useState<{ name: string; value: number }[]>([]);
    const [maintenanceTrendData, setMaintenanceTrendData] = useState<{ name: string; value: number }[]>([]);
    const [inventoryData, setInventoryData] = useState<{ name: string; value: number }[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                // Fetch all data in parallel
                const [dashboardRes, categoryRes, trendsRes, inventoryRes, approvalsRes] = await Promise.allSettled([
                    api.get('/analytics/dashboard'),
                    api.get('/analytics/assets/by-category'),
                    api.get('/analytics/maintenance/trends?months=6'),
                    api.get('/analytics/inventory/status'),
                    api.get('/analytics/pending-approvals?limit=8'),
                ]);

                // Dashboard stats
                if (dashboardRes.status === 'fulfilled' && dashboardRes.value.data?.data) {
                    const d = dashboardRes.value.data.data;
                    setStats({
                        totalAssets: d.assets?.total || 0,
                        activeAssets: d.assets?.active || 0,
                        totalAssetValue: d.assets?.totalValue || 0,
                        activeTickets: d.maintenance?.openTickets || 0,
                        pendingApprovals: d.maintenance?.pendingApprovals || 0,
                        totalInventory: d.inventory?.total || 0,
                        lowStock: d.inventory?.lowStock || 0,
                        totalVendors: d.vendors?.total || 0,
                        monthlyIncome: d.finance?.monthlyTransactions?.find((t: any) => t.id === 'INCOME')?.total || 0,
                        monthlyExpense: d.finance?.monthlyTransactions?.find((t: any) => t.id === 'EXPENSE')?.total || 0,
                    });
                }



                // Asset categories chart
                if (categoryRes.status === 'fulfilled' && categoryRes.value.data?.data) {
                    setAssetCategoryData(
                        categoryRes.value.data.data.map((c: any) => ({ name: c.id, value: c.count }))
                    );
                }

                // Maintenance trends chart
                if (trendsRes.status === 'fulfilled' && trendsRes.value.data?.data) {
                    setMaintenanceTrendData(
                        trendsRes.value.data.data.map((t: any) => ({
                            name: new Date(t.period + '-01').toLocaleString('default', { month: 'short' }),
                            value: Math.round(t.totalCost),
                        }))
                    );
                }

                // Inventory status chart
                if (inventoryRes.status === 'fulfilled' && inventoryRes.value.data?.data) {
                    const inv = inventoryRes.value.data.data;
                    setInventoryData(
                        inv.byType?.map((t: any) => ({ name: t.id, value: t.totalQuantity })) || []
                    );
                }

                // Pending approvals
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

        // Refresh every 5 minutes
        const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">Admin Dashboard</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Enterprise overview and system metrics</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[var(--text-secondary)]">Live</span>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Assets"
                    value={stats.totalAssets}
                    icon={Package}
                    color="primary"
                    loading={loading}
                />
                <StatCard
                    title="Active Tickets"
                    value={stats.activeTickets}
                    icon={Wrench}
                    color="blue"
                    loading={loading}
                />
                <StatCard
                    title="Pending Approvals"
                    value={stats.pendingApprovals}
                    icon={ClipboardCheck}
                    color="orange"
                    loading={loading}
                />
                <StatCard
                    title="Asset Value"
                    value={formatCurrency(stats.totalAssetValue)}
                    icon={DollarSign}
                    color="green"
                    loading={loading}
                />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
                    <p className="text-xs text-[var(--text-secondary)] mb-1">Inventory Items</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{stats.totalInventory}</p>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
                    <div className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <p className="text-xs text-[var(--text-secondary)]">Low Stock</p>
                    </div>
                    <p className="text-xl font-bold text-amber-400">{stats.lowStock}</p>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
                    <p className="text-xs text-[var(--text-secondary)] mb-1">Vendors</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{stats.totalVendors}</p>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
                    <p className="text-xs text-[var(--text-secondary)] mb-1">Active Assets</p>
                    <p className="text-xl font-bold text-emerald-400">{stats.activeAssets}</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DashboardChart
                    type="pie"
                    data={assetCategoryData}
                    title="Assets by Category"
                    loading={loading}
                />
                <DashboardChart
                    type="line"
                    data={maintenanceTrendData}
                    title="Monthly Maintenance Costs"
                    loading={loading}
                />
                <DashboardChart
                    type="bar"
                    data={inventoryData}
                    title="Inventory by Type"
                    loading={loading}
                />
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 text-white">
                    <RecentActivity />
                </div>
                <div className="space-y-6">
                    {/* Approval Queue */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[var(--text-primary)] font-medium">Approval Queue</h3>
                            <span className="text-xs text-[var(--text-secondary)]">
                                {approvals.length} pending
                            </span>
                        </div>
                        <div className="space-y-3">
                            {approvals.length === 0 ? (
                                <div className="text-center py-6 text-[var(--text-secondary)]">
                                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No pending approvals</p>
                                </div>
                            ) : (
                                approvals.slice(0, 5).map((item, index) => {
                                    const cfg = typeConfig[item.type] || typeConfig.MAINTENANCE;
                                    const TypeIcon = cfg.icon;
                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-color)] hover:border-[var(--primary)]/30 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.color}`}>
                                                    <TypeIcon className="w-3 h-3" />
                                                    {cfg.label}
                                                </span>
                                                <span className="text-xs font-mono text-[var(--primary)]">#{item.number}</span>
                                            </div>
                                            <p className="text-sm text-[var(--text-primary)] font-medium truncate">{item.title}</p>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-xs text-[var(--text-secondary)]">₹{(item.amount || 0).toLocaleString()}</span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                if (item.type === 'EXPENSE_CLAIM') {
                                                                    await api.put(`/finance-ext/expense-claims/${item.id}/status`, { status: 'APPROVED' });
                                                                } else if (item.type === 'PURCHASE_ORDER') {
                                                                    await api.patch(`/purchase-orders/${item.id}/approve`);
                                                                } else {
                                                                    await api.patch(`/maintenance/${item.id}/approve`);
                                                                }
                                                                setApprovals(prev => prev.filter(a => a.id !== item.id));
                                                            } catch (err) { console.error('Approval failed:', err); }
                                                        }}
                                                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                                        title="Approve"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                if (item.type === 'EXPENSE_CLAIM') {
                                                                    await api.put(`/finance-ext/expense-claims/${item.id}/status`, { status: 'REJECTED' });
                                                                } else if (item.type === 'PURCHASE_ORDER') {
                                                                    await api.patch(`/purchase-orders/${item.id}/reject`);
                                                                } else {
                                                                    await api.patch(`/maintenance/${item.id}/reject`);
                                                                }
                                                                setApprovals(prev => prev.filter(a => a.id !== item.id));
                                                            } catch (err) { console.error('Rejection failed:', err); }
                                                        }}
                                                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                        title="Reject"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                    <QuickActions />
                </div>
            </div>
        </div>
    );
});

export default AdminDashboard;

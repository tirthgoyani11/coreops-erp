import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import {
    Package,
    Wrench,
    ClipboardCheck,
    Clock,
    User,
    ChevronRight,
    DollarSign,
    AlertTriangle,
} from 'lucide-react';
import { StatCard } from '../../components/dashboard/StatCard';
import { DashboardChart } from '../../components/dashboard/DashboardChart';
import { QuickActions } from '../../components/dashboard/QuickActions';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

// Types
interface AuditLogEntry {
    id: string;
    user?: { name: string };
    action: string;
    createdAt: string;
}

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

// Audit Log Table Component
const AuditLogTable = memo(function AuditLogTable({ logs, loading }: { logs: AuditLogEntry[]; loading: boolean }) {
    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
                <div className="w-32 h-5 rounded bg-[var(--bg-card-hover)] mb-4 animate-pulse" />
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center gap-4 py-3 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-card-hover)]" />
                        <div className="flex-1 h-4 rounded bg-[var(--bg-card-hover)]" />
                        <div className="w-16 h-4 rounded bg-[var(--bg-card-hover)]" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[var(--text-primary)] font-medium">Recent Activity</h3>
                <button className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
                    View All <ChevronRight className="w-3 h-3" />
                </button>
            </div>

            <div className="space-y-1">
                {logs.length === 0 ? (
                    <p className="text-[var(--text-secondary)] text-sm py-4 text-center">No recent activity</p>
                ) : (
                    logs.map((log, index) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center gap-3 py-3 border-b border-[var(--border-color)] last:border-0"
                        >
                            <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-[var(--primary)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-[var(--text-primary)] truncate">
                                    <span className="font-medium">{log.user?.name || 'System'}</span>
                                    {' '}
                                    <span className="text-[var(--text-secondary)]">{log.action}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                                <Clock className="w-3 h-3" />
                                {formatTime(log.createdAt)}
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </motion.div>
    );
});

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
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
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
                const [dashboardRes, logsRes, categoryRes, trendsRes, inventoryRes] = await Promise.allSettled([
                    api.get('/analytics/dashboard'),
                    api.get('/audit-logs?limit=8'),
                    api.get('/analytics/assets/by-category'),
                    api.get('/analytics/maintenance/trends?months=6'),
                    api.get('/analytics/inventory/status'),
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

                // Audit logs
                if (logsRes.status === 'fulfilled' && logsRes.value.data?.data) {
                    setAuditLogs(logsRes.value.data.data);
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
                <div className="lg:col-span-2">
                    <AuditLogTable logs={auditLogs} loading={loading} />
                </div>
                <QuickActions />
            </div>
        </div>
    );
});

export default AdminDashboard;

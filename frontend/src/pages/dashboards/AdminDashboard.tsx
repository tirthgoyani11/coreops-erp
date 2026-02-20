import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import {
    Package,
    Wrench,
    ClipboardCheck,
    Activity,
    Clock,
    User,
    ChevronRight,
} from 'lucide-react';
import { StatCard } from '../../components/dashboard/StatCard';
import { DashboardChart } from '../../components/dashboard/DashboardChart';
import { QuickActions } from '../../components/dashboard/QuickActions';
import api from '../../lib/api';

// Types
interface AuditLogEntry {
    _id: string;
    user?: { name: string };
    action: string;
    createdAt: string;
}

interface DashboardStats {
    totalAssets: number;
    activeTickets: number;
    pendingApprovals: number;
    systemHealth: number;
    assetsChange?: number;
    ticketsChange?: number;
}

// Mock data for charts (replace with API calls)
const assetDistributionData = [
    { name: 'Mumbai', value: 450 },
    { name: 'Delhi', value: 320 },
    { name: 'Bangalore', value: 280 },
    { name: 'Chennai', value: 190 },
    { name: 'Other', value: 120 },
];

const monthlyCostsData = [
    { name: 'Jan', value: 12000 },
    { name: 'Feb', value: 19000 },
    { name: 'Mar', value: 15000 },
    { name: 'Apr', value: 22000 },
    { name: 'May', value: 18000 },
    { name: 'Jun', value: 25000 },
];

const inventoryTurnoverData = [
    { name: 'Q1', value: 4.2 },
    { name: 'Q2', value: 3.8 },
    { name: 'Q3', value: 5.1 },
    { name: 'Q4', value: 4.6 },
];

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
                            key={log._id}
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
        activeTickets: 0,
        pendingApprovals: 0,
        systemHealth: 99.9,
    });
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                // Fetch stats in parallel
                const [assetsRes, logsRes] = await Promise.allSettled([
                    api.get('/analytics/dashboard'),
                    api.get('/audit-logs?limit=8'),
                ]);

                if (assetsRes.status === 'fulfilled' && assetsRes.value.data?.data) {
                    const data = assetsRes.value.data.data;
                    setStats({
                        totalAssets: data.assets?.total || 1360,
                        activeTickets: data.maintenance?.openTickets || 87,
                        pendingApprovals: data.maintenance?.pendingApprovals || 12,
                        systemHealth: 98.5, // Mock for now
                        assetsChange: 5, // Mock
                        ticketsChange: -2, // Mock
                    });
                } else {
                    // Use demo data if API fails
                    setStats({
                        totalAssets: 1360,
                        activeTickets: 87,
                        pendingApprovals: 12,
                        systemHealth: 99.9,
                        assetsChange: 5,
                        ticketsChange: -12,
                    });
                }

                if (logsRes.status === 'fulfilled' && logsRes.value.data?.data) {
                    setAuditLogs(logsRes.value.data.data);
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
                    value={`$${(stats.totalAssets * 3800).toLocaleString()}`}
                    icon={Package}
                    change={stats.assetsChange}
                    changeLabel="this month"
                    color="primary"
                    loading={loading}
                />
                <StatCard
                    title="Active Tickets"
                    value={stats.activeTickets}
                    icon={Wrench}
                    change={stats.ticketsChange}
                    changeLabel="vs last week"
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
                    title="System Health"
                    value={`${stats.systemHealth}%`}
                    icon={Activity}
                    color="green"
                    loading={loading}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DashboardChart
                    type="pie"
                    data={assetDistributionData}
                    title="Asset Distribution by Location"
                    loading={loading}
                />
                <DashboardChart
                    type="line"
                    data={monthlyCostsData}
                    title="Monthly Maintenance Costs"
                    loading={loading}
                />
                <DashboardChart
                    type="bar"
                    data={inventoryTurnoverData}
                    title="Inventory Turnover Rate"
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

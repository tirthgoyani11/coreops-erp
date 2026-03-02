import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Package,
    ClipboardCheck,
    DollarSign,
    CheckCircle2,
    XCircle,
    Users,
    TrendingUp,
} from 'lucide-react';
import { StatCard } from '../../components/dashboard/StatCard';
import { DashboardChart } from '../../components/dashboard/DashboardChart';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

interface ApprovalItem {
    id: string;
    ticketNumber: string;
    title: string;
    issueDescription?: string;
    estimatedCost: number;
    office?: { name: string };
    priority: 'low' | 'medium' | 'high' | 'critical' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface ManagerStats {
    branchAssets: number;
    openTickets: number;
    pendingApprovals: number;
    mtdExpenses: number;
    totalInventory: number;
    lowStockCount: number;
}

// Priority colors
const priorityColors: Record<string, string> = {
    low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    LOW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
};

// Approval Queue Component
const ApprovalQueue = memo(function ApprovalQueue({
    items,
    loading,
    onApprove,
    onReject,
}: {
    items: ApprovalItem[];
    loading: boolean;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
}) {
    if (loading) {
        return (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
                <div className="w-32 h-5 rounded bg-[var(--bg-card-hover)] mb-4 animate-pulse" />
                {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 rounded-xl bg-[var(--bg-card-hover)] mb-2 animate-pulse">
                        <div className="h-5 w-48 rounded bg-[var(--bg-card-hover)] mb-2" />
                        <div className="h-4 w-24 rounded bg-[var(--bg-card-hover)]" />
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
                <h3 className="text-[var(--text-primary)] font-medium">Approval Queue</h3>
                <span className="text-xs text-[var(--text-secondary)]">
                    {items.length} pending
                </span>
            </div>

            <div className="space-y-3">
                {items.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-secondary)]">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No pending approvals</p>
                    </div>
                ) : (
                    items.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-color)] hover:border-[var(--primary)]/30 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-mono text-[var(--primary)]">
                                            #{item.ticketNumber}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColors[item.priority] || priorityColors.medium}`}>
                                            {item.priority}
                                        </span>
                                    </div>
                                    <p className="text-sm text-[var(--text-primary)] font-medium truncate">
                                        {item.title || item.issueDescription || 'Maintenance Request'}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                                        <span>₹{(item.estimatedCost || 0).toLocaleString()}</span>
                                        {item.office && <span>• {item.office.name}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onApprove(item.id)}
                                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onReject(item.id)}
                                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </motion.div>
    );
});

// Main Manager Dashboard Component
export const ManagerDashboard = memo(function ManagerDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<ManagerStats>({
        branchAssets: 0,
        openTickets: 0,
        pendingApprovals: 0,
        mtdExpenses: 0,
        totalInventory: 0,
        lowStockCount: 0,
    });
    const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [inventoryChartData, setInventoryChartData] = useState<{ name: string; value: number }[]>([]);
    const [expensesChartData, setExpensesChartData] = useState<{ name: string; value: number }[]>([]);
    const [technicianCount, setTechnicianCount] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                const [dashRes, approvalsRes, inventoryRes, trendsRes, usersRes] = await Promise.allSettled([
                    api.get('/analytics/dashboard'),
                    api.get('/maintenance?approvalStatus=PENDING&limit=5'),
                    api.get('/analytics/inventory/status'),
                    api.get('/analytics/maintenance/trends?months=6'),
                    api.get('/users?role=TECHNICIAN&limit=1'),
                ]);

                // Dashboard stats
                if (dashRes.status === 'fulfilled' && dashRes.value.data?.data) {
                    const d = dashRes.value.data.data;
                    const expense = d.finance?.monthlyTransactions?.find((t: any) => t.id === 'EXPENSE');
                    setStats({
                        branchAssets: d.assets?.total || 0,
                        openTickets: d.maintenance?.openTickets || 0,
                        pendingApprovals: d.maintenance?.pendingApprovals || 0,
                        mtdExpenses: expense?.total || 0,
                        totalInventory: d.inventory?.total || 0,
                        lowStockCount: d.inventory?.lowStock || 0,
                    });
                }

                // Approval queue
                if (approvalsRes.status === 'fulfilled' && approvalsRes.value.data?.data) {
                    setApprovals(approvalsRes.value.data.data);
                }

                // Inventory chart
                if (inventoryRes.status === 'fulfilled' && inventoryRes.value.data?.data) {
                    const inv = inventoryRes.value.data.data;
                    const total = inv.byType?.reduce((s: number, t: any) => s + t.totalQuantity, 0) || 0;
                    const lowStock = inv.lowStockItems?.length || 0;
                    setInventoryChartData([
                        { name: 'In Stock', value: Math.max(0, total - lowStock) },
                        { name: 'Low Stock', value: lowStock },
                    ]);
                }

                // Expenses trend
                if (trendsRes.status === 'fulfilled' && trendsRes.value.data?.data) {
                    setExpensesChartData(
                        trendsRes.value.data.data.map((t: any) => ({
                            name: new Date(t.period + '-01').toLocaleString('default', { month: 'short' }),
                            value: Math.round(t.totalCost),
                        }))
                    );
                }

                // Technician count
                if (usersRes.status === 'fulfilled') {
                    const pagination = usersRes.value.data?.pagination;
                    setTechnicianCount(pagination?.totalResults || pagination?.total || 0);
                }
            } catch (error) {
                console.error('Failed to load manager dashboard:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleApprove = async (id: string) => {
        try {
            await api.patch(`/maintenance/${id}/approve`);
            setApprovals(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error('Approval failed:', error);
        }
    };

    const handleReject = async (id: string) => {
        try {
            await api.patch(`/maintenance/${id}/reject`);
            setApprovals(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error('Rejection failed:', error);
        }
    };

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">Branch Dashboard</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Branch operations overview</p>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Branch Assets"
                    value={stats.branchAssets}
                    icon={Package}
                    color="primary"
                    loading={loading}
                    onClick={() => navigate('/assets')}
                />
                <StatCard
                    title="Open Tickets"
                    value={stats.openTickets}
                    icon={ClipboardCheck}
                    color="blue"
                    loading={loading}
                    onClick={() => navigate('/maintenance')}
                />
                <StatCard
                    title="MTD Expenses"
                    value={formatCurrency(stats.mtdExpenses)}
                    icon={DollarSign}
                    color="orange"
                    loading={loading}
                />
                <StatCard
                    title="Pending Approvals"
                    value={stats.pendingApprovals}
                    icon={TrendingUp}
                    color={stats.pendingApprovals > 5 ? 'red' : 'green'}
                    loading={loading}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardChart
                    type="donut"
                    data={inventoryChartData}
                    title="Inventory Status"
                    loading={loading}
                />
                <DashboardChart
                    type="bar"
                    data={expensesChartData}
                    title="Monthly Maintenance Costs"
                    loading={loading}
                />
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ApprovalQueue
                        items={approvals}
                        loading={loading}
                        onApprove={handleApprove}
                        onReject={handleReject}
                    />
                </div>

                {/* Technician Workload Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6"
                >
                    <h3 className="text-[var(--text-primary)] font-medium mb-4">Team Overview</h3>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{technicianCount}</p>
                            <p className="text-sm text-[var(--text-secondary)]">Technicians</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-[var(--text-secondary)]">Inventory Items</span>
                            <span className="text-[var(--text-primary)] font-medium">{stats.totalInventory}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-[var(--text-secondary)]">Low Stock Alerts</span>
                            <span className="text-orange-400 font-medium">{stats.lowStockCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-[var(--text-secondary)]">Open Tickets</span>
                            <span className="text-blue-400 font-medium">{stats.openTickets}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/users?role=TECHNICIAN')}
                        className="w-full mt-4 py-2 text-sm text-[var(--primary)] bg-[var(--primary)]/10 rounded-lg hover:bg-[var(--primary)]/20 transition-colors"
                    >
                        View All Technicians
                    </button>
                </motion.div>
            </div>
        </div>
    );
});

export default ManagerDashboard;

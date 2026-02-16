import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3, Package, Wrench,
    DollarSign, AlertTriangle, Loader2
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';

interface DashboardStats {
    assets: {
        total: number;
        active: number;
        totalValue: number;
        byStatus: Array<{ _id: string; count: number }>;
    };
    inventory: {
        total: number;
        lowStock: number;
    };
    maintenance: {
        openTickets: number;
        pendingApprovals: number;
    };
    vendors: {
        total: number;
    };
}

interface CategoryData {
    _id: string;
    count: number;
    totalValue: number;
}

interface MaintenanceTrend {
    period: string;
    ticketCount: number;
    totalCost: number;
    avgCost: number;
}

export function Analytics() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [categories, setCategories] = useState<CategoryData[]>([]);
    const [maintenanceTrends, setMaintenanceTrends] = useState<MaintenanceTrend[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const [dashboardRes, categoriesRes, trendsRes] = await Promise.all([
                api.get('/analytics/dashboard'),
                api.get('/analytics/assets/by-category'),
                api.get('/analytics/maintenance/trends'),
            ]);

            setStats(dashboardRes.data.data);
            setCategories(categoriesRes.data.data || []);
            setMaintenanceTrends(trendsRes.data.data || []);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    const maxCategoryValue = Math.max(...categories.map(c => c.totalValue), 1);
    const maxTrendCost = Math.max(...maintenanceTrends.map(t => t.totalCost), 1);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/20 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-[var(--primary)]" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analytics Dashboard</h1>
                    <p className="text-[var(--text-secondary)]">Overview of your operations</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl relative overflow-hidden"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-[var(--text-secondary)]">Total Asset Value</span>
                    </div>
                    <h3 className="text-3xl font-bold text-[var(--text-primary)]">{formatCurrency(stats?.assets.totalValue || 0)}</h3>
                    <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-emerald-500/10 blur-[60px]" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl relative overflow-hidden"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <Package className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-[var(--text-secondary)]">Active Assets</span>
                    </div>
                    <h3 className="text-3xl font-bold text-[var(--text-primary)]">{stats?.assets.active || 0}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">of {stats?.assets.total || 0} total</p>
                    <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-blue-500/10 blur-[60px]" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl relative overflow-hidden"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <Wrench className="w-5 h-5 text-amber-400" />
                        </div>
                        <span className="text-[var(--text-secondary)]">Open Tickets</span>
                    </div>
                    <h3 className="text-3xl font-bold text-[var(--text-primary)]">{stats?.maintenance.openTickets || 0}</h3>
                    <p className="text-sm text-amber-400 mt-1">{stats?.maintenance.pendingApprovals || 0} pending approval</p>
                    <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-amber-500/10 blur-[60px]" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl relative overflow-hidden"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                        <span className="text-[var(--text-secondary)]">Low Stock Items</span>
                    </div>
                    <h3 className="text-3xl font-bold text-[var(--text-primary)]">{stats?.inventory.lowStock || 0}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">of {stats?.inventory.total || 0} items</p>
                    <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-red-500/10 blur-[60px]" />
                </motion.div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Asset Value by Category */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl"
                >
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)]">
                        <div className="w-1.5 h-6 bg-[var(--primary)] rounded-full" />
                        Asset Value by Category
                    </h3>

                    {categories.length === 0 ? (
                        <p className="text-[var(--text-secondary)] text-center py-8">No data available</p>
                    ) : (
                        <div className="space-y-4">
                            {categories.map((cat, i) => (
                                <div key={cat._id || i} className="group">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[var(--text-primary)] font-medium">{cat._id || 'Other'}</span>
                                        <span className="text-[var(--text-secondary)]">{formatCurrency(cat.totalValue)}</span>
                                    </div>
                                    <div className="h-3 bg-[var(--bg-overlay)] rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(cat.totalValue / maxCategoryValue) * 100}%` }}
                                            transition={{ duration: 0.8, delay: i * 0.1 }}
                                            className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary)]/60 rounded-full"
                                        />
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">{cat.count} assets</p>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Maintenance Cost Trends */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl"
                >
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)]">
                        <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                        Maintenance Cost Trends
                    </h3>

                    {maintenanceTrends.length === 0 ? (
                        <p className="text-[var(--text-secondary)] text-center py-8">No maintenance data yet</p>
                    ) : (
                        <div className="space-y-4">
                            {maintenanceTrends.map((trend, i) => (
                                <div key={trend.period} className="group">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[var(--text-primary)] font-medium">{trend.period}</span>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm text-[var(--text-secondary)]">{trend.ticketCount} tickets</span>
                                            <span className="text-amber-400">{formatCurrency(trend.totalCost)}</span>
                                        </div>
                                    </div>
                                    <div className="h-3 bg-[var(--bg-overlay)] rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(trend.totalCost / maxTrendCost) * 100}%` }}
                                            transition={{ duration: 0.8, delay: i * 0.1 }}
                                            className="h-full bg-gradient-to-r from-amber-500 to-amber-500/60 rounded-full"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats?.assets.byStatus?.map((status, i) => (
                    <motion.div
                        key={status._id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + i * 0.1 }}

                        className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-2xl text-center"
                    >
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{status.count}</p>
                        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">{status._id}</p>
                    </motion.div>
                ))}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 }}

                    className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-2xl text-center"
                >
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{stats?.vendors.total || 0}</p>
                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Vendors</p>
                </motion.div>
            </div>
        </div>
    );
}

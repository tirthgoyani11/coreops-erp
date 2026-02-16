import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import {
    Package,
    Wrench,
    AlertTriangle,
    ClipboardList,
} from 'lucide-react';
import { StatCard } from '../../components/dashboard/StatCard';
import { DashboardChart } from '../../components/dashboard/DashboardChart';
import { QuickActions } from '../../components/dashboard/QuickActions';
import api from '../../lib/api';

// Types
interface StaffStats {
    branchAssets: number;
    myTicketsToday: number;
    lowStockItems: number;
    recentTransactions: number;
}

// Chart data
const weeklyActivity = [
    { name: 'Mon', value: 12 },
    { name: 'Tue', value: 18 },
    { name: 'Wed', value: 8 },
    { name: 'Thu', value: 22 },
    { name: 'Fri', value: 15 },
    { name: 'Sat', value: 5 },
    { name: 'Sun', value: 2 },
];

const inventoryStatus = [
    { name: 'In Stock', value: 320 },
    { name: 'Low Stock', value: 18 },
    { name: 'Out of Stock', value: 4 },
    { name: 'On Order', value: 12 },
];

export const StaffDashboard = memo(function StaffDashboard() {
    const [stats, setStats] = useState<StaffStats>({
        branchAssets: 0,
        myTicketsToday: 0,
        lowStockItems: 0,
        recentTransactions: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [assetsRes, ticketsRes] = await Promise.allSettled([
                    api.get('/assets', { params: { limit: 1 } }),
                    api.get('/maintenance', { params: { limit: 1 } }),
                ]);

                setStats({
                    branchAssets:
                        assetsRes.status === 'fulfilled'
                            ? assetsRes.value.data.pagination?.total || 0
                            : 0,
                    myTicketsToday:
                        ticketsRes.status === 'fulfilled'
                            ? ticketsRes.value.data.pagination?.total || 0
                            : 0,
                    lowStockItems: 18,
                    recentTransactions: 42,
                });
            } catch {
                // Keep defaults
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    Staff Dashboard
                </h1>
                <p className="text-[var(--text-secondary)] text-sm mt-1">
                    Your daily operations overview
                </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Branch Assets"
                    value={stats.branchAssets.toLocaleString()}
                    icon={Package}
                    color="blue"
                    loading={loading}
                />
                <StatCard
                    title="Open Tickets"
                    value={stats.myTicketsToday.toString()}
                    icon={Wrench}
                    color="orange"
                    loading={loading}
                />
                <StatCard
                    title="Low Stock Items"
                    value={stats.lowStockItems.toString()}
                    icon={AlertTriangle}
                    color="red"
                    loading={loading}
                />
                <StatCard
                    title="Recent Transactions"
                    value={stats.recentTransactions.toString()}
                    icon={ClipboardList}
                    color="green"
                    loading={loading}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardChart
                    title="Weekly Activity"
                    data={weeklyActivity}
                    type="bar"
                    colors={['var(--primary)']}
                    loading={loading}
                />
                <DashboardChart
                    title="Inventory Status"
                    data={inventoryStatus}
                    type="pie"
                    loading={loading}
                />
            </div>

            {/* Quick Actions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <QuickActions />
            </motion.div>
        </div>
    );
});

export default StaffDashboard;

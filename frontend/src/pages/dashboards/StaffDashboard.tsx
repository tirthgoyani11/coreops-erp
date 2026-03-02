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
    openTickets: number;
    lowStockItems: number;
    totalInventory: number;
}

export const StaffDashboard = memo(function StaffDashboard() {
    const [stats, setStats] = useState<StaffStats>({
        branchAssets: 0,
        openTickets: 0,
        lowStockItems: 0,
        totalInventory: 0,
    });
    const [loading, setLoading] = useState(true);
    const [assetCategoryData, setAssetCategoryData] = useState<{ name: string; value: number }[]>([]);
    const [inventoryData, setInventoryData] = useState<{ name: string; value: number }[]>([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const [dashRes, categoryRes, inventoryRes] = await Promise.allSettled([
                    api.get('/analytics/dashboard'),
                    api.get('/analytics/assets/by-category'),
                    api.get('/analytics/inventory/status'),
                ]);

                // Dashboard stats
                if (dashRes.status === 'fulfilled' && dashRes.value.data?.data) {
                    const d = dashRes.value.data.data;
                    setStats({
                        branchAssets: d.assets?.total || 0,
                        openTickets: d.maintenance?.openTickets || 0,
                        lowStockItems: d.inventory?.lowStock || 0,
                        totalInventory: d.inventory?.total || 0,
                    });
                }

                // Asset by category chart
                if (categoryRes.status === 'fulfilled' && categoryRes.value.data?.data) {
                    setAssetCategoryData(
                        categoryRes.value.data.data.map((c: any) => ({ name: c.id, value: c.count }))
                    );
                }

                // Inventory chart
                if (inventoryRes.status === 'fulfilled' && inventoryRes.value.data?.data) {
                    const inv = inventoryRes.value.data.data;
                    setInventoryData(
                        inv.byType?.map((t: any) => ({ name: t.id, value: t.totalQuantity })) || []
                    );
                }
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
                    value={stats.openTickets.toString()}
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
                    title="Inventory Items"
                    value={stats.totalInventory.toString()}
                    icon={ClipboardList}
                    color="green"
                    loading={loading}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardChart
                    title="Assets by Category"
                    data={assetCategoryData}
                    type="bar"
                    colors={['var(--primary)']}
                    loading={loading}
                />
                <DashboardChart
                    title="Inventory by Type"
                    data={inventoryData}
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

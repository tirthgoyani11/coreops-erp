import { useState, useEffect, memo } from 'react';
import type { ComponentType } from 'react';
import { motion } from 'framer-motion';
import {
    Package,
    Wrench,
    BarChart3,
    Download,
    FileSpreadsheet,
    FileText,
} from 'lucide-react';
import { StatCard } from '../../components/dashboard/StatCard';
import { DashboardChart } from '../../components/dashboard/DashboardChart';
import api from '../../lib/api';

interface ViewerStats {
    totalAssets: number;
    maintenanceTickets: number;
    inventoryItems: number;
}

// Export button component
const ExportButton = memo(function ExportButton({
    icon: Icon,
    label,
    format
}: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    format: string;
}) {
    return (
        <button className="flex items-center gap-3 p-4 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-card-hover)] hover:border-[var(--primary)]/30 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center group-hover:bg-[var(--primary)]/20 transition-colors">
                <Icon className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div className="text-left">
                <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                <p className="text-xs text-[var(--text-secondary)]">{format}</p>
            </div>
        </button>
    );
});

// Main Viewer Dashboard
export const ViewerDashboard = memo(function ViewerDashboard() {
    const [stats, setStats] = useState<ViewerStats>({
        totalAssets: 0,
        maintenanceTickets: 0,
        inventoryItems: 0,
    });
    const [loading, setLoading] = useState(true);
    const [assetCategoryData, setAssetCategoryData] = useState<{ name: string; value: number }[]>([]);
    const [maintenanceTrendData, setMaintenanceTrendData] = useState<{ name: string; value: number }[]>([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const [dashRes, categoryRes, trendsRes] = await Promise.allSettled([
                    api.get('/analytics/dashboard'),
                    api.get('/analytics/assets/by-category'),
                    api.get('/analytics/maintenance/trends?months=4'),
                ]);

                // Dashboard stats
                if (dashRes.status === 'fulfilled' && dashRes.value.data?.data) {
                    const d = dashRes.value.data.data;
                    setStats({
                        totalAssets: d.assets?.total || 0,
                        maintenanceTickets: d.maintenance?.openTickets || 0,
                        inventoryItems: d.inventory?.total || 0,
                    });
                }

                // Asset by category chart
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
                            value: t.ticketCount,
                        }))
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
        <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">Reports Dashboard</h1>
                    <p className="text-[var(--text-secondary)] mt-1">View-only access • Data as of today</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-medium text-blue-400">Read Only</span>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    title="Total Assets"
                    value={stats.totalAssets.toLocaleString()}
                    icon={Package}
                    color="primary"
                    loading={loading}
                />
                <StatCard
                    title="Active Maintenance"
                    value={stats.maintenanceTickets}
                    icon={Wrench}
                    color="blue"
                    loading={loading}
                />
                <StatCard
                    title="Inventory Items"
                    value={stats.inventoryItems.toLocaleString()}
                    icon={BarChart3}
                    color="orange"
                    loading={loading}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardChart
                    type="pie"
                    data={assetCategoryData}
                    title="Assets by Category"
                    loading={loading}
                />
                <DashboardChart
                    type="line"
                    data={maintenanceTrendData}
                    title="Maintenance Ticket Trend"
                    loading={loading}
                />
            </div>

            {/* Export Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6"
            >
                <div className="flex items-center gap-3 mb-4">
                    <Download className="w-5 h-5 text-[var(--primary)]" />
                    <h3 className="text-[var(--text-primary)] font-medium">Export Reports</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <ExportButton
                        icon={FileSpreadsheet}
                        label="Asset Report"
                        format="Excel (.xlsx)"
                    />
                    <ExportButton
                        icon={FileText}
                        label="Maintenance Summary"
                        format="PDF (.pdf)"
                    />
                    <ExportButton
                        icon={FileSpreadsheet}
                        label="Inventory Status"
                        format="CSV (.csv)"
                    />
                </div>
            </motion.div>

            {/* Info Notice */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 text-sm">ℹ️</span>
                </div>
                <div>
                    <p className="text-sm text-blue-300 font-medium">View-Only Access</p>
                    <p className="text-xs text-blue-400/70 mt-0.5">
                        You have viewer permissions. To request edit access, contact your administrator.
                    </p>
                </div>
            </div>
        </div>
    );
});

export default ViewerDashboard;

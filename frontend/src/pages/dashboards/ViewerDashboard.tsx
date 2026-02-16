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

// Summary data
const assetByTypeData = [
    { name: 'IT Equipment', value: 420 },
    { name: 'Furniture', value: 280 },
    { name: 'Vehicles', value: 85 },
    { name: 'Machinery', value: 165 },
    { name: 'Other', value: 50 },
];

const ticketTrendData = [
    { name: 'Mon', value: 12 },
    { name: 'Tue', value: 19 },
    { name: 'Wed', value: 15 },
    { name: 'Thu', value: 22 },
    { name: 'Fri', value: 18 },
    { name: 'Sat', value: 8 },
    { name: 'Sun', value: 5 },
];

// Main Viewer Dashboard
export const ViewerDashboard = memo(function ViewerDashboard() {
    const [stats, _setStats] = useState<ViewerStats>({
        totalAssets: 1000,
        maintenanceTickets: 87,
        inventoryItems: 2458,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => setLoading(false), 800);
        return () => clearTimeout(timer);
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
                    data={assetByTypeData}
                    title="Assets by Category"
                    loading={loading}
                />
                <DashboardChart
                    type="line"
                    data={ticketTrendData}
                    title="Weekly Ticket Trend"
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

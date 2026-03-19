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
    BellRing
} from 'lucide-react';
import { StatCard } from '../../components/dashboard/StatCard';
import { DashboardChart } from '../../components/dashboard/DashboardChart';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { Skeleton } from '../../components/ui/Skeleton';
import { RecentActivity } from '../../components/dashboard/RecentActivity';
import { DraggableWidget } from '../../components/dashboards/DraggableWidget';
import { KpiAlertsModal } from '../../components/dashboards/KpiAlertsModal';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';


// ... (skipping unchanged ApprovalItem and typeConfig definitions down to line 75) ...
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
    totalAssetPurchaseValue: number;
    activeTickets: number;
    pendingApprovals: number;
    totalInventory: number;
    lowStock: number;
    totalVendors: number;
    monthlyIncome: number;
    monthlyExpense: number;
}

export const AdminDashboard = memo(function AdminDashboard() {
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
    const [isEditMode, setIsEditMode] = useState(false);
    const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
    
    // New granular layout
    const defaultLayout = [
        'stat-assets', 'stat-tickets', 'stat-approvals', 'stat-value',
        'stat-inventory', 'stat-lowstock', 'stat-vendors', 'stat-activeassets',
        'chart-assets', 'chart-maintenance', 'chart-inventory',
        'activity-log', 'approval-queue', 'quick-actions'
    ];
    const [layout, setLayout] = useState(defaultLayout);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                const [dashboardRes, categoryRes, trendsRes, inventoryRes, approvalsRes, userRes] = await Promise.allSettled([
                    api.get('/analytics/dashboard'),
                    api.get('/analytics/assets/by-category'),
                    api.get('/analytics/maintenance/trends?months=6'),
                    api.get('/analytics/inventory/status'),
                    api.get('/analytics/pending-approvals?limit=8'),
                    api.get('/users/me')
                ]);

                if (userRes.status === 'fulfilled' && userRes.value.data?.data?.preferences) {
                    if (Array.isArray(userRes.value.data.data.preferences)) {
                         setLayout(userRes.value.data.data.preferences);
                    }
                }

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

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            setLayout((items) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over.id);
                const newLayout = [...items];
                newLayout.splice(oldIndex, 1);
                newLayout.splice(newIndex, 0, active.id);
                return newLayout;
            });
        }
    };

    const saveLayout = async () => {
        try {
            await api.put('/users/me/dashboard', { preferences: layout });
            setIsEditMode(false);
        } catch (error) {
            console.error('Failed to save layout:', error);
        }
    };


    const WIDGETS: Record<string, { span: string, label: string, element: React.JSX.Element }> = {
        'stat-assets': { span: 'col-span-1 sm:col-span-2 lg:col-span-3', label: 'Total Assets', element: <StatCard title="Total Assets" value={stats.totalAssets} icon={Package} color="primary" loading={loading} /> },
        'stat-tickets': { span: 'col-span-1 sm:col-span-2 lg:col-span-3', label: 'Active Tickets', element: <StatCard title="Active Tickets" value={stats.activeTickets} icon={Wrench} color="blue" loading={loading} /> },
        'stat-approvals': { span: 'col-span-1 sm:col-span-2 lg:col-span-3', label: 'Pending Approvals', element: <StatCard title="Pending Approvals" value={stats.pendingApprovals} icon={ClipboardCheck} color="orange" loading={loading} /> },
        'stat-value': { span: 'col-span-1 sm:col-span-2 lg:col-span-3', label: 'Asset Book Value', element: <StatCard title="Asset Book Value" value={formatCurrency(stats.totalAssetValue)} subtitle={`Cost: ${formatCurrency(stats.totalAssetPurchaseValue)}`} icon={DollarSign} color="green" loading={loading} /> },

        'stat-inventory': { span: 'col-span-1 sm:col-span-2 lg:col-span-3 h-full', label: 'Total Inventory', element: (
            loading ? <Skeleton variant="card" className="h-full" /> : 
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 h-full flex flex-col justify-center min-h-[90px]">
                <p className="text-xs text-[var(--text-secondary)] mb-1">Inventory Items</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">{stats.totalInventory}</p>
            </div>
        )},
        'stat-lowstock': { span: 'col-span-1 sm:col-span-2 lg:col-span-3 h-full', label: 'Low Stock', element: (
            loading ? <Skeleton variant="card" className="h-full" /> : 
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 h-full flex flex-col justify-center min-h-[90px]">
                <div className="flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <p className="text-xs text-[var(--text-secondary)]">Low Stock</p>
                </div>
                <p className="text-xl font-bold text-amber-400">{stats.lowStock}</p>
            </div>
        )},
        'stat-vendors': { span: 'col-span-1 sm:col-span-2 lg:col-span-3 h-full', label: 'Total Vendors', element: (
             loading ? <Skeleton variant="card" className="h-full" /> : 
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 h-full flex flex-col justify-center min-h-[90px]">
                <p className="text-xs text-[var(--text-secondary)] mb-1">Vendors</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">{stats.totalVendors}</p>
            </div>
        )},
        'stat-activeassets': { span: 'col-span-1 sm:col-span-2 lg:col-span-3 h-full', label: 'Active Assets', element: (
             loading ? <Skeleton variant="card" className="h-full" /> : 
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 h-full flex flex-col justify-center min-h-[90px]">
                <p className="text-xs text-[var(--text-secondary)] mb-1">Active Assets</p>
                <p className="text-xl font-bold text-emerald-400">{stats.activeAssets}</p>
            </div>
        )},

        'chart-assets': { span: 'col-span-1 lg:col-span-4 max-h-[400px]', label: 'Assets Chart', element: <DashboardChart type="pie" data={assetCategoryData} title="Assets by Category" loading={loading} /> },
        'chart-maintenance': { span: 'col-span-1 lg:col-span-4 max-h-[400px]', label: 'Maintenance Trend Chart', element: <DashboardChart type="area" data={maintenanceTrendData} title="Monthly Maintenance Costs" loading={loading} /> },
        'chart-inventory': { span: 'col-span-1 lg:col-span-4 max-h-[400px]', label: 'Inventory Chart', element: <DashboardChart type="bar" data={inventoryData} title="Inventory by Type" loading={loading} /> },

        'activity-log': { span: 'col-span-1 lg:col-span-8', label: 'Activity Log', element: <div className="text-white h-full"><RecentActivity /></div> },
        'approval-queue': { span: 'col-span-1 lg:col-span-4', label: 'Approval Queue', element: (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 h-full flex flex-col">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[var(--text-primary)] font-medium">Approval Queue</h3>
                    <span className="text-xs text-[var(--text-secondary)]">
                        {approvals.length} pending
                    </span>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {approvals.length === 0 ? (
                        <div className="text-center py-6 text-[var(--text-secondary)] my-auto h-full flex flex-col justify-center">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No pending approvals</p>
                        </div>
                    ) : (
                        approvals.slice(0, 5).map((item) => {
                            const cfg = typeConfig[item.type] || typeConfig.MAINTENANCE;
                            const TypeIcon = cfg.icon;
                            return (
                                <div key={item.id} className="p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-color)]">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.color}`}>
                                            <TypeIcon className="w-3 h-3" />
                                            {cfg.label}
                                        </span>
                                        <span className="text-xs font-mono text-[var(--primary)]">#{item.number}</span>
                                    </div>
                                    <p className="text-sm text-[var(--text-primary)] font-medium truncate">{item.title}</p>
                                </div>
                            );
                        })
                    )}
                </div>
            </motion.div>
        )},
        'quick-actions': { span: 'col-span-1 lg:col-span-12', label: 'Quick Actions', element: <QuickActions /> },
    };

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto pb-24">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">Admin Dashboard</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Enterprise overview and system metrics</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <button onClick={() => setIsAlertsModalOpen(true)} className="px-4 py-2 border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] rounded-lg font-medium transition-colors flex items-center gap-2">
                        <BellRing className="w-4 h-4" />
                        Alerts
                    </button>
                    {isEditMode ? (
                        <>
                            <button onClick={saveLayout} className="px-4 py-2 bg-[var(--primary)] text-black rounded-lg font-bold">Save Layout</button>
                            <button onClick={() => setIsEditMode(false)} className="px-4 py-2 bg-[var(--bg-card-hover)] text-[var(--text-primary)] rounded-lg font-medium">Cancel</button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditMode(true)} className="px-4 py-2 border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] rounded-lg font-medium transition-colors">
                            Customize Layout
                        </button>
                    )}
                    <div className="flex items-center gap-2 ml-4">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[var(--text-secondary)]">Live</span>
                    </div>
                </div>
            </div>

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={layout} strategy={verticalListSortingStrategy}>
                    <div className="space-y-6 flex flex-col">
                        {layout.map((id) => (
                            <DraggableWidget key={id} id={id} isEditMode={isEditMode}>
                                {WIDGETS[id]?.element}
                            </DraggableWidget>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            <KpiAlertsModal isOpen={isAlertsModalOpen} onClose={() => setIsAlertsModalOpen(false)} />
        </div>
    );
});

export default AdminDashboard;

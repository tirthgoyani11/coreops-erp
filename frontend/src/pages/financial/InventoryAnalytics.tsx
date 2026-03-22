import { useState, useEffect } from 'react';
import { apiGet, getErrorMessage } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    Package, TrendingDown, AlertTriangle, BarChart3, Loader2,
    AlertCircle, RefreshCw, Box, Brain, Sparkles, ShieldAlert, WandSparkles
} from 'lucide-react';
import api from '../../lib/api';
import { Link } from 'react-router-dom';

interface ReorderItem {
    id: string; name: string; sku: string; type: string;
    currentQuantity: number; avgDailyConsumption: number;
    recommendedReorderPoint: number; recommendedReorderQty: number;
    currentReorderPoint: number; status: string; needsUpdate: boolean;
}
interface ConsumptionData {
    totalMovements: number; totalQuantityConsumed: number; totalValueConsumed: number;
    categoryBreakdown: { category: string; totalQuantity: number; totalValue: number; uniqueItems: number }[];
    topConsumers: { id: string; name: string; sku: string; category: string; totalQuantity: number; totalValue: number }[];
}

interface InventoryOverview {
    summary: {
        totalItems: number;
        totalUnits: number;
        lowStockCount: number;
        outOfStockCount: number;
        movementCount30Days: number;
        consumptionUnits30Days: number;
    };
    topRiskItems: Array<{
        id: string;
        name: string;
        sku: string;
        shortage: number;
        recommendedOrderQty: number;
    }>;
}

interface InventoryInsights {
    source: string;
    headline: string;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendations: string[];
}

function fmt(n: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
}

const STATUS_STYLES: Record<string, string> = {
    REORDER_NOW: 'bg-red-500/15 text-red-400 border-red-500/30',
    LOW: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    OK: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

export function InventoryAnalytics() {
    const [reorderData, setReorderData] = useState<{ recommendations: ReorderItem[]; summary: any } | null>(null);
    const [consumption, setConsumption] = useState<ConsumptionData | null>(null);
    const [overview, setOverview] = useState<InventoryOverview | null>(null);
    const [insights, setInsights] = useState<InventoryInsights | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'orchestrator' | 'reorder' | 'consumption'>('orchestrator');
    const [actionBusyById, setActionBusyById] = useState<Record<string, boolean>>({});
    const [actionMessage, setActionMessage] = useState('');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [reorderRes, consumptionRes, overviewRes, insightsRes] = await Promise.allSettled([
                apiGet<{ success: boolean; data: { recommendations: ReorderItem[]; summary: Record<string, number> } }>('/inventory/reorder-calc'),
                apiGet<{ success: boolean; data: ConsumptionData }>('/inventory/consumption-report'),
                apiGet<{ success: boolean; data: InventoryOverview }>('/inventory/overview'),
                apiGet<{ success: boolean; data: InventoryInsights }>('/inventory/insights'),
            ]);

            if (reorderRes.status === 'fulfilled' && reorderRes.value.success) {
                setReorderData(reorderRes.value.data);
            } else {
                setReorderData(null);
            }

            if (consumptionRes.status === 'fulfilled' && consumptionRes.value.success) {
                setConsumption(consumptionRes.value.data);
            }

            if (overviewRes.status === 'fulfilled' && overviewRes.value.success) {
                setOverview(overviewRes.value.data);
            }

            if (insightsRes.status === 'fulfilled' && insightsRes.value.success) {
                setInsights(insightsRes.value.data);
            }

            if (reorderRes.status === 'rejected') {
                setError('Advanced reorder intelligence is not available for this role. Showing orchestrator and consumption views.');
            } else {
                setError('');
            }
        } catch (e) { setError(getErrorMessage(e)); }
        setLoading(false);
    };

    const runReorderAction = async (id: string, action: 'reorder' | 'fix') => {
        try {
            setActionBusyById((prev) => ({ ...prev, [id]: true }));
            const endpoint = action === 'reorder' ? `/inventory/${id}/reorder` : `/inventory/${id}/fix-reorder-point`;
            const res = await api.post(endpoint, {});
            if (res.data?.success) {
                setActionMessage(action === 'reorder' ? 'Reorder draft created from analytics.' : 'Reorder point synced from analytics.');
                void fetchAll();
                setTimeout(() => setActionMessage(''), 5000);
            }
        } catch (e) {
            setActionMessage(getErrorMessage(e));
            setTimeout(() => setActionMessage(''), 6000);
        } finally {
            setActionBusyById((prev) => ({ ...prev, [id]: false }));
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Inventory Analytics</h1>
                    <p className="text-sm text-[var(--text-secondary)]">Reorder intelligence · Consumption analytics · Demand forecast</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
            </div>

            {/* Tab Bar */}
            <div className="flex bg-[var(--bg-card)] border border-[var(--border-color)] p-1 rounded-lg">
                {[
                    { id: 'orchestrator' as const, label: 'AI Orchestrator', icon: Brain },
                    { id: 'reorder' as const, label: 'Reorder Points', icon: AlertTriangle },
                    { id: 'consumption' as const, label: 'Consumption', icon: BarChart3 },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${activeTab === tab.id
                            ? 'bg-[var(--primary)] text-black shadow-[0_0_10px_var(--primary-glow)] font-semibold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                ))}
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
            {actionMessage && <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-2 text-emerald-300 text-sm"><Sparkles className="w-4 h-4" /> {actionMessage}</div>}

            {/* ORCHESTRATOR TAB */}
            {activeTab === 'orchestrator' && (
                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                                        <Brain className="w-4 h-4 text-[var(--primary)]" />
                                        Central AI Inventory Orchestrator
                                    </p>
                                    <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">
                                        {insights?.headline || 'Inventory control is stable. Focus on risk consolidation and faster replenishment execution.'}
                                    </p>
                                </div>
                                <span className="text-xs px-2 py-1 rounded-full border border-[var(--border-color)] text-[var(--text-secondary)]">
                                    {insights?.urgency || 'LOW'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                                {(insights?.recommendations?.slice(0, 3) || [
                                    'Resolve top stock shortages before next maintenance cycle.',
                                    'Re-balance inter-office stock before raising urgent POs.',
                                    'Escalate critical shortages into exception-center workflow.',
                                ]).map((rec) => (
                                    <div key={rec} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-hover)] p-3 text-sm text-[var(--text-secondary)] flex items-start gap-2">
                                        <WandSparkles className="w-4 h-4 text-[var(--primary)] mt-0.5" />
                                        {rec}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <StatCard label="Total SKUs" value={overview?.summary.totalItems || 0} icon={Package} color="text-blue-400" bg="bg-blue-500/10" border="border-blue-500/30" />
                        <StatCard label="Total Units" value={overview?.summary.totalUnits || 0} icon={Box} color="text-indigo-400" bg="bg-indigo-500/10" border="border-indigo-500/30" />
                        <StatCard label="Low Stock" value={overview?.summary.lowStockCount || 0} icon={AlertTriangle} color="text-red-400" bg="bg-red-500/10" border="border-red-500/30" />
                        <StatCard label="30d Consumption" value={overview?.summary.consumptionUnits30Days || 0} icon={TrendingDown} color="text-orange-400" bg="bg-orange-500/10" border="border-orange-500/30" />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center justify-between">
                                <span>Top Risk Queue</span>
                                <Link
                                    to="/finance/exception-center?module=inventory_orchestrator"
                                    className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                >
                                    <ShieldAlert className="w-3 h-3" /> Exception Center
                                </Link>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--border-color)]">
                                            <th className="text-left p-4 text-[var(--text-secondary)]">Item</th>
                                            <th className="text-left p-4 text-[var(--text-secondary)]">SKU</th>
                                            <th className="text-right p-4 text-[var(--text-secondary)]">Shortage</th>
                                            <th className="text-right p-4 text-[var(--text-secondary)]">Recommended</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(overview?.topRiskItems || []).slice(0, 10).map((item) => (
                                            <tr key={item.id} className="border-b border-[var(--border-color)]/30 hover:bg-[var(--bg-card-hover)]">
                                                <td className="p-4 text-[var(--text-primary)] font-medium">{item.name}</td>
                                                <td className="p-4 font-mono text-xs text-[var(--primary)]">{item.sku}</td>
                                                <td className="p-4 text-right text-red-300 font-semibold">{item.shortage}</td>
                                                <td className="p-4 text-right text-[var(--text-primary)]">{item.recommendedOrderQty}</td>
                                            </tr>
                                        ))}
                                        {(!overview?.topRiskItems || overview.topRiskItems.length === 0) && (
                                            <tr><td colSpan={4} className="p-8 text-center text-[var(--text-secondary)]">No active risk queue</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* REORDER TAB */}
            {activeTab === 'reorder' && reorderData && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StatCard label="Total Items" value={reorderData.summary.total} icon={Package} color="text-blue-400" bg="bg-blue-500/10" border="border-blue-500/30" />
                        <StatCard label="Reorder Now" value={reorderData.summary.reorderNow} icon={AlertTriangle} color="text-red-400" bg="bg-red-500/10" border="border-red-500/30" />
                        <StatCard label="Low Stock" value={reorderData.summary.lowStock} icon={TrendingDown} color="text-yellow-400" bg="bg-yellow-500/10" border="border-yellow-500/30" />
                        <StatCard label="Needs Update" value={reorderData.summary.needsConfigUpdate} icon={RefreshCw} color="text-purple-400" bg="bg-purple-500/10" border="border-purple-500/30" />
                    </div>

                    {/* Reorder Table */}
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--border-color)]">
                                            <th className="text-left p-4 text-[var(--text-secondary)]">Item</th>
                                            <th className="text-left p-4 text-[var(--text-secondary)]">SKU</th>
                                            <th className="text-right p-4 text-[var(--text-secondary)]">Stock</th>
                                            <th className="text-right p-4 text-[var(--text-secondary)]">Avg/Day</th>
                                            <th className="text-right p-4 text-[var(--text-secondary)]">Reorder Pt</th>
                                            <th className="text-right p-4 text-[var(--text-secondary)]">Recommended</th>
                                            <th className="text-center p-4 text-[var(--text-secondary)]">Status</th>
                                            <th className="text-right p-4 text-[var(--text-secondary)]">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reorderData.recommendations
                                            .sort((a, b) => {
                                                const order = { REORDER_NOW: 0, LOW: 1, OK: 2 };
                                                return (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3);
                                            })
                                            .map(item => (
                                                <tr key={item.id} className="border-b border-[var(--border-color)]/30 hover:bg-[var(--bg-card-hover)]">
                                                    <td className="p-4 text-[var(--text-primary)] font-medium">{item.name}</td>
                                                    <td className="p-4 font-mono text-xs text-[var(--primary)]">{item.sku}</td>
                                                    <td className={`p-4 text-right font-semibold ${item.status === 'REORDER_NOW' ? 'text-red-400' : item.status === 'LOW' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                                        {item.currentQuantity}
                                                    </td>
                                                    <td className="p-4 text-right text-[var(--text-secondary)]">{item.avgDailyConsumption}</td>
                                                    <td className="p-4 text-right text-[var(--text-secondary)]">{item.currentReorderPoint ?? '—'}</td>
                                                    <td className="p-4 text-right">
                                                        <span className={`font-semibold ${item.needsUpdate ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>
                                                            {item.recommendedReorderPoint}
                                                        </span>
                                                        {item.needsUpdate && <span className="ml-1 text-xs text-[var(--primary)]">↑</span>}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[item.status] || ''}`}>
                                                            {item.status.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="inline-flex gap-2">
                                                            <button
                                                                onClick={() => runReorderAction(item.id, 'reorder')}
                                                                disabled={!!actionBusyById[item.id]}
                                                                className="px-2.5 py-1 text-xs rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60"
                                                            >
                                                                Reorder
                                                            </button>
                                                            {item.needsUpdate && (
                                                                <button
                                                                    onClick={() => runReorderAction(item.id, 'fix')}
                                                                    disabled={!!actionBusyById[item.id]}
                                                                    className="px-2.5 py-1 text-xs rounded border border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--primary)]/10 disabled:opacity-60"
                                                                >
                                                                    Sync Point
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeTab === 'reorder' && !reorderData && (
                <Card>
                    <CardContent className="p-8 text-center text-[var(--text-secondary)]">
                        Reorder intelligence is restricted for this role. Use AI Orchestrator and Consumption tabs for operational insight.
                    </CardContent>
                </Card>
            )}

            {/* CONSUMPTION TAB */}
            {activeTab === 'consumption' && consumption && (
                <div className="space-y-6">
                    {/* Top-level Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card variant="glass">
                            <CardContent className="p-5">
                                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Movements</p>
                                <p className="text-2xl font-bold text-[var(--primary)] mt-1">{consumption.totalMovements}</p>
                            </CardContent>
                        </Card>
                        <Card variant="glass">
                            <CardContent className="p-5">
                                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Qty Consumed</p>
                                <p className="text-2xl font-bold text-red-400 mt-1">{consumption.totalQuantityConsumed}</p>
                            </CardContent>
                        </Card>
                        <Card variant="glass">
                            <CardContent className="p-5">
                                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Total Value</p>
                                <p className="text-2xl font-bold text-orange-400 mt-1">{fmt(consumption.totalValueConsumed)}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Category Breakdown */}
                    <Card>
                        <CardHeader><CardTitle className="text-base">Consumption by Category</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {consumption.categoryBreakdown.map((cat, i) => {
                                    const pct = consumption.totalValueConsumed > 0 ? (cat.totalValue / consumption.totalValueConsumed * 100) : 0;
                                    return (
                                        <div key={i} className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[var(--text-primary)] font-medium flex items-center gap-2">
                                                    <Box className="w-3 h-3 text-[var(--primary)]" /> {cat.category}
                                                    <span className="text-xs text-[var(--text-secondary)]">({cat.uniqueItems} items)</span>
                                                </span>
                                                <span className="font-semibold text-[var(--text-primary)]">{fmt(cat.totalValue)}</span>
                                            </div>
                                            <div className="h-2 bg-[var(--bg-card)] rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary)]/50 rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%` }} />
                                            </div>
                                            <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                                                <span>Qty: {cat.totalQuantity}</span>
                                                <span>{pct.toFixed(1)}% of total</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {consumption.categoryBreakdown.length === 0 && (
                                    <p className="text-center text-[var(--text-secondary)] text-sm py-6">No consumption data in this period</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Consumers */}
                    <Card>
                        <CardHeader><CardTitle className="text-base">Top 10 Consumers (by Value)</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--border-color)]">
                                            <th className="text-left p-4 text-[var(--text-secondary)]">#</th>
                                            <th className="text-left p-4 text-[var(--text-secondary)]">Item</th>
                                            <th className="text-left p-4 text-[var(--text-secondary)]">SKU</th>
                                            <th className="text-left p-4 text-[var(--text-secondary)]">Category</th>
                                            <th className="text-right p-4 text-[var(--text-secondary)]">Qty Used</th>
                                            <th className="text-right p-4 text-[var(--text-secondary)]">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {consumption.topConsumers.map((item, i) => (
                                            <tr key={item.id} className="border-b border-[var(--border-color)]/30 hover:bg-[var(--bg-card-hover)]">
                                                <td className="p-4 text-[var(--primary)] font-bold">{i + 1}</td>
                                                <td className="p-4 text-[var(--text-primary)] font-medium">{item.name}</td>
                                                <td className="p-4 font-mono text-xs text-[var(--primary)]">{item.sku}</td>
                                                <td className="p-4 text-[var(--text-secondary)]">{item.category}</td>
                                                <td className="p-4 text-right text-[var(--text-primary)]">{item.totalQuantity}</td>
                                                <td className="p-4 text-right font-semibold text-orange-400">{fmt(item.totalValue)}</td>
                                            </tr>
                                        ))}
                                        {consumption.topConsumers.length === 0 && (
                                            <tr><td colSpan={6} className="p-8 text-center text-[var(--text-secondary)]">No consumption data</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, bg, border }: {
    label: string; value: number; icon: any; color: string; bg: string; border: string;
}) {
    return (
        <Card variant="glass">
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">{label}</p>
                        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

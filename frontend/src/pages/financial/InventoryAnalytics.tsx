import { useState, useEffect } from 'react';
import { apiGet, getErrorMessage } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    Package, TrendingDown, AlertTriangle, BarChart3, Loader2,
    AlertCircle, RefreshCw, Box
} from 'lucide-react';

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'reorder' | 'consumption' | 'forecast'>('reorder');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [reorderRes, consumptionRes] = await Promise.all([
                apiGet<any>('/inventory/reorder-calc'),
                apiGet<any>('/inventory/consumption-report'),
            ]);
            setReorderData(reorderRes.data);
            setConsumption(consumptionRes.data);
        } catch (e) { setError(getErrorMessage(e)); }
        setLoading(false);
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
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
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

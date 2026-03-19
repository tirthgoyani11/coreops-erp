import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../hooks/useToast';
import {
    Plus,
    Search,
    Package,
    ArrowUpRight,
    AlertTriangle,
    Brain,
    Loader2,
} from 'lucide-react';

// Components
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { PageHeader } from '../components/ui/PageHeader';

// Views
import { InventoryTableView } from '../components/inventory/InventoryTableView';

export function Inventory() {
    const { hasPermission } = useAuthStore();
    const navigate = useNavigate();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('products'); // products | spares
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        category: 'all',
        stockStatus: 'all' // all, low_stock, out_of_stock
    });
    const [overview, setOverview] = useState<any>(null);
    const [insights, setInsights] = useState<any>(null);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [reorderingRiskId, setReorderingRiskId] = useState<string | null>(null);

    const loadInventoryIntelligence = async () => {
        setOverviewLoading(true);
        try {
            const [overviewRes, insightsRes] = await Promise.all([
                api.get('/inventory/overview'),
                api.get('/inventory/insights'),
            ]);

            if (overviewRes.data?.success) {
                setOverview(overviewRes.data.data);
            }
            if (insightsRes.data?.success) {
                setInsights(insightsRes.data.data);
            }
        } catch (error) {
            console.error('Failed to load inventory intelligence:', error);
            toast.error('Failed to load inventory analytics');
        } finally {
            setOverviewLoading(false);
        }
    };

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('type', activeTab === 'products' ? 'PRODUCT' : 'SPARE');
            if (filters.stockStatus === 'low_stock') params.append('lowStock', 'true');

            const res = await api.get(`/inventory?${params.toString()}`);
            let data = res.data.data || [];

            // Client-side filter for out_of_stock and in_stock
            if (filters.stockStatus === 'out_of_stock') {
                data = data.filter((item: any) => item.currentQuantity === 0);
            } else if (filters.stockStatus === 'in_stock') {
                data = data.filter((item: any) => item.currentQuantity > item.reorderPoint);
            }

            setItems(data);

            // Also fetch stats if needed (or separate endpoint)
            // For now, let's assume `inventory/stats` exists or we calculate locally
            // const statsRes = await api.get('/inventory/stats');
            // setStats(statsRes.data.data);

        } catch (error) {
            console.error('Failed to load inventory:', error);
            toast.error('Failed to load inventory items');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, [activeTab, filters.stockStatus]);

    useEffect(() => {
        loadInventoryIntelligence();
    }, []);
    // Search is client-side filtered for responsiveness on small datasets, 
    // or debounced server-side. for MVP, client-filter.

    const filteredItems = items.filter((item: any) =>
        item.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        (item.sku || '').toLowerCase().includes(filters.search.toLowerCase())
    );

    const valuationLabel = overview?.summary?.valuationByCurrency
        ? Object.entries(overview.summary.valuationByCurrency)
            .map(([currency, amount]) => `${currency} ${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`)
            .join(' | ')
        : '-';

    const handleTopRiskReorder = async (risk: any) => {
        setReorderingRiskId(risk.id);
        try {
            await api.post(`/inventory/${risk.id}/reorder`, {
                quantity: risk.recommendedOrderQty,
            });
            toast.success(`Reordered ${risk.sku} (+${risk.recommendedOrderQty})`);
            await Promise.all([fetchInventory(), loadInventoryIntelligence()]);
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Failed to reorder item';
            toast.error(msg);
        } finally {
            setReorderingRiskId(null);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Inventory Management"
                subtitle="Track products, spare parts, and stock levels"
                icon={Package}
                actions={
                    hasPermission('inventory.create') && (
                        <>
                            <Button variant="outline" onClick={() => navigate('/inventory/operations')}>
                                <ArrowUpRight className="w-4 h-4 mr-2" />
                                Stock Op
                            </Button>
                            <Button onClick={() => navigate('/inventory/new')}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Item
                            </Button>
                        </>
                    )
                }
            />

            {/* Controls */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                        <TabsList>
                            <TabsTrigger value="products">
                                <Package className="w-4 h-4 mr-2" />
                                Products
                            </TabsTrigger>
                            <TabsTrigger value="spares">
                                <WrenchIcon className="w-4 h-4 mr-2" />
                                Spare Parts
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search SKU, Name..."
                                className="pl-9"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>
                        <Select
                            value={filters.stockStatus}
                            onValueChange={(val: string) => setFilters({ ...filters, stockStatus: val })}
                        >
                            <SelectTrigger className="w-full sm:w-40">
                                <SelectValue placeholder="Stock Level" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Levels</SelectItem>
                                <SelectItem value="low_stock">Low Stock</SelectItem>
                                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                                <SelectItem value="in_stock">In Stock</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Card>

            {/* Intelligence Layer */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Card className="p-4 xl:col-span-2 border border-[var(--border-color)] bg-[var(--bg-card)]">
                    {overviewLoading ? (
                        <div className="flex items-center justify-center h-36">
                            <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-semibold text-[var(--text-primary)]">Inventory Operations Pulse</h3>
                                <Button variant="outline" size="sm" onClick={() => { fetchInventory(); loadInventoryIntelligence(); }}>
                                    Refresh
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3">
                                    <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Total SKUs</div>
                                    <div className="text-xl font-bold text-[var(--text-primary)] mt-1">{overview?.summary?.totalItems ?? 0}</div>
                                </div>
                                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3">
                                    <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Total Units</div>
                                    <div className="text-xl font-bold text-[var(--text-primary)] mt-1">{overview?.summary?.totalUnits ?? 0}</div>
                                </div>
                                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                                    <div className="text-xs text-red-200 uppercase tracking-wider">Low Stock</div>
                                    <div className="text-xl font-bold text-red-300 mt-1">{overview?.summary?.lowStockCount ?? 0}</div>
                                </div>
                                <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
                                    <div className="text-xs text-orange-200 uppercase tracking-wider">Out Of Stock</div>
                                    <div className="text-xl font-bold text-orange-300 mt-1">{overview?.summary?.outOfStockCount ?? 0}</div>
                                </div>
                                <div className="rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/10 p-3">
                                    <div className="text-xs text-[var(--primary)] uppercase tracking-wider">30d Moves</div>
                                    <div className="text-xl font-bold text-[var(--primary)] mt-1">{overview?.summary?.movementCount30Days ?? 0}</div>
                                </div>
                            </div>

                            <div className="mt-4 text-sm text-[var(--text-secondary)]">
                                Valuation Snapshot: <span className="font-medium text-[var(--text-primary)]">{valuationLabel}</span>
                            </div>

                            <div className="mt-4 space-y-2">
                                <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Top Reorder Risks</div>
                                {(overview?.topRiskItems || []).length === 0 ? (
                                    <div className="text-sm text-[var(--text-secondary)]">No immediate reorder risk across current scope.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {(overview?.topRiskItems || []).slice(0, 5).map((risk: any) => (
                                            <div key={risk.id} className="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] px-3 py-2 gap-3">
                                                <div>
                                                    <div className="text-sm font-medium text-[var(--text-primary)]">{risk.name} ({risk.sku})</div>
                                                    <div className="text-xs text-[var(--text-muted)]">Current {risk.currentQuantity} | Reorder {risk.reorderPoint}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex justify-end gap-2 mb-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleTopRiskReorder(risk)}
                                                            disabled={reorderingRiskId === risk.id}
                                                        >
                                                            {reorderingRiskId === risk.id ? 'Reordering...' : 'Reorder Now'}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => navigate(`/inventory/${risk.id}`)}
                                                        >
                                                            Open
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => navigate(`/finance/exception-center?module=INVENTORY&ref=${risk.id}`)}
                                                        >
                                                            Exception
                                                        </Button>
                                                    </div>
                                                    <div className="text-xs text-red-300">Shortage {risk.shortage}</div>
                                                    <div className="text-xs text-[var(--text-secondary)]">Suggested {risk.recommendedOrderQty}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </Card>

                <Card className="p-4 border border-[var(--border-color)] bg-gradient-to-b from-[var(--bg-card)] to-[var(--bg-overlay)]">
                    <div className="flex items-center gap-2 text-[var(--text-primary)] mb-3">
                        <Brain className="w-4 h-4 text-[var(--primary)]" />
                        <h3 className="text-base font-semibold">AI Inventory Brief</h3>
                    </div>

                    {overviewLoading ? (
                        <div className="flex items-center justify-center h-36">
                            <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                        </div>
                    ) : insights ? (
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)]">
                                <AlertTriangle className="w-3 h-3" />
                                {insights.urgency} PRIORITY
                            </div>
                            <p className="text-sm text-[var(--text-primary)] leading-relaxed">{insights.headline}</p>
                            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                                {(insights.recommendations || []).slice(0, 3).map((rec: string, idx: number) => (
                                    <li key={idx} className="rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-1.5">{rec}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className="text-sm text-[var(--text-secondary)]">Inventory brief unavailable.</div>
                    )}
                </Card>
            </div>

            {/* Content */}
            <div className="min-h-[500px]">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : (
                    <InventoryTableView items={filteredItems} type={activeTab} onRefresh={fetchInventory} />
                )}
            </div>
        </div>
    );
}

// Icon helper
function WrenchIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
    )
}

export default Inventory;

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../hooks/useToast';
import {
    ArrowLeft,
    AlertTriangle,
    History,
    Edit,
    Trash2,
    Printer,
    Brain,
    Loader2,
    Activity,
    ShieldAlert,
} from 'lucide-react';
import QRCode from 'react-qr-code';

// Components
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export function InventoryDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [insights, setInsights] = useState<any>(null);
    const [insightsLoading, setInsightsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<'REORDER' | 'FIX_ROP' | null>(null);

    const formatMovementType = (type: string) => String(type || '').toUpperCase();
    const movementBadgeVariant = (type: string) => {
        const normalized = formatMovementType(type);
        if (normalized === 'STOCK_IN') return 'success';
        if (normalized === 'STOCK_OUT' || normalized === 'RETURN') return 'destructive';
        if (normalized === 'TRANSFER') return 'warning';
        return 'outline';
    };
    const movementSignAndColor = (type: string, quantity: number) => {
        const normalized = formatMovementType(type);
        const qty = Math.abs(Number(quantity || 0));
        if (normalized === 'STOCK_IN') return { text: `+${qty}`, cls: 'text-green-600' };
        if (normalized === 'STOCK_OUT' || normalized === 'RETURN') return { text: `-${qty}`, cls: 'text-red-600' };
        if (normalized === 'TRANSFER') return { text: `${qty}`, cls: 'text-orange-500' };
        return { text: `${qty}`, cls: 'text-blue-500' };
    };

    const fetchItem = async () => {
        try {
            const res = await api.get(`/inventory/${id}`);
            setItem(res.data.data);
        } catch (error) {
            toast.error('Failed to load item details');
            navigate('/inventory');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItem();
    }, [id]);

    useEffect(() => {
        const fetchInsights = async () => {
            setInsightsLoading(true);
            try {
                const res = await api.get('/inventory/insights');
                if (res.data?.success) {
                    setInsights(res.data.data);
                }
            } catch {
                setInsights(null);
            } finally {
                setInsightsLoading(false);
            }
        };
        fetchInsights();
    }, []);

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!item) return <div className="p-8 text-center">Item not found</div>;

    const isLowStock = item.currentQuantity <= item.reorderPoint;

    const reorderNow = async () => {
        setActionLoading('REORDER');
        try {
            const suggested = Math.max(Number(item.reorderQuantity || 1), Math.max(0, Number(item.reorderPoint || 0) - Number(item.currentQuantity || 0)) || 1);
            await api.post(`/inventory/${item.id}/reorder`, { quantity: suggested });
            toast.success(`Reordered ${item.sku} (+${suggested})`);
            await fetchItem();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to reorder item');
        } finally {
            setActionLoading(null);
        }
    };

    const fixToReorderPoint = async () => {
        setActionLoading('FIX_ROP');
        try {
            await api.post(`/inventory/${item.id}/fix-reorder-point`);
            toast.success(`Adjusted ${item.sku} to reorder point`);
            await fetchItem();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to adjust stock');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .print-only-label, .print-only-label * {
                            visibility: visible;
                        }
                        .print-only-label {
                            position: absolute;
                            left: 0;
                            top: 0;
                            margin: 0;
                            padding: 20px;
                            width: 100%;
                            height: 100%;
                            display: flex !important;
                            flex-direction: column !important;
                            align-items: center !important;
                            justify-content: flex-start !important;
                            border: none !important;
                            background: white !important;
                        }
                        .print-hide {
                            display: none !important;
                        }
                    }
                `}
            </style>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 print-hide">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/inventory')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{item.name}</h1>
                            <Badge variant="outline">{item.sku}</Badge>
                            {isLowStock && (
                                <Badge variant="warning" className="cursor-pointer" onClick={() => navigate(`/finance/exception-center?module=INVENTORY&ref=${item.id}`)}>Low Stock</Badge>
                            )}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/finance/exception-center?module=INVENTORY&ref=${item.id}`)}
                            >
                                <ShieldAlert className="w-4 h-4 mr-2" />
                                View Exception
                            </Button>
                        </div>
                        <p className="text-gray-500">{item.category} • {item.storageLocation || 'No location'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Edit className="w-4 h-4 mr-2" /> Edit
                    </Button>
                    {/* Only admins might delete */}
                    <Button variant="destructive">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                </div>
            </div>



            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* QR Code & Main Info */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="p-6">
                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-white dark:bg-gray-800 print-only-label">
                                <div className="bg-white p-2 rounded">
                                    <QRCode value={JSON.stringify({ id: item.id, sku: item.sku })} size={128} />
                                </div>
                                <span className="text-sm font-bold font-mono text-black dark:text-white mt-2">{item.sku}</span>
                                <span className="text-xs text-black dark:text-gray-400 mt-1">{item.name}</span>
                                <Button size="sm" variant="outline" className="print-hide mt-4" onClick={() => window.print()}>
                                    <Printer className="w-3 h-3 mr-2" /> Print Label
                                </Button>
                            </div>
                            <div className="flex-1 space-y-4">
                                <h3 className="font-semibold text-lg">Product Information</h3>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
                                    <div>
                                        <dt className="text-gray-500">Stock Quantity</dt>
                                        <dd className="font-medium text-lg mt-1 flex items-center gap-2">
                                            {item.currentQuantity} {item.unit}
                                            {isLowStock && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Reorder Point</dt>
                                        <dd className="font-medium mt-1">{item.reorderPoint} {item.unit}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Unit Cost</dt>
                                        <dd className="font-medium mt-1">₹{(item.costPrice ?? item.unitCost ?? 0).toLocaleString()}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Total Value</dt>
                                        <dd className="font-medium mt-1">₹{((item.costPrice ?? item.unitCost ?? 0) * (item.currentQuantity ?? 0)).toLocaleString()}</dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <dt className="text-gray-500">Description</dt>
                                        <dd className="font-medium mt-1">{item.description || 'No description provided.'}</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 border border-[var(--border-color)] bg-[var(--bg-card)]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Operations Snapshot
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="rounded-lg border border-[var(--border-color)] p-3 bg-[var(--bg-overlay)]">
                                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Current Stock</div>
                                <div className="text-xl font-semibold text-[var(--text-primary)] mt-1">{item.currentQuantity}</div>
                            </div>
                            <div className="rounded-lg border border-[var(--border-color)] p-3 bg-[var(--bg-overlay)]">
                                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Reorder Point</div>
                                <div className="text-xl font-semibold text-[var(--text-primary)] mt-1">{item.reorderPoint}</div>
                            </div>
                            <div className="rounded-lg border border-[var(--border-color)] p-3 bg-[var(--bg-overlay)]">
                                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Movement Logs</div>
                                <div className="text-xl font-semibold text-[var(--text-primary)] mt-1">{item.stockMovements?.length || 0}</div>
                            </div>
                            <div className="rounded-lg border border-[var(--border-color)] p-3 bg-[var(--bg-overlay)]">
                                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Stock Health</div>
                                <div className={`text-sm font-semibold mt-2 ${isLowStock ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {isLowStock ? 'AT RISK' : 'STABLE'}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <History className="w-4 h-4" /> Stock History
                            </h3>
                            <Button variant="outline" size="sm">View All</Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-gray-500 font-medium border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="pb-3 pl-2">Date</th>
                                        <th className="pb-3">Type</th>
                                        <th className="pb-3 text-right">Qty</th>
                                        <th className="pb-3 text-right">Performed By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {item.stockMovements?.map((movement: any, index: number) => {
                                        const normalizedType = formatMovementType(movement.type);
                                        const qty = movementSignAndColor(normalizedType, movement.quantity);
                                        return (
                                        <tr key={index} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="py-3 pl-2 text-gray-500">
                                                {new Date(movement.date).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 capitalize font-medium">
                                                <Badge variant={movementBadgeVariant(normalizedType)} className="text-xs">
                                                    {normalizedType.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className={`py-3 text-right font-medium ${qty.cls}`}>
                                                {qty.text}
                                            </td>
                                            <td className="py-3 text-right text-gray-500">
                                                {movement.performedBy?.name || 'System'}
                                            </td>
                                        </tr>
                                        );
                                    })}
                                    {(!item.stockMovements || item.stockMovements.length === 0) && (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-gray-500">
                                                No stock movements recorded
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Advanced Tracking Lists */}
                    {item.trackingType === 'SERIAL' && item.serials && item.serials.length > 0 && (
                        <Card className="p-6">
                            <h3 className="font-semibold mb-4 text-lg">Serial Numbers</h3>
                            <div className="overflow-x-auto max-h-60 overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-gray-500 border-b border-gray-100 dark:border-gray-800">
                                        <tr>
                                            <th className="pb-2">Serial #</th>
                                            <th className="pb-2">Status</th>
                                            <th className="pb-2">Location</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {item.serials.map((s: any, i: number) => (
                                            <tr key={i}>
                                                <td className="py-2 font-mono">{s.serialNumber}</td>
                                                <td className="py-2"><Badge variant="secondary" className="text-xs">{s.status}</Badge></td>
                                                <td className="py-2 text-gray-500">{s.location || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {item.trackingType === 'BATCH' && item.batches && item.batches.length > 0 && (
                        <Card className="p-6">
                            <h3 className="font-semibold mb-4 text-lg">Batch Information</h3>
                            <div className="overflow-x-auto max-h-60 overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-gray-500 border-b border-gray-100 dark:border-gray-800">
                                        <tr>
                                            <th className="pb-2">Batch #</th>
                                            <th className="pb-2 text-right">Qty</th>
                                            <th className="pb-2">Expiry</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {item.batches.map((b: any, i: number) => (
                                            <tr key={i}>
                                                <td className="py-2 font-mono">{b.batchNumber}</td>
                                                <td className="py-2 text-right">{b.quantity}</td>
                                                <td className="py-2 text-red-500">{new Date(b.expiryDate).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Quick Actions / Suppliers */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="font-semibold mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <Button className="w-full justify-start" variant="default" onClick={reorderNow} disabled={actionLoading === 'REORDER'}>
                                {actionLoading === 'REORDER' ? 'Reordering...' : '+ One-click Reorder'}
                            </Button>
                            <Button className="w-full justify-start" variant="secondary" onClick={fixToReorderPoint} disabled={actionLoading === 'FIX_ROP'}>
                                {actionLoading === 'FIX_ROP' ? 'Fixing...' : '↻ Fix to Reorder Point'}
                            </Button>
                            <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/inventory/operations?type=IN&item=' + item.id)}>
                                + Restock In
                            </Button>
                            <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/inventory/operations?type=OUT&item=' + item.id)}>
                                - Stock Out
                            </Button>
                            <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/inventory/operations?type=ADJUST&item=' + item.id)}>
                                ⇄ Adjust Stock
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-6 border border-[var(--border-color)] bg-gradient-to-b from-[var(--bg-card)] to-[var(--bg-overlay)]">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Brain className="w-4 h-4 text-[var(--primary)]" />
                            AI Inventory Brief
                        </h3>
                        {insightsLoading ? (
                            <div className="flex items-center justify-center h-24">
                                <Loader2 className="w-5 h-5 animate-spin text-[var(--primary)]" />
                            </div>
                        ) : insights ? (
                            <div className="space-y-3">
                                <Badge variant="outline">{insights.urgency || 'INFO'}</Badge>
                                <p className="text-sm text-[var(--text-secondary)]">{insights.headline || 'No inventory headline available.'}</p>
                                <div className="space-y-2">
                                    {(insights.recommendations || []).slice(0, 3).map((rec: string, idx: number) => (
                                        <div key={idx} className="text-xs rounded-md border border-[var(--border-color)] p-2 bg-[var(--bg-card)] text-[var(--text-secondary)]">
                                            {rec}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-[var(--text-secondary)]">Inventory intelligence unavailable.</p>
                        )}
                    </Card>

                    {item.supplier && (
                        <Card className="p-6">
                            <h3 className="font-semibold mb-4">Supplier</h3>
                            <p className="font-medium">{item.supplier}</p>
                            <p className="text-sm text-gray-500">Contact details...</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

export default InventoryDetail;

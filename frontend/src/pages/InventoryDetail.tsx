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
    Printer
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

    useEffect(() => {
        const fetchItem = async () => {
            try {
                const res = await api.get(`/inventory/${id}`);
                setItem(res.data.data);

                // Fetch history if endpoint exists
                // const historyRes = await api.get(`/inventory/${id}/history`);
                // setHistory(historyRes.data.data);
            } catch (error) {
                toast.error('Failed to load item details');
                navigate('/inventory');
            } finally {
                setLoading(false);
            }
        };
        fetchItem();
    }, [id]);

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!item) return <div className="p-8 text-center">Item not found</div>;

    const isLowStock = item.quantity <= item.minQuantity;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/inventory')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{item.name}</h1>
                            <Badge variant="outline">{item.sku}</Badge>
                            {isLowStock && (
                                <Badge variant="warning">Low Stock</Badge>
                            )}
                        </div>
                        <p className="text-gray-500">{item.category} • {item.location}</p>
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
                            <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-white dark:bg-gray-800">
                                <div className="bg-white p-2 rounded">
                                    <QRCode value={JSON.stringify({ id: item._id, sku: item.sku })} size={128} />
                                </div>
                                <span className="text-xs font-mono text-gray-500">{item.sku}</span>
                                <Button size="sm" variant="outline" onClick={() => window.print()}>
                                    <Printer className="w-3 h-3 mr-2" /> Print Label
                                </Button>
                            </div>
                            <div className="flex-1 space-y-4">
                                <h3 className="font-semibold text-lg">Product Information</h3>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
                                    <div>
                                        <dt className="text-gray-500">Stock Quantity</dt>
                                        <dd className="font-medium text-lg mt-1 flex items-center gap-2">
                                            {item.quantity} {item.unit}
                                            {isLowStock && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Minimum Quantity</dt>
                                        <dd className="font-medium mt-1">{item.minQuantity} {item.unit}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Unit Price</dt>
                                        <dd className="font-medium mt-1">₹{(item.unitPrice ?? 0).toLocaleString()}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Total Value</dt>
                                        <dd className="font-medium mt-1">₹{((item.unitPrice ?? 0) * (item.quantity ?? 0)).toLocaleString()}</dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <dt className="text-gray-500">Description</dt>
                                        <dd className="font-medium mt-1">{item.description || 'No description provided.'}</dd>
                                    </div>
                                </dl>
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
                                    {item.stockMovements?.slice().reverse().map((movement: any, index: number) => (
                                        <tr key={index} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="py-3 pl-2 text-gray-500">
                                                {new Date(movement.date).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 capitalize font-medium">
                                                <Badge variant={
                                                    movement.type === 'stock_in' ? 'success' :
                                                        movement.type === 'stock_out' ? 'destructive' : 'outline'
                                                } className="text-xs">
                                                    {movement.type.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className={`py-3 text-right font-medium ${movement.type === 'stock_in' ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {movement.type === 'stock_in' ? '+' : '-'}{movement.quantity}
                                            </td>
                                            <td className="py-3 text-right text-gray-500">
                                                {movement.performedBy?.name || 'System'}
                                            </td>
                                        </tr>
                                    ))}
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
                            <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/inventory/operations?type=IN&item=' + item._id)}>
                                + Restock In
                            </Button>
                            <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/inventory/operations?type=OUT&item=' + item._id)}>
                                - Stock Out
                            </Button>
                            <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/inventory/operations?type=ADJUST&item=' + item._id)}>
                                ⇄ Adjust Stock
                            </Button>
                        </div>
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

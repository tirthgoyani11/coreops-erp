import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../hooks/useToast';
import {
    ArrowLeft,
    AlertTriangle,
    History,
    Edit,
    Trash2
} from 'lucide-react';

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
                {/* Main Info */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="font-semibold mb-4 text-lg">Product Information</h3>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 text-sm">
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
                                <dd className="font-medium mt-1">₹{item.unitPrice.toLocaleString()}</dd>
                            </div>
                            <div>
                                <dt className="text-gray-500">Total Value</dt>
                                <dd className="font-medium mt-1">₹{(item.unitPrice * item.quantity).toLocaleString()}</dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-gray-500">Description</dt>
                                <dd className="font-medium mt-1">{item.description || 'No description provided.'}</dd>
                            </div>
                        </dl>
                    </Card>

                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <History className="w-4 h-4" /> Stock History
                            </h3>
                            <Button variant="outline" size="sm">View All</Button>
                        </div>
                        {/* Placeholder for history table */}
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-lg">
                            Stock movement history will appear here
                        </div>
                    </Card>
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

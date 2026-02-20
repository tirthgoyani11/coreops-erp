import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Eye, AlertTriangle } from 'lucide-react';
interface InventoryItem {
    _id: string;
    name: string;
    sku: string;
    category: string;
    quantity: number;
    minQuantity: number;
    unit: string;
    unitPrice: number;
    location: string;
    lastRestocked?: string;
}

interface InventoryTableViewProps {
    items: InventoryItem[];
    type: string;
    onRefresh?: () => void;
}

export function InventoryTableView({ items, type }: InventoryTableViewProps) {
    const navigate = useNavigate();

    if (items.length === 0) {
        return (
            <Card className="p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No items found</h3>
                <p className="text-gray-500 max-w-sm mt-2">
                    {type === 'products' ? 'No products' : 'No spare parts'} matching your filters.
                </p>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden border border-gray-200 dark:border-gray-800">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 font-medium border-b border-gray-200 dark:border-gray-800">
                        <tr>
                            <th className="px-4 py-3">SKU</th>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3 text-right">Stock</th>
                            <th className="px-4 py-3 text-right">Unit Price</th>
                            <th className="px-4 py-3">Location</th>
                            <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {items.map((item) => {
                            const isLowStock = item.quantity <= item.minQuantity;
                            return (
                                <tr
                                    key={item._id}
                                    className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/inventory/${item._id}`)}
                                >
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                                        {item.sku}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
                                        {isLowStock && (
                                            <span className="flex items-center text-xs text-red-600 mt-0.5 font-medium">
                                                <AlertTriangle className="w-3 h-3 mr-1" /> Low Stock
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 capitalize">{item.category}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Badge variant={item.quantity === 0 ? 'destructive' : isLowStock ? 'warning' : 'secondary'}>
                                                {item.quantity} {item.unit}
                                            </Badge>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">
                                        ₹{item.unitPrice?.toLocaleString() ?? '0'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">{item.location || '-'}</td>
                                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/inventory/${item._id}`)}>
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Eye, AlertTriangle, Check } from 'lucide-react';
import { useState } from 'react';

interface InventoryItem {
    id: string;
    name: string;
    sku: string;
    category: string;
    currentQuantity: number;
    reorderPoint: number;
    unit: string;
    costPrice: number | null;
    unitCost: number | null;
    storageLocation: string | null;
    lastRestockDate?: string;
}

interface InventoryTableViewProps {
    items: InventoryItem[];
    type: string;
    onRefresh?: () => void;
    selectedItems?: string[];
    onSelectionChange?: (selectedIds: string[]) => void;
    enableSelection?: boolean;
}

export function InventoryTableView({ items, type, selectedItems = [], onSelectionChange, enableSelection = false }: InventoryTableViewProps) {
    const navigate = useNavigate();
    const [localSelected, setLocalSelected] = useState<string[]>(selectedItems);

    const handleSelectItem = (itemId: string) => {
        const newSelected = localSelected.includes(itemId)
            ? localSelected.filter(id => id !== itemId)
            : [...localSelected, itemId];
        setLocalSelected(newSelected);
        onSelectionChange?.(newSelected);
    };

    const handleSelectAll = () => {
        const newSelected = localSelected.length === items.length ? [] : items.map(item => item.id);
        setLocalSelected(newSelected);
        onSelectionChange?.(newSelected);
    };

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
            <div className="overflow-auto max-h-[600px] w-full">
                <table className="w-full text-sm text-left">
                    <thead className="sticky top-0 z-10 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md text-gray-500 font-medium border-b border-gray-200 dark:border-gray-800 shadow-sm">
                        <tr>
                            {enableSelection && (
                                <th className="px-4 py-3 w-12">
                                    <input
                                        type="checkbox"
                                        checked={localSelected.length === items.length && items.length > 0}
                                        onChange={handleSelectAll}
                                        className="rounded border-gray-300 cursor-pointer"
                                    />
                                </th>
                            )}
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
                            const isLowStock = item.currentQuantity <= item.reorderPoint;
                            const price = item.costPrice ?? item.unitCost ?? 0;
                            const isSelected = localSelected.includes(item.id);
                            return (
                                <tr
                                    key={item.id}
                                    className={`group hover:bg-[var(--color-primary)]/5 dark:hover:bg-[var(--color-primary)]/10 transition-colors ${isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                                    onClick={() => !enableSelection && navigate(`/inventory/${item.id}`)}
                                >
                                    {enableSelection && (
                                        <td className="px-4 py-3 w-12" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleSelectItem(item.id)}
                                                className="rounded border-gray-300 cursor-pointer"
                                            />
                                        </td>
                                    )}
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
                                            <Badge variant={item.currentQuantity === 0 ? 'destructive' : isLowStock ? 'warning' : 'secondary'}>
                                                {item.currentQuantity} {item.unit}
                                            </Badge>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">
                                        ₹{price.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">{item.storageLocation || '-'}</td>
                                    <td className="px-4 py-3 text-right relative" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end gap-2">
                                            {isSelected && enableSelection && (
                                                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            )}
                                            {!enableSelection && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 group-hover:opacity-100 group-hover:bg-[var(--color-primary)]/20 group-hover:text-[var(--color-primary)] transition-all" onClick={() => navigate(`/inventory/${item.id}`)}>
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            )}
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../hooks/useToast';
import {
    Plus,
    Search,
    Package,
    ArrowUpRight
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

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('type', activeTab === 'products' ? 'Product' : 'SparePart');
            if (filters.stockStatus !== 'all') params.append('stockStatus', filters.stockStatus);

            // Backend search/filter usually
            const res = await api.get(`/inventory?${params.toString()}`);
            setItems(res.data.data);

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
    // Search is client-side filtered for responsiveness on small datasets, 
    // or debounced server-side. for MVP, client-filter.

    const filteredItems = items.filter((item: any) =>
        item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.sku.toLowerCase().includes(filters.search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventory Management</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Track products, spare parts, and stock levels
                    </p>
                </div>

                {hasPermission('inventory.create') && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/inventory/operations')}>
                            <ArrowUpRight className="w-4 h-4 mr-2" />
                            Stock Op
                        </Button>
                        <Button onClick={() => navigate('/inventory/new')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Item
                        </Button>
                    </div>
                )}
            </div>

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
                            onValueChange={(val) => setFilters({ ...filters, stockStatus: val })}
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

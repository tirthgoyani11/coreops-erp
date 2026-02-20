import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../hooks/useToast';
import {
    ArrowLeft,
    ArrowUpRight,
    ArrowDownLeft,
    ArrowRightLeft,
    Search
} from 'lucide-react';

// Components
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Textarea } from '../components/ui/Textarea';
import { Label } from '../components/ui/Label';

export function StockOperations() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const toast = useToast();

    // Type: IN, OUT, ADJUST
    const [operationType, setOperationType] = useState(searchParams.get('type') || 'IN');
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // Form state
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [reference, setReference] = useState(''); // PO number, WO number
    const [loading, setLoading] = useState(false);

    // Pre-load item if ID provided
    useEffect(() => {
        const itemId = searchParams.get('item');
        if (itemId) {
            fetchItem(itemId);
        }
    }, [searchParams]);

    const fetchItem = async (id: string) => {
        try {
            const res = await api.get(`/inventory/${id}`);
            setSelectedItem(res.data.data);
        } catch (error) {
            toast.error('Failed to load item');
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }


        try {
            const res = await api.get(`/inventory?search=${query}`);
            setSearchResults(res.data.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || !quantity || !reason) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            // Determine endpoint based on type
            // const endpoint = `/inventory/${selectedItem._id}/${operationType.toLowerCase()}`;
            // Payload varies slightly? Assuming unified or specific endpoints
            // Let's assume specific: /stock-in, /stock-out, /adjust
            // Actually usually it's better to have one 'transaction' endpoint or specific ones.
            // Let's go with specific endpoints on item:
            // POST /inventory/:id/stock-in { quantity, reason, reference }

            const url = `/inventory/${selectedItem._id}/adjust`;

            let type = 'adjustment';
            if (operationType === 'IN') type = 'stock_in';
            if (operationType === 'OUT') type = 'stock_out';

            await api.post(url, {
                type,
                quantity: Number(quantity),
                reason,
                reference
            });

            toast.success('Stock operation completed successfully');
            navigate(`/inventory/${selectedItem._id}`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/inventory')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stock Operations</h1>
                    <p className="text-sm text-gray-500">Record stock movements and adjustments</p>
                </div>
            </div>

            <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Operation Type */}
                    <div className="grid grid-cols-3 gap-4">
                        <button
                            type="button"
                            onClick={() => setOperationType('IN')}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${operationType === 'IN'
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                : 'border-gray-200 dark:border-gray-800 hover:border-green-200'
                                }`}
                        >
                            <ArrowUpRight className="w-6 h-6 mb-2" />
                            <span className="font-semibold">Stock In</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setOperationType('OUT')}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${operationType === 'OUT'
                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                : 'border-gray-200 dark:border-gray-800 hover:border-red-200'
                                }`}
                        >
                            <ArrowDownLeft className="w-6 h-6 mb-2" />
                            <span className="font-semibold">Stock Out</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setOperationType('ADJUST')}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${operationType === 'ADJUST'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'border-gray-200 dark:border-gray-800 hover:border-blue-200'
                                }`}
                        >
                            <ArrowRightLeft className="w-6 h-6 mb-2" />
                            <span className="font-semibold">Adjust</span>
                        </button>
                    </div>

                    {/* Item Selection */}
                    <div className="space-y-2">
                        <Label>Select Item</Label>
                        {!selectedItem ? (
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search by SKU or Name..."
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                />
                                {searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg max-h-60 overflow-auto">
                                        {searchResults.map((item: any) => (
                                            <div
                                                key={item._id}
                                                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex justify-between items-center"
                                                onClick={() => {
                                                    setSelectedItem(item);
                                                    setSearchResults([]);
                                                    setSearchQuery('');
                                                }}
                                            >
                                                <div>
                                                    <p className="font-medium text-sm">{item.name}</p>
                                                    <p className="text-xs text-gray-500">{item.sku}</p>
                                                </div>
                                                <Badge variant="outline">{item.quantity} {item.unit}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-md bg-gray-50 dark:bg-gray-900/50">
                                <div>
                                    <p className="font-medium">{selectedItem.name}</p>
                                    <p className="text-sm text-gray-500">Current Stock: {selectedItem.quantity} {selectedItem.unit}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>
                                    Change
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input
                                type="number"
                                min="1"
                                placeholder="0.00"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Reference (Optional)</Label>
                            <Input
                                placeholder="PO-123, WO-456"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Reason / Notes</Label>
                        <Textarea
                            placeholder="Why is this stock moving?"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className="pt-4">
                        <Button type="submit" className="w-full" disabled={loading || !selectedItem}>
                            {loading ? 'Processing...' : 'Confirm Operation'}
                        </Button>
                    </div>

                </form>
            </Card>
        </div>
    );
}

export default StockOperations;

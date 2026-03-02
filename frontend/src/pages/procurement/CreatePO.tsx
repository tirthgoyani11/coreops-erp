import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Save, Trash2, Plus } from 'lucide-react';

export function CreatePO() {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState([]);
    const [products, setProducts] = useState([]);

    const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
        defaultValues: {
            vendorId: '',
            items: [{ name: '', quantity: 1, unitPrice: 0 }],
            expectedDeliveryDate: '',
            notes: ''
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    // Watch items to calculate total
    const items = watch('items');
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);

    useEffect(() => {
        const fetchDependencies = async () => {
            try {
                const [vendorRes, prodRes] = await Promise.all([
                    api.get('/vendors'),
                    api.get('/inventory?type=PRODUCT')
                ]);
                setVendors(vendorRes.data.data);
                setProducts(prodRes.data.data);
            } catch (error) {
                console.error('Failed to load dependencies', error);
            }
        };
        fetchDependencies();
    }, []);

    const onProductSelect = (index: number, e: any) => {
        const prodId = e.target.value;
        const product: any = products.find((p: any) => p.id === prodId);
        if (product) {
            setValue(`items.${index}.inventoryId` as any, product.id);
            setValue(`items.${index}.name` as any, product.name);
            setValue(`items.${index}.description` as any, product.description);
            setValue(`items.${index}.unitPrice` as any, product.unitCost || product.costPrice || 0);
        }
    };

    const [submitError, setSubmitError] = useState('');

    const onSubmit = async (data: any) => {
        setSubmitError('');
        try {
            // Convert string values from number inputs to actual numbers
            const payload = {
                ...data,
                items: data.items.map((item: any) => ({
                    ...item,
                    quantity: Number(item.quantity) || 0,
                    unitPrice: Number(item.unitPrice) || 0,
                })),
            };
            await api.post('/purchase-orders', payload);
            navigate('/procurement/orders');
        } catch (error: any) {
            const msg = error?.response?.data?.error || error?.response?.data?.message || 'Failed to create PO. Please check all fields.';
            setSubmitError(msg);
            console.error('Failed to create PO:', error);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/procurement/orders')}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Purchase Order</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card className="p-6 space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Order Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Select Vendor</label>
                            <select
                                {...register('vendorId', { required: 'Vendor is required' })}
                                className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                            >
                                <option value="">Select Vendor...</option>
                                {vendors.map((v: any) => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                            {errors.vendorId && <span className="text-red-500 text-xs">Required</span>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Expected Delivery</label>
                            <input
                                type="date"
                                {...register('expectedDeliveryDate')}
                                className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                            />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="font-semibold text-lg">Items</h3>
                        <Button type="button" size="sm" onClick={() => append({ name: '', quantity: 1, unitPrice: 0 })}>
                            <Plus className="w-4 h-4 mr-2" /> Add Item
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-2 items-end bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                                <div className="col-span-4">
                                    <label className="text-xs text-gray-500">Product (Optional)</label>
                                    <select
                                        className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700"
                                        onChange={(e) => onProductSelect(index, e)}
                                    >
                                        <option value="">Custom Item...</option>
                                        {products.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-3">
                                    <label className="text-xs text-gray-500">Item Name</label>
                                    <input
                                        {...register(`items.${index}.name` as const, { required: true })}
                                        className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700"
                                        placeholder="Item Name"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs text-gray-500">Qty</label>
                                    <input
                                        type="number"
                                        {...register(`items.${index}.quantity` as const)}
                                        className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs text-gray-500">Unit Price</label>
                                    <input
                                        type="number"
                                        {...register(`items.${index}.unitPrice` as const)}
                                        className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700"
                                    />
                                </div>
                                <div className="col-span-1 flex justify-center pb-2">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-500 hover:bg-red-50">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-4 text-xl font-bold">
                        Total: ₹{totalAmount.toLocaleString()}
                    </div>
                </Card>

                {submitError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                        {submitError}
                    </div>
                )}

                <div className="flex justify-end">
                    <Button type="submit" size="lg">
                        <Save className="w-4 h-4 mr-2" /> Create Order
                    </Button>
                </div>
            </form>
        </div>
    );
}

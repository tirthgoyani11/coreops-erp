import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Save, Trash2, Plus, Sparkles, CircleDollarSign, AlertTriangle, Package } from 'lucide-react';

interface Vendor {
    id: string;
    name: string;
    vendorCode?: string;
    isActive?: boolean;
    isBlacklisted?: boolean;
}

interface Product {
    id: string;
    name: string;
    description?: string;
    unitCost?: number;
    costPrice?: number;
}

interface POItemForm {
    inventoryId?: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
}

interface POFormValues {
    vendorId: string;
    items: POItemForm[];
    expectedDeliveryDate: string;
    notes: string;
}

const formatCurrency = (amount: number) => `₹${Number(amount || 0).toLocaleString()}`;

export function CreatePO() {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [submitError, setSubmitError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<POFormValues>({
        defaultValues: {
            vendorId: '',
            items: [{ name: '', quantity: 1, unitPrice: 0 }],
            expectedDeliveryDate: '',
            notes: ''
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'items'
    });

    const items = watch('items');
    const selectedVendorId = watch('vendorId');
    const selectedVendor = vendors.find((vendor) => vendor.id === selectedVendorId);

    const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
    const linesWithAmount = items.filter((item) => Number(item.quantity || 0) > 0 && Number(item.unitPrice || 0) >= 0).length;
    const invalidRows = items.filter((item) => !item.name || Number(item.quantity || 0) <= 0 || Number(item.unitPrice || 0) < 0).length;

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

    const onProductSelect = (index: number, event: React.ChangeEvent<HTMLSelectElement>) => {
        const prodId = event.target.value;
        const product = products.find((p) => p.id === prodId);

        if (!product) return;

        setValue(`items.${index}.inventoryId`, product.id);
        setValue(`items.${index}.name`, product.name);
        setValue(`items.${index}.description`, product.description || '');
        setValue(`items.${index}.unitPrice`, product.unitCost || product.costPrice || 0);
    };

    const onSubmit = async (data: POFormValues) => {
        setSubmitError('');

        const hasAtLeastOneValidLine = data.items.some((item) => item.name && Number(item.quantity) > 0 && Number(item.unitPrice) >= 0);
        if (!hasAtLeastOneValidLine) {
            setSubmitError('Add at least one valid item with name, quantity > 0, and non-negative unit price.');
            return;
        }

        try {
            setIsSubmitting(true);
            const payload = {
                ...data,
                items: data.items.map((item) => ({
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
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/procurement/orders')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">Create Purchase Order</h1>
            </div>

            <Card className="p-5 border-[var(--border-color)] bg-[radial-gradient(circle_at_top_right,rgba(185,255,102,0.12),transparent_45%),var(--bg-card)]">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">Procurement Orchestrator</div>
                        <p className="text-[var(--text-primary)]">Build a compliant PO by validating supplier status, line quality, and delivery commitments before submission.</p>
                    </div>
                    <Sparkles className="w-5 h-5 text-[var(--primary)] shrink-0" />
                </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 lg:col-span-2">
                    <Card className="p-6 space-y-4 border-[var(--border-color)] bg-[var(--bg-card)]">
                        <h3 className="font-semibold text-lg border-b border-[var(--border-color)] pb-2 text-[var(--text-primary)]">Order Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">Select Vendor</label>
                                <select
                                    {...register('vendorId', { required: 'Vendor is required' })}
                                    className="w-full p-2 border rounded bg-[var(--bg-overlay)] border-[var(--border-color)] text-[var(--text-primary)]"
                                >
                                    <option value="">Select Vendor...</option>
                                    {vendors.map((vendor) => (
                                        <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                                    ))}
                                </select>
                                {errors.vendorId && <span className="text-red-400 text-xs">{errors.vendorId.message || 'Required'}</span>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">Expected Delivery</label>
                                <input
                                    type="date"
                                    {...register('expectedDeliveryDate')}
                                    className="w-full p-2 border rounded bg-[var(--bg-overlay)] border-[var(--border-color)] text-[var(--text-primary)]"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">Notes</label>
                            <textarea
                                {...register('notes')}
                                rows={3}
                                placeholder="Optional commercial terms, delivery conditions, or quality expectations"
                                className="w-full p-2 border rounded bg-[var(--bg-overlay)] border-[var(--border-color)] text-[var(--text-primary)]"
                            />
                        </div>
                    </Card>

                    <Card className="p-6 space-y-4 border-[var(--border-color)] bg-[var(--bg-card)]">
                        <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2">
                            <h3 className="font-semibold text-lg text-[var(--text-primary)]">Line Items</h3>
                            <Button type="button" size="sm" onClick={() => append({ name: '', quantity: 1, unitPrice: 0 })} className="bg-[var(--bg-overlay)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--primary)]">
                                <Plus className="w-4 h-4 mr-2" /> Add Item
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-12 gap-2 items-end bg-[var(--bg-overlay)] border border-[var(--border-color)] p-3 rounded-lg">
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="text-xs text-[var(--text-muted)]">Product (Optional)</label>
                                        <select
                                            className="w-full p-2 text-sm border rounded bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)]"
                                            onChange={(event) => onProductSelect(index, event)}
                                        >
                                            <option value="">Custom Item...</option>
                                            {products.map((product) => (
                                                <option key={product.id} value={product.id}>{product.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-12 md:col-span-3">
                                        <label className="text-xs text-[var(--text-muted)]">Item Name</label>
                                        <input
                                            {...register(`items.${index}.name`, { required: true })}
                                            className="w-full p-2 text-sm border rounded bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)]"
                                            placeholder="Item Name"
                                        />
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                        <label className="text-xs text-[var(--text-muted)]">Qty</label>
                                        <input
                                            type="number"
                                            min={1}
                                            {...register(`items.${index}.quantity`)}
                                            className="w-full p-2 text-sm border rounded bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)]"
                                        />
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                        <label className="text-xs text-[var(--text-muted)]">Unit Price</label>
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            {...register(`items.${index}.unitPrice`)}
                                            className="w-full p-2 text-sm border rounded bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)]"
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-1 flex justify-end md:justify-center pb-1">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-rose-400 hover:bg-rose-500/10">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end pt-4 text-xl font-bold text-[var(--text-primary)]">
                            Total: <span className="text-[var(--primary)] ml-2">{formatCurrency(totalAmount)}</span>
                        </div>
                    </Card>

                    {submitError && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 text-sm">
                            {submitError}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button type="submit" size="lg" disabled={isSubmitting} className="bg-[var(--primary)] text-black hover:bg-[var(--primary)]/90">
                            <Save className="w-4 h-4 mr-2" />
                            {isSubmitting ? 'Creating...' : 'Create Order'}
                        </Button>
                    </div>
                </form>

                <div className="space-y-6">
                    <Card className="p-5 border-[var(--border-color)] bg-[var(--bg-card)]">
                        <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Order Snapshot</div>
                        <div className="mt-4 space-y-3 text-sm">
                            <div className="flex justify-between text-[var(--text-secondary)]">
                                <span className="flex items-center gap-2"><Package className="w-4 h-4" /> Valid lines</span>
                                <span className="text-[var(--text-primary)] font-semibold">{linesWithAmount}</span>
                            </div>
                            <div className="flex justify-between text-[var(--text-secondary)]">
                                <span className="flex items-center gap-2"><CircleDollarSign className="w-4 h-4" /> Estimated spend</span>
                                <span className="text-[var(--text-primary)] font-semibold">{formatCurrency(totalAmount)}</span>
                            </div>
                            <div className="flex justify-between text-[var(--text-secondary)]">
                                <span>Rows needing attention</span>
                                <span className={`font-semibold ${invalidRows > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>{invalidRows}</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-5 border-[var(--border-color)] bg-[var(--bg-card)]">
                        <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Vendor Intelligence</div>
                        {selectedVendor ? (
                            <div className="mt-3 space-y-2 text-sm">
                                <div className="font-semibold text-[var(--text-primary)]">{selectedVendor.name}</div>
                                {selectedVendor.vendorCode && <div className="text-[var(--text-secondary)]">Code: {selectedVendor.vendorCode}</div>}
                                <div className="flex flex-wrap gap-2 pt-1">
                                    <span className={`px-2 py-1 rounded-full text-xs border ${selectedVendor.isActive === false ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
                                        {selectedVendor.isActive === false ? 'Inactive' : 'Active'}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs border ${selectedVendor.isBlacklisted ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' : 'bg-slate-500/10 text-slate-300 border-slate-500/20'}`}>
                                        {selectedVendor.isBlacklisted ? 'Blacklisted' : 'Not Blacklisted'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className="mt-3 text-sm text-[var(--text-muted)]">Select a vendor to view procurement eligibility signals.</p>
                        )}
                    </Card>

                    <Card className="p-5 border-[var(--border-color)] bg-[var(--bg-card)]">
                        <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Validation Guardrails</div>
                        <div className="mt-3 text-sm text-[var(--text-secondary)] space-y-2">
                            <p className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5" /> Ensure quantity is positive for each active line item.</p>
                            <p className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5" /> Confirm rate realism before submitting high-value lines.</p>
                            <p className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5" /> Avoid issuing new orders to blacklisted vendors.</p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

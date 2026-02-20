import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    ArrowLeft,
    Box
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                               Receive Dialog                               */
/* -------------------------------------------------------------------------- */
function ReceiveDialog({ po, onClose, onSuccess }: any) {
    const { register, control, handleSubmit } = useForm({
        defaultValues: {
            grnReference: '',
            receivedItems: po.items.map((item: any) => ({
                itemId: item._id,
                name: item.name,
                ordered: item.quantity,
                receivedSoFar: item.receivedQuantity || 0,
                quantityReceived: item.quantity - (item.receivedQuantity || 0), // Default to remaining
                bin: '',
                shelf: ''
            }))
        }
    });

    const { fields } = useFieldArray({ control, name: "receivedItems" });

    const onSubmit = async (data: any) => {
        try {
            // Filter only items with > 0 quantity
            const payload = {
                grnReference: data.grnReference,
                receivedItems: data.receivedItems
                    .filter((i: any) => Number(i.quantityReceived) > 0)
                    .map((i: any) => ({
                        itemId: i.itemId,
                        quantityReceived: Number(i.quantityReceived),
                        bin: i.bin,
                        shelf: i.shelf
                    }))
            };

            await api.post(`/purchase-orders/${po._id}/receive`, payload);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Receive failed:', error);
            alert('Failed to receive goods');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold dark:text-gray-100">Receive Goods</h2>
                        <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">GRN / Delivery Note Ref</label>
                        <input {...register('grnReference')} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-gray-100" placeholder="Optional" />
                    </div>

                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="p-2 text-left">Item</th>
                                <th className="p-2 text-right">Ordered</th>
                                <th className="p-2 text-right">Prev Rcvd</th>
                                <th className="p-2 w-24">Receive Qty</th>
                                <th className="p-2 w-24">Bin (Opt)</th>
                                <th className="p-2 w-24">Shelf (Opt)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {fields.map((field: any, index) => (
                                <tr key={field.id} className="border-b dark:border-gray-700">
                                    <td className="p-2 dark:text-gray-300">{field.name}</td>
                                    <td className="p-2 text-right dark:text-gray-300">{field.ordered}</td>
                                    <td className="p-2 text-right dark:text-gray-300">{field.receivedSoFar}</td>
                                    <td className="p-2">
                                        <input
                                            type="number"
                                            {...register(`receivedItems.${index}.quantityReceived` as const)}
                                            className="w-full p-1 border rounded text-right dark:bg-gray-700 dark:text-gray-100"
                                            max={field.ordered - field.receivedSoFar}
                                            min={0}
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input {...register(`receivedItems.${index}.bin` as const)} className="w-full p-1 border rounded dark:bg-gray-700 dark:text-gray-100" />
                                    </td>
                                    <td className="p-2">
                                        <input {...register(`receivedItems.${index}.shelf` as const)} className="w-full p-1 border rounded dark:bg-gray-700 dark:text-gray-100" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">Confirm Receipt</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */
export function PurchaseOrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [po, setPo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showReceive, setShowReceive] = useState(false);

    useEffect(() => {
        fetchPO();
    }, [id]);

    const fetchPO = async () => {
        try {
            const res = await api.get(`/purchase-orders/${id}`);
            setPo(res.data.data);
        } catch (error) {
            console.error('Failed to load PO:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (status: string) => {
        if (!confirm(`Change status to ${status}?`)) return;
        try {
            await api.put(`/purchase-orders/${id}`, { status });
            fetchPO();
        } catch (error) {
            console.error('Update failed:', error);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!po) return <div>PO not found</div>;

    const progress = {
        DRAFT: 10,
        PENDING_APPROVAL: 30,
        APPROVED: 50,
        ORDERED: 70,
        PARTIALLY_RECEIVED: 85,
        RECEIVED: 100,
        CANCELLED: 0
    };

    return (
        <div className="space-y-6">
            <Button variant="ghost" className="pl-0" onClick={() => navigate('/procurement/orders')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Orders
            </Button>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                        {po.poNumber}
                        <span className="text-base font-normal px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300">
                            {po.status.replace(/_/g, ' ')}
                        </span>
                    </h1>
                    <p className="text-gray-500 mt-1">Vendor: <span className="font-semibold text-blue-600">{po.vendorId?.name}</span></p>
                </div>

                <div className="flex gap-3">
                    {po.status === 'DRAFT' && (
                        <Button onClick={() => updateStatus('PENDING_APPROVAL')} className="bg-yellow-500 hover:bg-yellow-600 text-white">
                            Submit for Approval
                        </Button>
                    )}
                    {po.status === 'PENDING_APPROVAL' && (
                        <Button onClick={() => updateStatus('APPROVED')} className="bg-green-600 hover:bg-green-700 text-white">
                            Approve Order
                        </Button>
                    )}
                    {po.status === 'APPROVED' && (
                        <Button onClick={() => updateStatus('ORDERED')} className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-black shadow-[0_0_10px_var(--primary-glow)]">
                            Mark as Ordered
                        </Button>
                    )}
                    {(po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED') && (
                        <Button onClick={() => setShowReceive(true)} className="bg-orange-600 hover:bg-orange-700 text-white">
                            <Box className="w-4 h-4 mr-2" /> Receive Goods
                        </Button>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                    className="bg-[var(--primary)] h-2.5 rounded-full transition-all duration-500 shadow-[0_0_10px_var(--primary-glow)]"
                    style={{ width: `${(progress as any)[po.status]}%` }}
                ></div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Order Details */}
                <Card className="md:col-span-2 p-6">
                    <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100">Items</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                                <tr>
                                    <th className="p-3 text-left">Item Details</th>
                                    <th className="p-3 text-right">Qty</th>
                                    <th className="p-3 text-right">Unit Price</th>
                                    <th className="p-3 text-right">Total</th>
                                    <th className="p-3 text-center">Received</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {po.items.map((item: any) => (
                                    <tr key={item._id}>
                                        <td className="p-3">
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                                            <p className="text-xs text-gray-500">{item.description}</p>
                                        </td>
                                        <td className="p-3 text-right text-gray-900 dark:text-gray-100">{item.quantity}</td>
                                        <td className="p-3 text-right text-gray-900 dark:text-gray-100">₹{item.unitPrice?.toLocaleString()}</td>
                                        <td className="p-3 text-right font-medium text-gray-900 dark:text-gray-100">₹{item.totalPrice?.toLocaleString()}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold 
                                                ${item.receivedQuantity >= item.quantity
                                                    ? 'bg-green-100 text-green-700'
                                                    : item.receivedQuantity > 0
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-gray-100 text-gray-500'}`}>
                                                {item.receivedQuantity || 0} / {item.quantity}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t dark:border-gray-700 font-bold">
                                <tr>
                                    <td colSpan={3} className="p-3 text-right text-gray-900 dark:text-gray-100">Grand Total:</td>
                                    <td className="p-3 text-right text-lg text-emerald-600 dark:text-[var(--primary)]">₹{po.totalAmount?.toLocaleString()}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>

                {/* Meta Info */}
                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Timeline</h3>
                        <div className="space-y-4 relative pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                            <div className="relative">
                                <div className="absolute -left-[21px] bg-[var(--primary)] shadow-[0_0_10px_var(--primary-glow)] rounded-full w-3 h-3 mt-1.5"></div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Created</p>
                                <p className="text-xs text-gray-500">{new Date(po.createdAt).toLocaleString()}</p>
                                <p className="text-xs text-gray-500">by {po.requestedBy?.name}</p>
                            </div>
                            {po.approvalDate && (
                                <div className="relative">
                                    <div className="absolute -left-[21px] bg-green-500 rounded-full w-3 h-3 mt-1.5"></div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Approved</p>
                                    <p className="text-xs text-gray-500">{new Date(po.approvalDate).toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">by {po.approvedBy?.name}</p>
                                </div>
                            )}
                            {po.deliveryDate && (
                                <div className="relative">
                                    <div className="absolute -left-[21px] bg-orange-500 rounded-full w-3 h-3 mt-1.5"></div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Delivery Recorded</p>
                                    <p className="text-xs text-gray-500">{new Date(po.deliveryDate).toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Details</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Exp. Delivery</span>
                                <span className="text-gray-900 dark:text-gray-100">{po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Order Date</span>
                                <span className="text-gray-900 dark:text-gray-100">{po.orderDate ? new Date(po.orderDate).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            {po.grnReference && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">GRN Ref</span>
                                    <span className="font-mono text-gray-900 dark:text-gray-100">{po.grnReference}</span>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {showReceive && (
                <ReceiveDialog
                    po={po}
                    onClose={() => setShowReceive(false)}
                    onSuccess={() => { setShowReceive(false); fetchPO(); }}
                />
            )}
        </div>
    );
}

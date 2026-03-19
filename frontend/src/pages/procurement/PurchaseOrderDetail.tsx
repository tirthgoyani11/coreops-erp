import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    ArrowLeft,
    Box,
    Loader2,
    Calendar,
    CircleDollarSign,
    AlertTriangle,
    Sparkles,
    CheckCircle2,
    Clock3,
    Truck,
} from 'lucide-react';

type POStatus =
    | 'DRAFT'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'ORDERED'
    | 'PARTIALLY_RECEIVED'
    | 'RECEIVED'
    | 'CANCELLED';

interface POItem {
    id: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
    receivedQuantity?: number;
}

interface PurchaseOrder {
    id: string;
    poNumber: string;
    status: POStatus;
    createdAt: string;
    expectedDeliveryDate?: string | null;
    orderDate?: string | null;
    approvalDate?: string | null;
    deliveryDate?: string | null;
    totalAmount?: number;
    grnReference?: string | null;
    requestedBy?: { name?: string | null };
    approvedBy?: { name?: string | null };
    vendor?: {
        name?: string | null;
        isBlacklisted?: boolean;
    };
    items: POItem[];
}

const statusLabels: Record<POStatus, string> = {
    DRAFT: 'Draft',
    PENDING_APPROVAL: 'Pending Approval',
    APPROVED: 'Approved',
    ORDERED: 'Ordered',
    PARTIALLY_RECEIVED: 'Partially Received',
    RECEIVED: 'Received',
    CANCELLED: 'Cancelled'
};

const statusClasses: Record<POStatus, string> = {
    DRAFT: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
    PENDING_APPROVAL: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    APPROVED: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    ORDERED: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    PARTIALLY_RECEIVED: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
    RECEIVED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    CANCELLED: 'bg-rose-500/10 text-rose-300 border-rose-500/20'
};

const formatCurrency = (value?: number) => `₹${Number(value || 0).toLocaleString()}`;

/* -------------------------------------------------------------------------- */
/*                               Receive Dialog                               */
/* -------------------------------------------------------------------------- */
function ReceiveDialog({ po, onClose, onSuccess }: any) {
    const { register, control, handleSubmit } = useForm({
        defaultValues: {
            grnReference: '',
            receivedItems: po.items.map((item: any) => ({
                itemId: item.id,
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

            await api.post(`/purchase-orders/${po.id}/receive`, payload);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Receive failed:', error);
            alert('Failed to receive goods');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">Receive Goods</h2>
                        <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">GRN / Delivery Note Ref</label>
                        <input {...register('grnReference')} className="w-full p-2 border rounded bg-[var(--bg-overlay)] border-[var(--border-color)] text-[var(--text-primary)]" placeholder="Optional" />
                    </div>

                    <div className="overflow-auto max-h-[300px] w-full">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-[var(--bg-overlay)] backdrop-blur-md text-[var(--text-muted)] font-medium border-b border-[var(--border-color)] shadow-sm">
                            <tr>
                                <th className="p-2 text-left">Item</th>
                                <th className="p-2 text-right">Ordered</th>
                                <th className="p-2 text-right">Prev Rcvd</th>
                                <th className="p-2 w-24">Receive Qty</th>
                                <th className="p-2 w-24">Bin (Opt)</th>
                                <th className="p-2 w-24">Shelf (Opt)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {fields.map((field: any, index) => (
                                <tr key={field.id} className="group hover:bg-[var(--primary)]/5 transition-colors border-b border-[var(--border-color)]">
                                    <td className="p-2 text-[var(--text-primary)]">{field.name}</td>
                                    <td className="p-2 text-right text-[var(--text-primary)]">{field.ordered}</td>
                                    <td className="p-2 text-right text-[var(--text-primary)]">{field.receivedSoFar}</td>
                                    <td className="p-2">
                                        <input
                                            type="number"
                                            {...register(`receivedItems.${index}.quantityReceived` as const)}
                                            className="w-full p-1 border rounded text-right bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)]"
                                            max={field.ordered - field.receivedSoFar}
                                            min={0}
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input {...register(`receivedItems.${index}.bin` as const)} className="w-full p-1 border rounded bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </td>
                                    <td className="p-2">
                                        <input {...register(`receivedItems.${index}.shelf` as const)} className="w-full p-1 border rounded bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-black">Confirm Receipt</Button>
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
    const [po, setPo] = useState<PurchaseOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [showReceive, setShowReceive] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

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
            setIsUpdating(true);
            await api.put(`/purchase-orders/${id}`, { status });
            fetchPO();
        } catch (error) {
            console.error('Update failed:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="h-72 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }
    if (!po) return <div className="text-center py-12 text-[var(--text-muted)]">PO not found</div>;

    const progress = {
        DRAFT: 10,
        PENDING_APPROVAL: 30,
        APPROVED: 50,
        ORDERED: 70,
        PARTIALLY_RECEIVED: 85,
        RECEIVED: 100,
        CANCELLED: 0
    };

    const totalOrderedQty = po.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const totalReceivedQty = po.items.reduce((sum, item) => sum + Number(item.receivedQuantity || 0), 0);
    const lineCoverage = totalOrderedQty > 0 ? Math.round((totalReceivedQty / totalOrderedQty) * 100) : 0;
    const isOverdue = Boolean(
        po.expectedDeliveryDate &&
        ['APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status) &&
        new Date(po.expectedDeliveryDate).getTime() < Date.now()
    );

    const aiBrief = po.status === 'DRAFT'
        ? 'Draft is ready for review. Validate line item pricing and submit for approval.'
        : po.status === 'PENDING_APPROVAL'
            ? 'Pending approval in queue. Fast-track high-value or urgent material orders.'
            : po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED'
                ? 'Order is in fulfillment. Monitor receipt lag and complete GRN capture quickly.'
                : po.status === 'RECEIVED'
                    ? 'Order is fully received. Close financial reconciliation and archive cycle metrics.'
                    : 'Track this order for policy compliance and lifecycle completion.';

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <Button variant="ghost" className="pl-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => navigate('/procurement/orders')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Orders
            </Button>

            <Card className="p-6 bg-[radial-gradient(circle_at_top_right,rgba(185,255,102,0.12),transparent_45%),var(--bg-card)] border-[var(--border-color)]">
                <div className="flex flex-col xl:flex-row justify-between gap-6">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-bold text-[var(--text-primary)]">{po.poNumber}</h1>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${(statusClasses as any)[po.status]}`}>
                                {statusLabels[po.status]}
                            </span>
                        </div>
                        <p className="text-[var(--text-secondary)] mt-2">Vendor: <span className="font-semibold text-[var(--text-primary)]">{po.vendor?.name || 'Unknown Vendor'}</span></p>
                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-[var(--text-muted)]">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Created {new Date(po.createdAt).toLocaleDateString()}</span>
                            {po.expectedDeliveryDate && <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> ETA {new Date(po.expectedDeliveryDate).toLocaleDateString()}</span>}
                            {po.orderDate && <span>Ordered {new Date(po.orderDate).toLocaleDateString()}</span>}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {po.status === 'DRAFT' && (
                            <>
                                <Button disabled={isUpdating} onClick={() => updateStatus('PENDING_APPROVAL')} className="bg-amber-500 hover:bg-amber-600 text-black">
                                    {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Submit for Approval
                                </Button>
                                <Button disabled={isUpdating} onClick={() => updateStatus('CANCELLED')} variant="outline" className="text-rose-300 border-rose-500/40 hover:bg-rose-500/10">
                                    Cancel Order
                                </Button>
                            </>
                        )}
                        {po.status === 'PENDING_APPROVAL' && (
                            <Button disabled={isUpdating} onClick={() => updateStatus('APPROVED')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Approve Order
                            </Button>
                        )}
                        {po.status === 'APPROVED' && (
                            <Button disabled={isUpdating} onClick={() => updateStatus('ORDERED')} className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-black shadow-[0_0_10px_var(--primary-glow)]">
                                {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Mark as Ordered
                            </Button>
                        )}
                        {(po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED') && (
                            <Button onClick={() => setShowReceive(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                                <Box className="w-4 h-4 mr-2" /> Receive Goods
                            </Button>
                        )}
                    </div>
                </div>

                <div className="w-full bg-[var(--bg-overlay)] rounded-full h-2.5 mt-6">
                    <div
                        className="bg-[var(--primary)] h-2.5 rounded-full transition-all duration-500 shadow-[0_0_10px_var(--primary-glow)]"
                        style={{ width: `${(progress as any)[po.status]}%` }}
                    ></div>
                </div>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <Card className="p-5 border-[var(--border-color)] bg-[var(--bg-card)]">
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Order Value</div>
                    <div className="text-2xl font-bold text-[var(--text-primary)] mt-2 flex items-center gap-2"><CircleDollarSign className="w-5 h-5 text-[var(--primary)]" /> {formatCurrency(po.totalAmount)}</div>
                </Card>
                <Card className="p-5 border-blue-500/20 bg-blue-500/5">
                    <div className="text-xs uppercase tracking-[0.2em] text-blue-300">Receipt Coverage</div>
                    <div className="text-2xl font-bold text-blue-200 mt-2">{lineCoverage}%</div>
                    <div className="text-xs text-blue-300/80 mt-2">{totalReceivedQty}/{totalOrderedQty} units received</div>
                </Card>
                <Card className="p-5 border-amber-500/20 bg-amber-500/5">
                    <div className="text-xs uppercase tracking-[0.2em] text-amber-300">Policy Signal</div>
                    <div className="text-lg font-semibold text-amber-200 mt-2">{po.status === 'PENDING_APPROVAL' ? 'Awaiting authorization' : 'Within control flow'}</div>
                    <div className="text-xs text-amber-300/80 mt-2">Monitor approval SLA and exception routing</div>
                </Card>
                <Card className={`p-5 ${isOverdue ? 'border-rose-500/30 bg-rose-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
                    <div className={`text-xs uppercase tracking-[0.2em] ${isOverdue ? 'text-rose-300' : 'text-emerald-300'}`}>Delivery Risk</div>
                    <div className={`text-lg font-semibold mt-2 ${isOverdue ? 'text-rose-200' : 'text-emerald-200'}`}>{isOverdue ? 'Overdue risk detected' : 'On schedule'}</div>
                    <div className={`text-xs mt-2 ${isOverdue ? 'text-rose-300/80' : 'text-emerald-300/80'}`}>{po.expectedDeliveryDate ? `Expected by ${new Date(po.expectedDeliveryDate).toLocaleDateString()}` : 'No expected date captured'}</div>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 p-6 border-[var(--border-color)] bg-[var(--bg-card)]">
                    <h3 className="font-semibold text-lg mb-4 text-[var(--text-primary)]">Line Items</h3>
                    <div className="overflow-auto max-h-[440px] w-full">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-[var(--bg-overlay)] backdrop-blur-md text-[var(--text-muted)] font-medium border-b border-[var(--border-color)] shadow-sm">
                                <tr>
                                    <th className="p-3 text-left">Item Details</th>
                                    <th className="p-3 text-right">Qty</th>
                                    <th className="p-3 text-right">Unit Price</th>
                                    <th className="p-3 text-right">Total</th>
                                    <th className="p-3 text-center">Received</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {po.items.map((item) => (
                                    <tr key={item.id} className="group hover:bg-[var(--primary)]/5 transition-colors">
                                        <td className="p-3">
                                            <p className="font-medium text-[var(--text-primary)]">{item.name}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{item.description || 'No description provided'}</p>
                                        </td>
                                        <td className="p-3 text-right text-[var(--text-primary)]">{item.quantity}</td>
                                        <td className="p-3 text-right text-[var(--text-primary)]">{formatCurrency(item.unitPrice)}</td>
                                        <td className="p-3 text-right font-medium text-[var(--text-primary)]">{formatCurrency(item.totalPrice)}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold border ${Number(item.receivedQuantity || 0) >= item.quantity
                                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                                : Number(item.receivedQuantity || 0) > 0
                                                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                                    : 'bg-slate-500/10 text-slate-300 border-slate-500/20'}`}>
                                                {item.receivedQuantity || 0} / {item.quantity}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t border-[var(--border-color)] font-bold">
                                <tr>
                                    <td colSpan={3} className="p-3 text-right text-[var(--text-secondary)]">Grand Total:</td>
                                    <td className="p-3 text-right text-lg text-[var(--primary)]">{formatCurrency(po.totalAmount)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card className="p-6 border-[var(--border-color)] bg-[var(--bg-card)]">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Orchestrator Brief</div>
                                <p className="text-sm text-[var(--text-primary)] mt-2 leading-relaxed">{aiBrief}</p>
                            </div>
                            <Sparkles className="w-5 h-5 text-[var(--primary)] shrink-0" />
                        </div>
                        {(isOverdue || po.vendor?.isBlacklisted) && (
                            <div className="mt-4 p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-200 text-xs space-y-2">
                                {isOverdue && <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Delivery timeline breach risk detected.</div>}
                                {po.vendor?.isBlacklisted && <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Vendor is flagged in blacklist lifecycle.</div>}
                            </div>
                        )}
                    </Card>

                    <Card className="p-6 border-[var(--border-color)] bg-[var(--bg-card)]">
                        <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-3">Timeline</h3>
                        <div className="space-y-4 relative pl-4 border-l-2 border-[var(--border-color)]">
                            <div className="relative">
                                <div className="absolute -left-[21px] bg-[var(--primary)] rounded-full w-3 h-3 mt-1.5"></div>
                                <p className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2"><Clock3 className="w-4 h-4 text-[var(--text-secondary)]" /> Created</p>
                                <p className="text-xs text-[var(--text-muted)]">{new Date(po.createdAt).toLocaleString()}</p>
                                <p className="text-xs text-[var(--text-muted)]">by {po.requestedBy?.name || 'System'}</p>
                            </div>
                            {po.approvalDate && (
                                <div className="relative">
                                    <div className="absolute -left-[21px] bg-emerald-500 rounded-full w-3 h-3 mt-1.5"></div>
                                    <p className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Approved</p>
                                    <p className="text-xs text-[var(--text-muted)]">{new Date(po.approvalDate).toLocaleString()}</p>
                                    <p className="text-xs text-[var(--text-muted)]">by {po.approvedBy?.name || 'Approver'}</p>
                                </div>
                            )}
                            {po.deliveryDate && (
                                <div className="relative">
                                    <div className="absolute -left-[21px] bg-blue-500 rounded-full w-3 h-3 mt-1.5"></div>
                                    <p className="text-sm font-medium text-[var(--text-primary)]">Delivery Recorded</p>
                                    <p className="text-xs text-[var(--text-muted)]">{new Date(po.deliveryDate).toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="p-6 border-[var(--border-color)] bg-[var(--bg-card)]">
                        <h3 className="font-semibold text-lg mb-3 text-[var(--text-primary)]">Details</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="text-[var(--text-muted)]">Exp. Delivery</span>
                                <span className="text-[var(--text-primary)]">{po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-[var(--text-muted)]">Order Date</span>
                                <span className="text-[var(--text-primary)]">{po.orderDate ? new Date(po.orderDate).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            {po.grnReference && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-[var(--text-muted)]">GRN Ref</span>
                                    <span className="font-mono text-[var(--text-primary)]">{po.grnReference}</span>
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

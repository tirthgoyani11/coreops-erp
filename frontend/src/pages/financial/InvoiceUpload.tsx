import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FileText, Check } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { InvoiceScanner } from '../../components/InvoiceScanner';

export function InvoiceUpload({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
    const toast = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [scanned, setScanned] = useState(false);

    const { register, handleSubmit, reset, setValue, watch } = useForm({
        defaultValues: {
            vendorName: '',
            invoiceNumber: '',
            date: '',
            totalAmount: '',
            category: 'OPERATIONAL',
            notes: '',
        }
    });

    // Called by InvoiceScanner when user clicks "Fill Expense Form"
    const handleExtracted = (data: any) => {
        if (data.vendorName) setValue('vendorName', data.vendorName);
        if (data.invoiceNumber) setValue('invoiceNumber', data.invoiceNumber);
        if (data.date) setValue('date', data.date.split('T')[0]);
        if (data.totalAmount) setValue('totalAmount', String(data.totalAmount));
        if (data.notes) setValue('notes', data.notes);
        setScanned(true);
        toast.success('Form auto-filled from invoice! Review and submit.');
    };

    const onSubmit = async (data: any) => {
        setSubmitting(true);
        try {
            await api.post('/finance/transactions', {
                type: 'EXPENSE',
                category: data.category,
                amount: Number(data.totalAmount),
                description: `Invoice ${data.invoiceNumber || ''} from ${data.vendorName}`.trim(),
                date: data.date,
                referenceType: 'INVOICE',
                referenceId: data.invoiceNumber || undefined,
                notes: data.notes,
            });
            toast.success('Expense transaction created!');
            reset();
            setScanned(false);
            onUploadSuccess?.();
        } catch {
            toast.error('Failed to save transaction.');
        } finally {
            setSubmitting(false);
        }
    };

    const totalAmount = watch('totalAmount');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── Left: Scanner ── */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-5">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        Scan Invoice
                    </h3>
                </div>
                <InvoiceScanner
                    context="finance"
                    onDataExtracted={handleExtracted}
                />
            </Card>

            {/* ── Right: Review Form ── */}
            <Card className={`p-6 ${!scanned ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            Review &amp; Confirm
                        </h3>
                    </div>
                    {scanned && (
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                            ✓ AI Auto-filled
                        </span>
                    )}
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Vendor Name *</label>
                        <input
                            {...register('vendorName', { required: true })}
                            className="w-full p-2.5 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                            placeholder="Vendor / Supplier name"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Invoice #</label>
                            <input
                                {...register('invoiceNumber')}
                                className="w-full p-2.5 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="INV-001"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Date *</label>
                            <input
                                type="date"
                                {...register('date', { required: true })}
                                className="w-full p-2.5 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Amount *</label>
                            <input
                                type="number"
                                step="0.01"
                                {...register('totalAmount', { required: true })}
                                className="w-full p-2.5 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Category</label>
                            <select
                                {...register('category')}
                                className="w-full p-2.5 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="OPERATIONAL">Operational</option>
                                <option value="MAINTENANCE">Maintenance</option>
                                <option value="SALARY">Salary</option>
                                <option value="UTILITIES">Utilities</option>
                                <option value="MARKETING">Marketing</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Notes</label>
                        <textarea
                            {...register('notes')}
                            rows={2}
                            className="w-full p-2.5 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                            placeholder="Optional notes..."
                        />
                    </div>

                    {totalAmount && (
                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                            Expense Total: ₹{Number(totalAmount).toLocaleString('en-IN')}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={submitting || !scanned}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 mt-2"
                    >
                        {submitting ? 'Creating...' : (
                            <><Check className="w-4 h-4 mr-2 inline" />Create Expense Transaction</>
                        )}
                    </Button>
                    {!scanned && (
                        <p className="text-xs text-center text-gray-400 mt-1">
                            Scan an invoice first to enable this button
                        </p>
                    )}
                </form>
            </Card>
        </div>
    );
}

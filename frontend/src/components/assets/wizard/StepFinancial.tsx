import { DollarSign, Calendar, Truck, ScanLine } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { InvoiceScanner } from '../../InvoiceScanner';

interface StepFinancialProps {
    data: any;
    updateData: (data: any) => void;
    errors: any;
}

export function StepFinancial({ data, updateData, errors }: StepFinancialProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateData({ [e.target.name]: e.target.value });
    };

    const handleOCRExtracted = (extracted: any) => {
        const lineItems = Array.isArray(extracted?.lineItems) ? extracted.lineItems : [];
        const totalFromItems = lineItems.reduce((sum: number, item: any) => {
            const value = Number(item?.total ?? 0);
            return Number.isFinite(value) ? sum + value : sum;
        }, 0);

        const totalAmount = Number(extracted?.totalAmount ?? totalFromItems ?? 0);
        const invoiceNumber = String(extracted?.invoiceNumber || '').trim();
        const vendorName = String(extracted?.vendorName || '').trim();
        const ocrDate = String(extracted?.date || '').trim();

        updateData({
            purchasePrice:
                Number.isFinite(totalAmount) && totalAmount > 0
                    ? String(totalAmount)
                    : data.purchasePrice,
            purchaseDate: ocrDate || data.purchaseDate,
            vendorName: vendorName || data.vendorName,
            invoiceNumber: invoiceNumber || data.invoiceNumber,
            currency: String(extracted?.currency || data.currency || 'INR').toUpperCase(),
        });
    };

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-background)] p-4 md:p-5">
                <div className="mb-3 flex items-center gap-2">
                    <ScanLine size={16} className="text-[var(--primary)]" />
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">Invoice OCR Auto-Fill</h4>
                </div>
                <p className="mb-4 text-xs text-[var(--text-secondary)]">
                    Upload an invoice or bill to auto-fill purchase amount, vendor, date, currency, and invoice number.
                </p>
                <InvoiceScanner onDataExtracted={handleOCRExtracted} context="finance" compact />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Purchase Price */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Purchase Price *</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                        <input
                            type="number"
                            name="purchasePrice"
                            value={data.purchasePrice}
                            onChange={handleChange}
                            className={cn(
                                "w-full pl-10 pr-4 py-3 bg-[var(--bg-background)] border rounded-xl focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--text-primary)] placeholder-[var(--text-secondary)]",
                                errors.purchasePrice ? "border-red-500/50" : "border-[var(--border-color)]"
                            )}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                        />
                    </div>
                    {errors.purchasePrice && <p className="text-xs text-red-400">{errors.purchasePrice}</p>}
                </div>

                {/* Purchase Date */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Purchase Date *</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                        <input
                            type="date"
                            name="purchaseDate"
                            value={data.purchaseDate}
                            onChange={handleChange}
                            className={cn(
                                "w-full pl-10 pr-4 py-3 bg-[var(--bg-background)] border rounded-xl focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--text-primary)] appearance-none", // appearance-none needed for some browsers to style date input
                                errors.purchaseDate ? "border-red-500/50" : "border-[var(--border-color)]"
                            )}
                        />
                    </div>
                    {errors.purchaseDate && <p className="text-xs text-red-400">{errors.purchaseDate}</p>}
                </div>

                {/* Vendor - Simplified for now vs full vendor module dropdown */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Vendor Name</label>
                    <div className="relative">
                        <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                        <input
                            type="text"
                            name="vendorName"
                            value={data.vendorName}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-3 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                            placeholder="e.g. Dell Inc."
                        />
                    </div>
                </div>

                {/* Invoice Number */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Invoice Number</label>
                    <input
                        type="text"
                        name="invoiceNumber"
                        value={data.invoiceNumber || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                        placeholder="e.g. INV-2026-001"
                    />
                </div>

                {/* Warranty Expiry */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Warranty Expiry</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                        <input
                            type="date"
                            name="warrantyExpiryDate"
                            value={data.warrantyExpiryDate}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-3 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--text-primary)] appearance-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

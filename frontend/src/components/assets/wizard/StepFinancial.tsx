import { DollarSign, Calendar, Truck } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface StepFinancialProps {
    data: any;
    updateData: (data: any) => void;
    errors: any;
}

export function StepFinancial({ data, updateData, errors }: StepFinancialProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateData({ [e.target.name]: e.target.value });
    };

    return (
        <div className="space-y-6">
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

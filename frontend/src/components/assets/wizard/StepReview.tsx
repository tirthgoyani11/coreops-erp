import { QrCode, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';

interface StepReviewProps {
    data: any;
    isSubmitting: boolean;
}

export function StepReview({ data, isSubmitting }: StepReviewProps) {
    const mockGUAI = `COR-XXX-${data.category?.substring(0, 4).toUpperCase() || 'XXXX'}-001`;

    return (
        <div className="space-y-6">
            <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-white p-2 rounded-xl">
                    <QrCode className="w-full h-full text-black" />
                </div>
                <div>
                    <p className="text-sm text-[var(--text-secondary)] font-medium">Estimated GUAI</p>
                    <h3 className="text-2xl font-mono font-bold text-[var(--primary)] tracking-wider mt-1">{mockGUAI}</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                        A unique Global Unique Asset Identifier will be permanently assigned upon creation.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <ReviewItem label="Asset Name" value={data.name} />
                <ReviewItem label="Category" value={data.category} />
                <ReviewItem label="Location" value={`${data.officeId ? 'Selected Office' : 'Pending'} / ${data.room || 'N/A'}`} />
                <ReviewItem label="Purchase Price" value={formatCurrency(parseFloat(data.purchasePrice) || 0)} />
                <ReviewItem label="Purchase Date" value={data.purchaseDate || 'N/A'} />
                <ReviewItem label="Vendor" value={data.vendorName || 'N/A'} />
            </div>

            {isSubmitting && (
                <div className="absolute inset-0 bg-[var(--bg-background)]/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl">
                    <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin mb-3" />
                    <p className="font-semibold text-[var(--text-primary)]">Creating Asset...</p>
                </div>
            )}
        </div>
    );
}

function ReviewItem({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex justify-between border-b border-[var(--border-color)] pb-2">
            <span className="text-[var(--text-secondary)]">{label}</span>
            <span className="font-medium text-[var(--text-primary)]">{value}</span>
        </div>
    );
}


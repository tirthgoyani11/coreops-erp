import { QrCode, Loader2, Package, MapPin, DollarSign, Info } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';

interface StepReviewProps {
    data: any;
    isSubmitting: boolean;
}

export function StepReview({ data, isSubmitting }: StepReviewProps) {
    const mockGUAI = `COR-XXX-${data.category?.substring(0, 4).toUpperCase() || 'XXXX'}-001`;

    return (
        <div className="space-y-6 relative">
            {/* GUAI Preview */}
            <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-2xl p-5 flex items-center gap-5">
                <div className="w-16 h-16 bg-white p-2 rounded-xl flex-shrink-0">
                    <QrCode className="w-full h-full text-black" />
                </div>
                <div>
                    <p className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wider">Estimated GUAI</p>
                    <h3 className="text-xl font-mono font-bold text-[var(--primary)] tracking-wider mt-0.5">{mockGUAI}</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                        A unique identifier will be permanently assigned upon creation.
                    </p>
                </div>
            </div>

            {/* Basic Info Section */}
            <ReviewSection icon={<Package size={16} />} title="Basic Info">
                <ReviewItem label="Asset Name" value={data.name} />
                <ReviewItem label="Category" value={data.category} />
                {data.manufacturer && <ReviewItem label="Manufacturer" value={data.manufacturer} />}
                {data.model && <ReviewItem label="Model" value={data.model} />}
                {data.serialNumber && <ReviewItem label="Serial Number" value={data.serialNumber} />}
                {data.description && <ReviewItem label="Description" value={data.description} />}
                <ReviewItem label="Status" value={data.status || 'ACTIVE'} />
            </ReviewSection>

            {/* Location Section */}
            <ReviewSection icon={<MapPin size={16} />} title="Location">
                <ReviewItem label="Office" value={data.officeId ? `Office Selected` : 'Not Set'} />
                {data.building && <ReviewItem label="Building" value={data.building} />}
                {data.floor && <ReviewItem label="Floor" value={data.floor} />}
                {data.room && <ReviewItem label="Room" value={data.room} />}
            </ReviewSection>

            {/* Financial Section */}
            <ReviewSection icon={<DollarSign size={16} />} title="Financial">
                <ReviewItem label="Purchase Price" value={formatCurrency(parseFloat(data.purchasePrice) || 0)} />
                <ReviewItem label="Purchase Date" value={data.purchaseDate || 'N/A'} />
                {data.vendorName && <ReviewItem label="Vendor" value={data.vendorName} />}
                {data.warrantyExpiryDate && <ReviewItem label="Warranty Expires" value={data.warrantyExpiryDate} />}
            </ReviewSection>

            {/* Assignment */}
            {data.assignedTo && (
                <ReviewSection icon={<Info size={16} />} title="Assignment">
                    <ReviewItem label="Assigned To" value={data.assignedTo} />
                </ReviewSection>
            )}

            {isSubmitting && (
                <div className="absolute inset-0 bg-[var(--bg-background)]/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl">
                    <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin mb-3" />
                    <p className="font-semibold text-[var(--text-primary)]">Creating Asset...</p>
                </div>
            )}
        </div>
    );
}

function ReviewSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="border border-[var(--border-color)] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-card-hover)] border-b border-[var(--border-color)]">
                <span className="text-[var(--primary)]">{icon}</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
            </div>
            <div className="p-4 space-y-2">
                {children}
            </div>
        </div>
    );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-[var(--text-secondary)]">{label}</span>
            <span className="font-medium text-[var(--text-primary)] text-right max-w-[60%] truncate">{value || 'N/A'}</span>
        </div>
    );
}

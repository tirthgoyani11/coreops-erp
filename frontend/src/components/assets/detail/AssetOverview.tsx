import { MapPin, Calendar, DollarSign, Box, ShieldCheck, User } from 'lucide-react';

interface AssetOverviewProps {
    asset: any;
}

export function AssetOverview({ asset }: AssetOverviewProps) {
    return (
        <div className="space-y-6">
            {/* Main Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Basic Details Card */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4 hover:border-[var(--primary)]/30 transition-colors">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <Box size={20} className="text-[var(--primary)]" />
                        Asset Details
                    </h3>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <DetailItem label="Manufacturer" value={asset.manufacturer || 'N/A'} />
                        <DetailItem label="Model" value={asset.model || 'N/A'} />
                        <DetailItem label="Serial Number" value={asset.serialNumber || 'N/A'} isMono />
                        <DetailItem label="Category" value={asset.category} />
                    </div>

                    <div className="pt-4 border-t border-[var(--border-color)]">
                        <p className="text-sm text-[var(--text-secondary)] mb-1">Description</p>
                        <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                            {asset.description || "No description provided."}
                        </p>
                    </div>
                </div>

                {/* Location Card */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4 hover:border-blue-400/30 transition-colors">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <MapPin size={20} className="text-blue-400" />
                        Location & Assignment
                    </h3>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <DetailItem label="Office / Branch" value={`${asset.officeId?.name || 'Unassigned'} (${asset.officeId?.code || 'N/A'})`} />
                        <DetailItem label="Building" value={asset.location?.building || 'N/A'} />
                        <DetailItem label="Floor" value={asset.location?.floor || 'N/A'} />
                        <DetailItem label="Room / Area" value={asset.location?.room || 'N/A'} />
                    </div>

                    <div className="pt-4 border-t border-[var(--border-color)] flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${asset.location?.assignedTo ? 'bg-blue-500' : 'bg-[var(--bg-card-hover)]'}`}>
                            <User size={20} className={asset.location?.assignedTo ? '' : 'text-[var(--text-secondary)]'} />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--text-secondary)]">Assigned To</p>
                            <p className={`text-sm font-medium ${asset.location?.assignedTo ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] italic'}`}>
                                {asset.location?.assignedTo?.name || asset.location?.assignedTo?.email || 'Unassigned'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Financial Summary (Mini) */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4 hover:border-emerald-400/30 transition-colors">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <DollarSign size={20} className="text-emerald-400" />
                        Purchase Info
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <DetailItem label="Purchase Price" value={`$${asset.purchasePrice?.toFixed(2) || '0.00'}`} />
                        <DetailItem label="Purchase Date" value={new Date(asset.purchaseDate).toLocaleDateString()} />
                        <DetailItem label="Vendor" value={asset.vendorName || 'N/A'} />
                        <DetailItem label="Order No." value={asset.purchaseOrderNumber || 'N/A'} />
                    </div>
                </div>

                {/* Warranty Status */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4 hover:border-amber-400/30 transition-colors">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <ShieldCheck size={20} className="text-amber-400" />
                        Warranty Status
                    </h3>

                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${asset.warrantyExpiryDate ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Warranty Expiry</p>
                            <p className="text-lg font-bold text-[var(--text-primary)]">
                                {asset.warrantyExpiryDate ? new Date(asset.warrantyExpiryDate).toLocaleDateString() : 'No Warranty / Expired'}
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function DetailItem({ label, value, isMono = false }: { label: string, value: string, isMono?: boolean }) {
    return (
        <div>
            <p className="text-xs text-[var(--text-secondary)] mb-1">{label}</p>
            <p className={`font-medium text-[var(--text-primary)] ${isMono ? 'font-mono tracking-wide' : ''}`}>
                {value}
            </p>
        </div>
    );
}

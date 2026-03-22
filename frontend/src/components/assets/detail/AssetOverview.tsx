import { MapPin, Calendar, DollarSign, Box, ShieldCheck, User } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';

interface AssetOverviewProps {
    asset: any;
}

export function AssetOverview({ asset }: AssetOverviewProps) {
    // Warranty check
    const hasWarranty = asset.warrantyEnd && new Date(asset.warrantyEnd) > new Date();
    const assetCurrency = (asset.currency || 'INR').toUpperCase();
    const valuation = asset.valuation || null;
    const workflow = asset.workflow || null;

    return (
        <div className="space-y-6">
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
                        <DetailItem label="Office / Branch" value={`${asset.office?.name || 'Unassigned'} (${asset.office?.code || 'N/A'})`} />
                        <DetailItem label="Building" value={asset.building || 'N/A'} />
                        <DetailItem label="Floor" value={asset.floor || 'N/A'} />
                        <DetailItem label="Room / Area" value={asset.room || 'N/A'} />
                    </div>

                    <div className="pt-4 border-t border-[var(--border-color)] flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${asset.assignedTo ? 'bg-blue-500' : 'bg-[var(--bg-card-hover)]'}`}>
                            <User size={20} className={asset.assignedTo ? '' : 'text-[var(--text-secondary)]'} />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--text-secondary)]">Assigned To</p>
                            <p className={`text-sm font-medium ${asset.assignedTo ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] italic'}`}>
                                {asset.assignedTo?.name || asset.assignedTo?.email || 'Unassigned'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4 hover:border-emerald-400/30 transition-colors">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <DollarSign size={20} className="text-emerald-400" />
                        Purchase Info
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <DetailItem label="Purchase Price" value={formatCurrency(asset.purchasePrice ?? 0, assetCurrency)} />
                        <DetailItem label="Purchase Date" value={asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'N/A'} />
                        <DetailItem label="Currency" value={assetCurrency} />
                        <DetailItem label="Vendor" value={asset.vendorName || 'N/A'} />
                        <DetailItem label="Order No." value={asset.purchaseOrderNumber || 'N/A'} />
                    </div>

                    {valuation && (
                        <div className="pt-4 border-t border-[var(--border-color)] space-y-2">
                            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Dual Currency Snapshot</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                <div className="rounded-lg border border-[var(--border-color)] p-2.5 bg-[var(--bg-card-hover)]/30">
                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase">Branch</p>
                                    <p className="font-semibold text-[var(--text-primary)]">{formatCurrency(Number(valuation.officeAmount || 0), valuation.officeCurrency || assetCurrency)}</p>
                                </div>
                                <div className="rounded-lg border border-[var(--border-color)] p-2.5 bg-[var(--bg-card-hover)]/30">
                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase">HQ</p>
                                    <p className="font-semibold text-[var(--text-primary)]">{formatCurrency(Number(valuation.hqAmount || 0), valuation.hqCurrency || 'INR')}</p>
                                </div>
                                <div className="rounded-lg border border-[var(--border-color)] p-2.5 bg-[var(--bg-card-hover)]/30">
                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase">Live FX Rate</p>
                                    <p className="font-semibold text-[var(--text-primary)]">1 {valuation.officeCurrency} = {Number(valuation.hqRate || 1).toFixed(4)} {valuation.hqCurrency}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Warranty Status */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4 hover:border-amber-400/30 transition-colors">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <ShieldCheck size={20} className="text-amber-400" />
                        Warranty Status
                    </h3>

                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${hasWarranty ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Warranty Expiry</p>
                            <p className="text-lg font-bold text-[var(--text-primary)]">
                                {asset.warrantyEnd ? new Date(asset.warrantyEnd).toLocaleDateString() : 'No Warranty / Expired'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4 hover:border-sky-400/30 transition-colors md:col-span-2">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Workflow Integration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="rounded-lg border border-[var(--border-color)] p-3 bg-[var(--bg-card-hover)]/20">
                            <p className="text-xs text-[var(--text-secondary)]">Purchase Order</p>
                            <p className="font-semibold text-[var(--text-primary)] mt-1">{workflow?.purchaseOrder?.poNumber || asset.purchaseOrderNumber || 'Not linked'}</p>
                            {workflow?.purchaseOrder?.id && (
                                <a className="text-xs text-sky-400 hover:underline" href={`/purchase-orders/${workflow.purchaseOrder.id}`}>Open PO</a>
                            )}
                        </div>
                        <div className="rounded-lg border border-[var(--border-color)] p-3 bg-[var(--bg-card-hover)]/20">
                            <p className="text-xs text-[var(--text-secondary)]">Invoice</p>
                            <p className="font-semibold text-[var(--text-primary)] mt-1">{workflow?.invoice?.invoiceNumber || asset.invoiceNumber || 'Not linked'}</p>
                            <a className="text-xs text-sky-400 hover:underline" href="/financial/working-capital">Open AP/AR</a>
                        </div>
                        <div className="rounded-lg border border-[var(--border-color)] p-3 bg-[var(--bg-card-hover)]/20">
                            <p className="text-xs text-[var(--text-secondary)]">Maintenance</p>
                            <p className="font-semibold text-[var(--text-primary)] mt-1">{workflow?.maintenance?.openTickets ?? 0} open / {workflow?.maintenance?.totalTickets ?? 0} total</p>
                            <a className="text-xs text-sky-400 hover:underline" href={`/maintenance?assetId=${asset.id}`}>Open Tickets</a>
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

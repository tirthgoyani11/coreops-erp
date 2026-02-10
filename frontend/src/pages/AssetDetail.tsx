import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Edit,
    Printer,
    DollarSign,
    Activity,
    Loader2,
    AlertTriangle
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { cn, formatCurrency } from '../lib/utils';
import { jsPDF } from 'jspdf';

interface Asset {
    _id: string;
    guai: string;
    name: string;
    category: string;
    status: string;
    model: string;
    manufacturer: string;
    serialNumber: string;
    qrCode?: string;
    purchaseInfo: {
        purchasePrice: number;
        currency: string;
        purchaseDate: string;
        vendor?: { name: string; email: string };
        orderNumber?: string;
        invoiceNumber?: string;
        warranty?: {
            endDate: string;
        };
    };
    location: {
        building: string;
        floor: string;
        room: string;
    };
    depreciation?: {
        currentBookValue: number;
        usefulLife: number;
    };
    officeId: {
        name: string;
        code: string;
    };
    maintenanceHistory: Array<{
        date: string;
        type: string;
        cost: number;
        notes: string;
    }>;
    ageInYears?: number;
    warrantyDaysRemaining?: number;
    notes?: string;
}

export function AssetDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [asset, setAsset] = useState<Asset | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const canEdit = ['SUPER_ADMIN', 'MANAGER'].includes(user?.role || '');

    useEffect(() => {
        const fetchAsset = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/assets/${id}`);
                setAsset(res.data.data);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load asset');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchAsset();
    }, [id]);

    const handlePrintQR = () => {
        if (!asset?.qrCode) return;

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(asset.name, 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(asset.guai, 105, 30, { align: 'center' });

        doc.addImage(asset.qrCode, 'PNG', 75, 40, 60, 60);

        doc.setFontSize(10);
        doc.text('Property of CoreOps ERP', 105, 110, { align: 'center' });

        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }

    if (error || !asset) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                <AlertTriangle size={48} className="mb-4 text-amber-500" />
                <p>{error || 'Asset not found'}</p>
                <button
                    onClick={() => navigate('/assets')}
                    className="mt-4 px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700"
                >
                    Back to Assets
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/assets')}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            {asset.name}
                            <span className={cn(
                                "px-2 py-0.5 text-xs font-medium rounded-full border ml-2",
                                asset.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-slate-500/10 text-slate-500"
                            )}>
                                {asset.status}
                            </span>
                        </h1>
                        <p className="text-slate-400 font-mono">{asset.guai}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handlePrintQR}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700"
                    >
                        <Printer size={18} /> Print Tag
                    </button>
                    {canEdit && (
                        <button
                            onClick={() => navigate(`/assets/${asset._id}/edit`)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                        >
                            <Edit size={18} /> Edit Asset
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Details Grid */}
                    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Activity size={20} className="text-blue-400" />
                            Asset Details
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div>
                                <p className="text-sm text-slate-400">Category</p>
                                <p className="text-white font-medium">{asset.category}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Model</p>
                                <p className="text-white font-medium">{asset.model || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Serial</p>
                                <p className="text-white font-medium font-mono text-xs mt-1">{asset.serialNumber || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Office</p>
                                <p className="text-white font-medium">{asset.officeId?.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Location</p>
                                <p className="text-white font-medium">
                                    {asset.location?.room || asset.location?.floor || 'Unassigned'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Financials */}
                    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <DollarSign size={20} className="text-emerald-400" />
                            Financial Overview
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <p className="text-sm text-slate-400">Purchase Cost</p>
                                <p className="text-white font-medium">
                                    {formatCurrency(asset.purchaseInfo?.purchasePrice || 0, asset.purchaseInfo?.currency || 'INR')}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Current Value</p>
                                <p className="text-white font-medium">
                                    {formatCurrency(asset.depreciation?.currentBookValue || 0, asset.purchaseInfo?.currency || 'INR')}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Purchase Date</p>
                                <p className="text-white font-medium">
                                    {asset.purchaseInfo?.purchaseDate ? new Date(asset.purchaseInfo.purchaseDate).toLocaleDateString() : '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Warranty</p>
                                <p className={cn("font-medium", (asset.warrantyDaysRemaining || 0) > 0 ? "text-emerald-400" : "text-red-400")}>
                                    {(asset.warrantyDaysRemaining || 0) > 0 ? `${asset.warrantyDaysRemaining} days left` : 'Expired'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Maintenance History */}
                    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Maintenance History</h2>
                        {(!asset.maintenanceHistory || asset.maintenanceHistory.length === 0) ? (
                            <p className="text-slate-500 text-sm">No maintenance records found.</p>
                        ) : (
                            <div className="space-y-4">
                                {asset.maintenanceHistory.map((record, idx) => (
                                    <div key={idx} className="flex items-start justify-between border-b border-slate-700/50 pb-4 last:border-0 last:pb-0">
                                        <div>
                                            <p className="text-white font-medium">{record.type}</p>
                                            <p className="text-sm text-slate-400">{record.notes}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white font-medium">{formatCurrency(record.cost || 0, 'INR')}</p>
                                            <p className="text-xs text-slate-500">{new Date(record.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* QR Code Card */}
                    <div className="bg-white rounded-xl p-6 flex flex-col items-center text-center">
                        <h3 className="text-slate-900 font-bold text-lg mb-2">Asset Tag</h3>
                        {asset.qrCode ? (
                            <img src={asset.qrCode} alt="QR Code" className="w-48 h-48 object-contain mb-4" />
                        ) : (
                            <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                                No QR Code
                            </div>
                        )}
                        <p className="text-slate-600 font-mono font-medium">{asset.guai}</p>
                        <p className="text-xs text-slate-400 mt-1">Scan to view details</p>
                    </div>

                    {/* Vendor Info */}
                    {asset.purchaseInfo?.vendor && (
                        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Vendor Support</h3>
                            <div className="space-y-3">
                                <p className="text-white font-medium">{asset.purchaseInfo.vendor.name}</p>
                                <p className="text-sm text-slate-400">{asset.purchaseInfo.vendor.email}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AssetDetail;

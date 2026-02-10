import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Save,
    X,
    Tag,
    DollarSign,
    MapPin,
    Loader2
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface AssetFormData {
    name: string;
    category: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    status: string;
    purchaseCost: number;
    currency: string;
    purchaseDate: string;
    purchaseOrderNumber: string;
    invoiceNumber: string;
    vendor: string; // ID
    warrantyStartDate: string;
    warrantyEndDate: string;
    locationBuilding: string;
    locationFloor: string;
    locationRoom: string;
    officeId: string;
    notes: string;
}

const CATEGORY_CODES = {
    LAPTOP: 'Laptop',
    COMPUTER: 'Computer',
    FURNITURE: 'Furniture',
    VEHICLE: 'Vehicle',
    EQUIPMENT: 'Equipment',
    PHONE: 'Phone',
    PRINTER: 'Printer',
    SERVER: 'Server',
    NETWORK: 'Network',
    MACHINERY: 'Machinery',
    OTHER: 'Other',
};

export function AssetForm() {
    const { id } = useParams(); // If id exists, it's Edit mode
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode);
    const [vendors, setVendors] = useState<any[]>([]);
    const [offices, setOffices] = useState<any[]>([]);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<AssetFormData>({
        defaultValues: {
            status: 'ACTIVE',
            currency: 'INR',
            officeId: (user?.officeId as any)?._id || user?.officeId || '',
        }
    });

    useEffect(() => {
        const fetchDependencies = async () => {
            try {
                // Fetch vendors
                const vendorRes = await api.get('/vendors');
                setVendors(vendorRes.data.data || []);

                // Fetch offices if super admin
                if (user?.role === 'SUPER_ADMIN') {
                    const officeRes = await api.get('/offices');
                    setOffices(officeRes.data.data || []);
                }

                // If edit mode, fetch asset
                if (isEditMode) {
                    const assetRes = await api.get(`/assets/${id}`);
                    const asset = assetRes.data.data;

                    // Map generic asset data to form structure
                    reset({
                        name: asset.name,
                        category: asset.category,
                        manufacturer: asset.manufacturer,
                        model: asset.model,
                        serialNumber: asset.serialNumber,
                        status: asset.status,
                        purchaseCost: asset.purchaseInfo?.purchasePrice,
                        currency: asset.purchaseInfo?.currency,
                        purchaseDate: asset.purchaseInfo?.purchaseDate?.split('T')[0],
                        purchaseOrderNumber: asset.purchaseInfo?.purchaseOrderNumber,
                        invoiceNumber: asset.purchaseInfo?.invoiceNumber,
                        vendor: (asset.purchaseInfo?.vendor as any)?._id || asset.purchaseInfo?.vendor,
                        warrantyStartDate: asset.purchaseInfo?.warranty?.startDate?.split('T')[0],
                        warrantyEndDate: asset.purchaseInfo?.warranty?.endDate?.split('T')[0],
                        locationBuilding: asset.location?.building,
                        locationFloor: asset.location?.floor,
                        locationRoom: asset.location?.room,
                        officeId: asset.officeId?._id || asset.officeId,
                        notes: asset.notes,
                    });
                }
            } catch (error) {
                console.error("Failed to load form data", error);
            } finally {
                setInitialLoading(false);
            }
        };

        fetchDependencies();
    }, [id, user, reset]);

    const onSubmit = async (data: AssetFormData) => {
        try {
            setLoading(true);

            // Format data for API
            const payload = {
                ...data,
                // Ensure numbers are numbers
                purchaseCost: Number(data.purchaseCost),
            };

            if (isEditMode) {
                await api.patch(`/assets/${id}`, payload);
            } else {
                await api.post('/assets', payload);
            }

            navigate('/assets');
        } catch (error: any) {
            console.error("Failed to save asset", error);
            alert(error.response?.data?.message || 'Failed to save asset');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        {isEditMode ? 'Edit Asset' : 'New Asset'}
                    </h1>
                    <p className="text-slate-400">
                        {isEditMode ? 'Update asset details' : 'Register a new asset into inventory'}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/assets')}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Basic Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6 space-y-6"
                >
                    <div className="flex items-center gap-2 text-blue-400 border-b border-slate-700/50 pb-4">
                        <Tag size={20} />
                        <h2 className="text-lg font-semibold">Basic Information</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Asset Name *</label>
                            <input
                                {...register('name', { required: 'Name is required' })}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                placeholder="e.g. MacBook Pro M3"
                            />
                            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Category *</label>
                            <select
                                {...register('category', { required: 'Category is required' })}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Select Category</option>
                                {Object.keys(CATEGORY_CODES).map(code => (
                                    <option key={code} value={code}>{CATEGORY_CODES[code as keyof typeof CATEGORY_CODES]}</option>
                                ))}
                            </select>
                            {errors.category && <span className="text-xs text-red-500">{errors.category.message}</span>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Status</label>
                            <select
                                {...register('status')}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="MAINTENANCE">In Maintenance</option>
                                <option value="RETIRED">Retired</option>
                                <option value="LOST">Lost</option>
                            </select>
                        </div>

                        {user?.role === 'SUPER_ADMIN' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Office</label>
                                <select
                                    {...register('officeId', { required: 'Office is required for Admins' })}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select Office</option>
                                    {offices.map(office => (
                                        <option key={office._id} value={office._id}>{office.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Manufacturer</label>
                            <input
                                {...register('manufacturer')}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Model</label>
                            <input
                                {...register('model')}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Serial Number</label>
                            <input
                                {...register('serialNumber')}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Financial Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6 space-y-6"
                >
                    <div className="flex items-center gap-2 text-emerald-400 border-b border-slate-700/50 pb-4">
                        <DollarSign size={20} />
                        <h2 className="text-lg font-semibold">Financial & Purchase Details</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Purchase Cost *</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register('purchaseCost', { required: 'Cost is required', min: 0 })}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                            </div>
                            {errors.purchaseCost && <span className="text-xs text-red-500">{errors.purchaseCost.message}</span>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Vendor</label>
                            <select
                                {...register('vendor')}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                            >
                                <option value="">Select Vendor</option>
                                {vendors.map(vendor => (
                                    <option key={vendor._id} value={vendor._id}>{vendor.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Purchase Date</label>
                            <input
                                type="date"
                                {...register('purchaseDate')}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Warranty Expiration</label>
                            <input
                                type="date"
                                {...register('warrantyEndDate')}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Location Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6 space-y-6"
                >
                    <div className="flex items-center gap-2 text-purple-400 border-b border-slate-700/50 pb-4">
                        <MapPin size={20} />
                        <h2 className="text-lg font-semibold">Location</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Building</label>
                            <input
                                {...register('locationBuilding')}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Floor</label>
                            <input
                                {...register('locationFloor')}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Room / Desk</label>
                            <input
                                {...register('locationRoom')}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Notes</label>
                        <textarea
                            {...register('notes')}
                            rows={3}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                            placeholder="Additional details..."
                        />
                    </div>
                </motion.div>

                {/* Submit Button */}
                <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/assets')}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        Save Asset
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AssetForm;

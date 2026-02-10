import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    Filter,
    Edit,
    Eye,
    QrCode,
    MapPin,
    AlertCircle,
    Loader2
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { cn } from '../lib/utils';

interface Asset {
    _id: string;
    guai: string;
    name: string;
    category: string;
    status: string;
    serialNumber: string;
    location: {
        building: string;
        floor: string;
        room: string;
    };
    qrCode?: string;
    officeId: {
        _id: string;
        name: string;
    };
}

export function AssetList() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const canEdit = ['SUPER_ADMIN', 'MANAGER'].includes(user?.role || '');

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                setLoading(true);
                const res = await api.get('/assets');
                const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
                setAssets(data);
            } catch (error) {
                console.error("Failed to fetch assets", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAssets();
    }, []);

    const filteredAssets = assets.filter(asset => {
        const matchesSearch =
            asset.name.toLowerCase().includes(search.toLowerCase()) ||
            asset.guai.toLowerCase().includes(search.toLowerCase()) ||
            asset.serialNumber?.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter ? asset.status === statusFilter : true;

        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20';
            case 'MAINTENANCE': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'RETIRED': return 'bg-white/5 text-white/40 border-white/10';
            case 'LOST': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-white/5 text-white/60 border-white/10';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-[var(--primary)] rounded-full shadow-[0_0_10px_var(--primary)]" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">Asset Inventory</h1>
                        <p className="text-[var(--text-muted)] text-sm">Manage and track organization assets</p>
                    </div>
                </div>

                {canEdit && (
                    <button
                        onClick={() => navigate('/assets/new')}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-black font-bold rounded-xl hover:opacity-90 transition-all active:scale-95 hover:shadow-[0_0_20px_rgba(185,255,102,0.3)]"
                    >
                        <Plus size={20} />
                        <span>Add Asset</span>
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
                    <input
                        type="text"
                        placeholder="Search by Name, GUAI, Serial..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-card)] border border-white/10 rounded-xl text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]/50 transition-colors"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-card)] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[var(--primary)]/50 transition-colors appearance-none"
                    >
                        <option value="">All Statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="MAINTENANCE">In Maintenance</option>
                        <option value="RETIRED">Retired</option>
                        <option value="LOST">Lost</option>
                    </select>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-[var(--primary)]" size={40} />
                </div>
            ) : filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] bg-[var(--bg-card)] rounded-3xl border border-dashed border-white/10">
                    <AlertCircle size={48} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium">No assets found</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAssets.map((asset, index) => (
                        <motion.div
                            key={asset._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group bg-[var(--bg-card)] border border-white/5 rounded-[2rem] overflow-hidden hover:border-white/20 hover:bg-[#1f1f22] transition-all cursor-pointer relative"
                            onClick={() => navigate(`/assets/${asset._id}`)}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[var(--primary)] group-hover:scale-110 group-hover:bg-[var(--primary)] group-hover:text-black transition-all duration-300">
                                            <QrCode size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white group-hover:text-[var(--primary)] transition-colors">
                                                {asset.name}
                                            </h3>
                                            <p className="text-sm text-[var(--text-muted)] font-mono">{asset.guai}</p>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "px-2.5 py-1 text-xs font-medium rounded-full border",
                                        getStatusColor(asset.status)
                                    )}>
                                        {asset.status}
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm text-[var(--text-muted)] mb-4">
                                    <div className="flex justify-between">
                                        <span>Category:</span>
                                        <span className="text-white/80">{asset.category}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Office:</span>
                                        <span className="text-white/80 truncate max-w-[150px]">{asset.officeId?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-1"><MapPin size={12} /> Location:</span>
                                        <span className="text-white/80">
                                            {asset.location?.room || asset.location?.floor || 'Unassigned'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-white/5">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); navigate(`/assets/${asset._id}`); }}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl transition-colors text-sm font-medium"
                                    >
                                        <Eye size={16} /> View
                                    </button>
                                    {canEdit && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); navigate(`/assets/${asset._id}/edit`); }}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] rounded-xl transition-colors text-sm font-medium"
                                        >
                                            <Edit size={16} /> Edit
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Glow effect on hover */}
                            <div className="absolute -right-20 -bottom-20 w-40 h-40 bg-[var(--primary)]/10 blur-[80px] group-hover:bg-[var(--primary)]/20 transition-all duration-500" />
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default AssetList;

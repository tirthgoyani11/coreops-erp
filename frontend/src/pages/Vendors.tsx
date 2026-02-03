import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Star, TrendingUp, Plus, X, Loader2, Search, Filter } from 'lucide-react';
import api from '../lib/api';

interface Vendor {
    _id: string;
    vendorCode: string;
    name: string;
    type: string;
    contactInfo: {
        email?: string;
        phone?: string;
        contactPerson?: string;
    };
    reliabilityScore: {
        overallScore: number;
        deliveryScore: number;
        qualityScore: number;
    };
    performanceMetrics: {
        totalOrders: number;
        completedOrders: number;
        onTimeDeliveryRate?: number;
    };
    isActive: boolean;
    blacklisted: boolean;
}

const VENDOR_TYPES = ['supplier', 'service_provider', 'both'];

export function Vendors() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        type: 'supplier',
        contactInfo: {
            email: '',
            phone: '',
            primaryContact: ''
        }
    });

    useEffect(() => {
        fetchVendors();
    }, [searchTerm, filterType]);

    const fetchVendors = async () => {
        try {
            const params: any = {};
            if (searchTerm) params.search = searchTerm;
            if (filterType) params.type = filterType;

            const res = await api.get('/vendors', { params });
            setVendors(res.data.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        console.log('Submitting vendor:', formData);
        try {
            await api.post('/vendors', formData);
            setShowModal(false);
            setFormData({
                name: '',
                type: 'supplier',
                contactInfo: { email: '', phone: '', primaryContact: '' }
            });
            fetchVendors();
        } catch (error: any) {
            console.error('Vendor creation failed:', error.response?.data);
            const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to create vendor';
            alert(`Error: ${errorMsg}`);
        } finally {
            setFormLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-400';
        if (score >= 60) return 'text-amber-400';
        return 'text-red-400';
    };

    const activeVendors = vendors.filter(v => v.isActive && !v.blacklisted);
    const avgScore = activeVendors.length > 0
        ? Math.round(activeVendors.reduce((sum, v) => sum + (v.reliabilityScore?.overallScore || 0), 0) / activeVendors.length)
        : 0;

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-[#18181b] rounded-3xl animate-pulse border border-white/5" />
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-48 bg-[#18181b] rounded-[2rem] animate-pulse border border-white/5" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-[var(--bg-card)] border border-white/5 p-6 rounded-3xl">
                    <p className="text-[var(--text-muted)] font-medium mb-1">Total Vendors</p>
                    <h2 className="text-3xl font-bold text-white">{vendors.length}</h2>
                </div>

                <div className="bg-[var(--bg-card)] border border-white/5 p-6 rounded-3xl">
                    <p className="text-[var(--text-muted)] font-medium mb-1">Active Vendors</p>
                    <h2 className="text-3xl font-bold text-emerald-400">{activeVendors.length}</h2>
                </div>

                <div className="bg-[var(--bg-card)] border border-white/5 p-6 rounded-3xl">
                    <p className="text-[var(--text-muted)] font-medium mb-1">Avg Reliability</p>
                    <h2 className={`text-3xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}%</h2>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="bg-[var(--primary)] text-black rounded-3xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-[var(--primary)]/90 transition-colors active:scale-95"
                >
                    <Plus className="w-8 h-8 p-1.5 bg-black/10 rounded-full" />
                    <span className="font-bold">Add Vendor</span>
                </button>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search vendors..."
                        className="w-full bg-[#27272a] border border-white/5 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-[var(--primary)]"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <select
                        className="bg-[#27272a] border border-white/5 rounded-xl pl-12 pr-8 py-3 text-white focus:outline-none focus:border-[var(--primary)] appearance-none"
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                    >
                        <option value="">All Types</option>
                        {VENDOR_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Vendor Grid */}
            <div>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
                    <div className="w-1.5 h-6 bg-[var(--primary)] rounded-full shadow-[0_0_10px_var(--primary)]" />
                    Vendor Directory ({vendors.length})
                </h3>

                {vendors.length === 0 ? (
                    <div className="text-center py-20 bg-[#18181b] rounded-[2rem] border border-white/5">
                        <Building2 className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
                        <h3 className="text-xl font-bold mb-2">No Vendors Found</h3>
                        <p className="text-[var(--text-muted)]">Add your first vendor to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {vendors.map((vendor, i) => (
                            <motion.div
                                key={vendor._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-[var(--bg-card)] border border-white/5 p-6 rounded-[2rem] hover:border-white/20 hover:bg-[#1f1f22] transition-all group cursor-pointer relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[var(--primary)] group-hover:scale-110 group-hover:bg-[var(--primary)] group-hover:text-black transition-all duration-300">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Star className={`w-4 h-4 ${getScoreColor(vendor.reliabilityScore?.overallScore || 0)}`} />
                                        <span className={`font-bold ${getScoreColor(vendor.reliabilityScore?.overallScore || 0)}`}>
                                            {vendor.reliabilityScore?.overallScore || 0}%
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <h4 className="text-lg font-bold text-white group-hover:text-[var(--primary)] transition-colors truncate">{vendor.name}</h4>
                                    <p className="text-xs text-[var(--text-muted)] font-mono">{vendor.vendorCode}</p>
                                </div>

                                <div className="space-y-2 text-sm text-[var(--text-muted)]">
                                    <p className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-xs">{vendor.type}</span>
                                    </p>
                                    {vendor.contactInfo?.email && (
                                        <p className="truncate">{vendor.contactInfo.email}</p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5">
                                    <div className="flex items-center gap-1 text-sm">
                                        <TrendingUp className="w-4 h-4 text-[var(--text-muted)]" />
                                        <span className="text-white font-medium">{vendor.performanceMetrics?.totalOrders || 0}</span>
                                        <span className="text-[var(--text-muted)]">orders</span>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${vendor.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {vendor.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>

                                <div className="absolute -right-20 -bottom-20 w-40 h-40 bg-[var(--primary)]/10 blur-[80px] group-hover:bg-[var(--primary)]/20 transition-all duration-500" />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Vendor Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#18181b] border border-white/10 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-[var(--text-muted)]">
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-2xl font-bold mb-6">Add New Vendor</h2>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Vendor Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#27272a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)]"
                                        placeholder="e.g., ABC Electronics"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Type</label>
                                    <select
                                        className="w-full bg-[#27272a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)]"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        {VENDOR_TYPES.map(type => (
                                            <option key={type} value={type}>
                                                {type === 'supplier' ? 'Supplier' : type === 'service_provider' ? 'Service Provider' : 'Both'}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Email *</label>
                                    <input
                                        type="email"
                                        className="w-full bg-[#27272a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)]"
                                        placeholder="vendor@example.com"
                                        value={formData.contactInfo.email}
                                        onChange={e => setFormData({ ...formData, contactInfo: { ...formData.contactInfo, email: e.target.value } })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Phone</label>
                                    <input
                                        type="tel"
                                        className="w-full bg-[#27272a] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--primary)]"
                                        placeholder="+91 98765 43210"
                                        value={formData.contactInfo.phone}
                                        onChange={e => setFormData({ ...formData, contactInfo: { ...formData.contactInfo, phone: e.target.value } })}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="w-full bg-[var(--primary)] text-black font-bold py-4 rounded-xl mt-2 hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Vendor'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

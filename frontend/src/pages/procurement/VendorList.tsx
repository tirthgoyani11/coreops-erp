import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    Plus,
    Search,
    Filter,
    Truck,
    Loader2,
    RefreshCw,
    Brain,
    Sparkles,
    AlertTriangle,
    ShieldAlert,
    Ban,
    Undo2,
    Eye,
    Pencil,
    Building2,
    Mail,
    Phone,
    TrendingUp,
} from 'lucide-react';

interface Vendor {
    id: string;
    name: string;
    vendorCode: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    isActive: boolean;
    isBlacklisted: boolean;
    reliabilityMetrics?: {
        overallScore?: number;
        deliveryScore?: number;
        fulfillmentScore?: number;
    };
    performanceMetrics?: {
        totalOrders?: number;
        completedOrders?: number;
    };
}

type StatusFilter = 'all' | 'active' | 'blacklisted' | 'atRisk';

export function VendorList() {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionBusyById, setActionBusyById] = useState<Record<string, boolean>>({});
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    useEffect(() => {
        const timer = window.setTimeout(() => {
            fetchVendors(false);
        }, 250);
        return () => window.clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchVendors(false);
    }, []);

    const fetchVendors = async (silent: boolean) => {
        try {
            if (!silent) {
                setLoading(true);
            } else {
                setRefreshing(true);
            }

            const res = await api.get('/vendors', {
                params: {
                    includeBlacklisted: 'true',
                    search: searchTerm.trim() || undefined,
                },
            });

            setVendors(res.data.data);
            setError('');
        } catch (err) {
            console.error('Failed to fetch vendors:', err);
            setError('Unable to load vendors. Please refresh and try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const filteredVendors = useMemo(() => vendors.filter((v) => {
        const query = searchTerm.trim().toLowerCase();
        const matchesSearch = !query ||
            v.name.toLowerCase().includes(query) ||
            v.vendorCode.toLowerCase().includes(query) ||
            (v.contactPerson || '').toLowerCase().includes(query) ||
            (v.email || '').toLowerCase().includes(query);

        const score = v.reliabilityMetrics?.overallScore || 0;
        const matchesStatus = statusFilter === 'all'
            ? true
            : statusFilter === 'active'
                ? (v.isActive && !v.isBlacklisted)
                : statusFilter === 'blacklisted'
                    ? v.isBlacklisted
                    : score < 70;

        return matchesSearch && matchesStatus;
    }), [vendors, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        const total = vendors.length;
        const active = vendors.filter((v) => v.isActive && !v.isBlacklisted).length;
        const blacklisted = vendors.filter((v) => v.isBlacklisted).length;
        const atRisk = vendors.filter((v) => (v.reliabilityMetrics?.overallScore || 0) < 70 && !v.isBlacklisted).length;
        const avgReliability = total
            ? Math.round(vendors.reduce((sum, v) => sum + (v.reliabilityMetrics?.overallScore || 0), 0) / total)
            : 0;
        return { total, active, blacklisted, atRisk, avgReliability };
    }, [vendors]);

    const orchestratorUrgency = stats.atRisk >= 4 ? 'HIGH' : stats.atRisk > 0 ? 'MEDIUM' : 'LOW';
    const orchestratorHeadline =
        stats.atRisk > 0
            ? `${stats.atRisk} vendor(s) are below reliability threshold. Trigger corrective sourcing actions.`
            : 'Vendor network reliability is within policy. Continue strategic consolidation.';

    const handleBlacklist = async (vendor: Vendor) => {
        try {
            setActionBusyById((prev) => ({ ...prev, [vendor.id]: true }));
            await api.delete(`/vendors/${vendor.id}`);
            setMessage(`${vendor.name} has been blacklisted.`);
            void fetchVendors(true);
            window.setTimeout(() => setMessage(''), 4000);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to blacklist vendor.');
        } finally {
            setActionBusyById((prev) => ({ ...prev, [vendor.id]: false }));
        }
    };

    const handleRestore = async (vendor: Vendor) => {
        try {
            setActionBusyById((prev) => ({ ...prev, [vendor.id]: true }));
            await api.put(`/vendors/${vendor.id}`, { isBlacklisted: false, isActive: true });
            setMessage(`${vendor.name} has been restored.`);
            void fetchVendors(true);
            window.setTimeout(() => setMessage(''), 4000);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to restore vendor.');
        } finally {
            setActionBusyById((prev) => ({ ...prev, [vendor.id]: false }));
        }
    };

    if (loading) {
        return (
            <div className="min-h-[55vh] grid place-items-center">
                <div className="inline-flex items-center gap-3 text-[var(--text-secondary)]">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--primary)]" />
                    Loading vendor command center...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Vendor Command Center</h1>
                    <p className="text-sm text-[var(--text-secondary)]">Supplier intelligence, risk controls, and lifecycle operations</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => fetchVendors(true)}>
                        {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Refresh
                    </Button>
                    <Button onClick={() => navigate('/vendors/new')} className="bg-[var(--primary)] text-black hover:bg-[var(--primary)]/90 border-none shadow-[0_0_15px_var(--primary-glow)]">
                        <Plus className="w-4 h-4 mr-2" /> Add Vendor
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Card className="p-4">
                    <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Total Vendors</div>
                    <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{stats.total}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Active</div>
                    <div className="mt-2 text-2xl font-bold text-emerald-400">{stats.active}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">At Risk</div>
                    <div className="mt-2 text-2xl font-bold text-yellow-300">{stats.atRisk}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Blacklisted</div>
                    <div className="mt-2 text-2xl font-bold text-red-300">{stats.blacklisted}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Avg Reliability</div>
                    <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{stats.avgReliability}%</div>
                </Card>
            </div>

            <Card className={`p-5 ${orchestratorUrgency === 'HIGH' ? 'border-red-500/40 bg-red-500/10' : orchestratorUrgency === 'MEDIUM' ? 'border-yellow-500/40 bg-yellow-500/10' : 'border-emerald-500/40 bg-emerald-500/10'}`}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-xs uppercase tracking-wide flex items-center gap-2">
                            <Brain className="w-4 h-4" /> Central AI Orchestrator - Vendor Brief
                        </div>
                        <div className="mt-2 font-semibold">{orchestratorHeadline}</div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full border border-current/30">{orchestratorUrgency}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm">
                    <div className="rounded-lg border border-current/20 bg-black/10 p-3 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 mt-0.5" />
                        Prioritize corrective plans for vendors below 70 reliability score.
                    </div>
                    <div className="rounded-lg border border-current/20 bg-black/10 p-3 flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 mt-0.5" />
                        Blacklist policy should be tied to repeated SLA or quality violations.
                    </div>
                    <div className="rounded-lg border border-current/20 bg-black/10 p-3 flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 mt-0.5" />
                        Shift high-value orders to stable partners during risk periods.
                    </div>
                </div>
            </Card>

            {message && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> {message}
                </div>
            )}
            {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> {error}
                </div>
            )}

            <div className="flex gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[240px] max-w-lg">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                    <input
                        type="text"
                        placeholder="Search vendor, code, contact or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className="pl-10 pr-4 py-2 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 appearance-none cursor-pointer"
                    >
                        <option value="all">All Vendors</option>
                        <option value="active">Active</option>
                        <option value="atRisk">At Risk (&lt;70)</option>
                        <option value="blacklisted">Blacklisted</option>
                    </select>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredVendors.map((vendor) => {
                    const score = vendor.reliabilityMetrics?.overallScore || 0;
                    const isRisk = score < 70 && !vendor.isBlacklisted;
                    const isBusy = !!actionBusyById[vendor.id];

                    return (
                        <Card key={vendor.id} className="p-5 hover:shadow-lg transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[var(--bg-overlay)] flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-[var(--primary)]" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[var(--text-primary)] leading-tight">{vendor.name}</h3>
                                        <p className="text-xs text-[var(--text-secondary)] font-mono">{vendor.vendorCode}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${vendor.isBlacklisted ? 'bg-red-500/10 text-red-300 border border-red-500/30' : vendor.isActive ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-gray-500/10 text-gray-300 border border-gray-500/30'}`}>
                                    {vendor.isBlacklisted ? 'Blacklisted' : vendor.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div className="space-y-2 text-sm text-[var(--text-secondary)] mb-4">
                                <div className="flex items-center gap-2 truncate">
                                    <Mail className="w-4 h-4" />
                                    <span className="truncate">{vendor.email || 'No email'}</span>
                                </div>
                                <div className="flex items-center gap-2 truncate">
                                    <Phone className="w-4 h-4" />
                                    <span className="truncate">{vendor.phone || 'No phone'}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="rounded-lg border border-[var(--border-color)] p-2 text-center">
                                    <div className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">Reliability</div>
                                    <div className={`font-bold text-sm ${score >= 80 ? 'text-emerald-300' : score >= 70 ? 'text-yellow-300' : 'text-red-300'}`}>{score}%</div>
                                </div>
                                <div className="rounded-lg border border-[var(--border-color)] p-2 text-center">
                                    <div className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">On-Time</div>
                                    <div className="font-bold text-sm text-[var(--text-primary)] inline-flex items-center gap-1 justify-center">
                                        <Truck className="w-3 h-3 text-[var(--primary)]" />
                                        {vendor.reliabilityMetrics?.deliveryScore || 0}%
                                    </div>
                                </div>
                                <div className="rounded-lg border border-[var(--border-color)] p-2 text-center">
                                    <div className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">Orders</div>
                                    <div className="font-bold text-sm text-[var(--text-primary)]">{vendor.performanceMetrics?.totalOrders || 0}</div>
                                </div>
                            </div>

                            {isRisk && (
                                <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300 inline-flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3" />
                                    Risk flagged for sourcing review
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 pt-3 border-t border-[var(--border-color)]">
                                <Button size="sm" variant="outline" onClick={() => navigate(`/vendors/${vendor.id}`)}>
                                    <Eye className="w-3.5 h-3.5 mr-1" /> View
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => navigate(`/vendors/${vendor.id}/edit`)}>
                                    <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                                </Button>

                                {vendor.isBlacklisted ? (
                                    <Button size="sm" variant="outline" disabled={isBusy} onClick={() => handleRestore(vendor)}>
                                        {isBusy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Undo2 className="w-3.5 h-3.5 mr-1" />}
                                        Restore
                                    </Button>
                                ) : (
                                    <Button size="sm" variant="destructive" disabled={isBusy} onClick={() => handleBlacklist(vendor)}>
                                        {isBusy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Ban className="w-3.5 h-3.5 mr-1" />}
                                        Blacklist
                                    </Button>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>

            {filteredVendors.length === 0 && !loading && (
                <Card className="p-10 text-center">
                    <Building2 className="w-8 h-8 mx-auto text-[var(--text-secondary)] mb-3" />
                    <p className="text-[var(--text-secondary)]">No vendors match the current filters.</p>
                </Card>
            )}
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User as UserIcon, Mail, Shield, Building2, Phone, Calendar, Loader2, ArrowLeft, Watch, Wrench, HardDrive, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import type { Office } from '../types';

interface UserDetail {
    id: string;
    name: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
    isActive: boolean;
    phone: string | null;
    avatar: string | null;
    createdAt: string;
    lastLogin: string | null;
    office: { id: string; name: string; code: string } | null;
    _count: {
        assignedAssets: number;
        requestedTickets: number;
        assignedTickets: number;
    };
}

export default function UserDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore();
    const [user, setUser] = useState<UserDetail | null>(null);
    const [offices, setOffices] = useState<Office[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<UserDetail>>({});

    useEffect(() => {
        const fetchUserAndOffices = async () => {
            try {
                setIsLoading(true);
                const [userRes, officesRes] = await Promise.all([
                    api.get(`/users/${id}`),
                    api.get('/offices')
                ]);

                if (userRes.data.success) {
                    setUser(userRes.data.data);
                    setFormData(userRes.data.data);
                }
                if (officesRes.data.success) {
                    setOffices(officesRes.data.data);
                }
            } catch (err: any) {
                console.error(err);
                setError(err.response?.data?.message || 'Failed to load user profile');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchUserAndOffices();
    }, [id]);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            setError(null);

            // Format payload
            const payload = {
                name: formData.name,
                phone: formData.phone,
                role: formData.role,
                officeId: formData.office?.id,
                isActive: formData.isActive
            };

            const { data } = await api.put(`/users/${id}`, payload);
            if (data.success) {
                // Update local state with saved data
                setUser(prev => prev ? { ...prev, ...data.data } : null);
                setIsEditing(false);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update user');
        } finally {
            setIsSaving(false);
        }
    };

    const canEdit = currentUser?.role === 'SUPER_ADMIN' ||
        (currentUser?.role === 'MANAGER' && currentUser.officeId === user?.office?.id) ||
        (currentUser?.id === user?.id);

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN': return 'bg-red-500/20 text-red-400';
            case 'MANAGER': return 'bg-blue-500/20 text-blue-400';
            case 'TECHNICIAN': return 'bg-orange-500/20 text-orange-400';
            case 'VIEWER': return 'bg-emerald-500/20 text-emerald-400';
            default: return 'bg-[var(--bg-card-hover)] text-[var(--text-muted)] border border-[var(--border-color)]';
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                    <Shield className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Access Denied or Not Found</h2>
                <p className="text-[var(--text-muted)] mb-6">{error || 'User not found'}</p>
                <button
                    onClick={() => navigate('/users')}
                    className="px-4 py-2 bg-[var(--bg-overlay)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                    Back to Users
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/users')}
                    className="p-2 hover:bg-[var(--bg-overlay)] rounded-lg transition-colors text-[var(--text-secondary)]"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        User Profile
                        {!user.isActive && (
                            <span className="text-xs px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                                Inactive
                            </span>
                        )}
                    </h1>
                    {canEdit && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-4 py-2 bg-[var(--bg-overlay)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors"
                        >
                            Edit Profile
                        </button>
                    )}
                    {isEditing && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setFormData(user);
                                    setIsEditing(false);
                                }}
                                className="px-4 py-2 bg-[var(--bg-overlay)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 bg-[var(--primary)] text-black font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Avatar & Quick Stats */}
                <div className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 flex flex-col items-center text-center"
                    >
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--primary)] to-cyan-500 flex items-center justify-center text-black font-bold text-3xl mb-4 shadow-lg shadow-[var(--primary)]/20">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">{user.name}</h2>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                                <Shield className="w-3 h-3 inline mr-1" />
                                {user.role.replace('_', ' ')}
                            </span>
                        </div>
                        <div className="w-full h-px bg-[var(--border-color)] my-6"></div>
                        <div className="w-full space-y-3 text-left">
                            <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                                <Mail className="w-4 h-4" />
                                <span className="text-sm truncate">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                                <Building2 className="w-4 h-4" />
                                <span className="text-sm truncate">{user.office?.name || 'Global Access'}</span>
                            </div>
                            {user.phone && (
                                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                                    <Phone className="w-4 h-4" />
                                    <span className="text-sm truncate">{user.phone}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                                <Calendar className="w-4 h-4" />
                                <span className="text-sm truncate">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Workload Stats */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
                        <h3 className="font-semibold text-[var(--text-primary)] mb-4">Current Workload</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-color)]">
                                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                                    <HardDrive className="w-5 h-5 text-blue-400" />
                                    <span className="text-sm font-medium">Assigned Assets</span>
                                </div>
                                <span className="text-lg font-bold text-[var(--text-primary)]">{user._count.assignedAssets}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-color)]">
                                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                                    <Wrench className="w-5 h-5 text-orange-400" />
                                    <span className="text-sm font-medium">Assigned Tickets</span>
                                </div>
                                <span className="text-lg font-bold text-[var(--text-primary)]">{user._count.assignedTickets}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-color)]">
                                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                                    <UserIcon className="w-5 h-5 text-[var(--primary)]" />
                                    <span className="text-sm font-medium">Requested Tickets</span>
                                </div>
                                <span className="text-lg font-bold text-[var(--text-primary)]">{user._count.requestedTickets}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Details & Edit Form */}
                <div className="lg:col-span-2">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6"
                    >
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                            <UserIcon className="w-5 h-5 text-[var(--primary)]" />
                            {isEditing ? 'Edit Information' : 'Personal Information'}
                        </h3>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Full Name</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.name || ''}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                        />
                                    ) : (
                                        <p className="text-[var(--text-primary)] font-medium p-2 bg-[var(--bg-overlay)] rounded-lg border border-transparent">{user.name}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Email Address</label>
                                    <p className="text-[var(--text-secondary)] font-medium p-2 bg-[var(--bg-overlay)]/50 rounded-lg border border-[var(--border-color)]/50 cursor-not-allowed">
                                        {user.email} <span className="text-xs ml-2 opacity-50">(Read-only)</span>
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Phone Number</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.phone || ''}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-3 py-2 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    ) : (
                                        <p className="text-[var(--text-primary)] font-medium p-2 bg-[var(--bg-overlay)] rounded-lg border border-transparent">{user.phone || 'Not provided'}</p>
                                    )}
                                </div>

                                {/* Administrative Fields (only Super Admin or authorized manager can edit) */}
                                {isEditing && currentUser?.role === 'SUPER_ADMIN' ? (
                                    <>
                                        <div>
                                            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Role</label>
                                            <select
                                                value={formData.role || ''}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                className="w-full px-3 py-2 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                            >
                                                <option value="SUPER_ADMIN">Super Admin</option>
                                                <option value="ADMIN">Admin</option>
                                                <option value="MANAGER">Manager</option>
                                                <option value="STAFF">Staff</option>
                                                <option value="TECHNICIAN">Technician</option>
                                                <option value="VIEWER">Viewer</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Office Location</label>
                                            <select
                                                value={formData.office?.id || ''}
                                                onChange={(e) => setFormData({ ...formData, office: { ...formData.office!, id: e.target.value } })}
                                                className="w-full px-3 py-2 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                            >
                                                <option value="">Global Access (No Office)</option>
                                                {offices.map(office => (
                                                    <option key={office.id} value={office.id}>{office.name} ({office.code})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Account Status</label>
                                            <div className="flex items-center gap-3 p-2 bg-[var(--bg-overlay)] rounded-lg border border-[var(--border-color)]">
                                                <input
                                                    type="checkbox"
                                                    id="isActive"
                                                    checked={formData.isActive || false}
                                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                                    className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--primary)] focus:ring-[var(--primary)] bg-[var(--bg-card)]"
                                                />
                                                <label htmlFor="isActive" className="text-sm font-medium text-[var(--text-primary)] cursor-pointer">
                                                    Active user account
                                                </label>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">System Role</label>
                                            <p className="text-[var(--text-secondary)] font-medium p-2 bg-[var(--bg-overlay)]/50 rounded-lg border border-[var(--border-color)]/50 cursor-not-allowed">
                                                {user.role.replace('_', ' ')}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Primary Office</label>
                                            <p className="text-[var(--text-secondary)] font-medium p-2 bg-[var(--bg-overlay)]/50 rounded-lg border border-[var(--border-color)]/50 cursor-not-allowed">
                                                {user.office?.name || 'None'}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="pt-6 border-t border-[var(--border-color)] mt-8">
                                <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">System Activity</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-color)]">
                                        <Watch className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                                        <div>
                                            <p className="text-xs text-[var(--text-muted)]">Last Login</p>
                                            <p className="text-sm font-medium text-[var(--text-primary)]">
                                                {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never logged in'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-color)]">
                                        <Shield className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                                        <div>
                                            <p className="text-xs text-[var(--text-muted)]">Account Created</p>
                                            <p className="text-sm font-medium text-[var(--text-primary)]">
                                                {new Date(user.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

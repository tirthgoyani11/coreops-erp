import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users as UsersIcon, Plus, Mail, Shield, Loader2, Search, Building2 } from 'lucide-react';
import api from '../lib/api';
import type { Office } from '../types';

interface UserWithOffice {
    _id: string;
    id: string;
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'MANAGER' | 'STAFF' | 'TECHNICIAN' | 'VIEWER';
    officeId: Office | null;
    isActive: boolean;
}

import type { UserRole } from '../types';

export function Users() {
    const [users] = useState<UserWithOffice[]>([]);
    const [offices, setOffices] = useState<Office[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'STAFF' as UserRole,
        officeId: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            // Note: You'll need to add a /api/users endpoint to the backend
            // For now, we'll show a placeholder
            const officesRes = await api.get('/offices');
            if (officesRes.data.success) {
                setOffices(officesRes.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const payload = {
                ...formData,
                officeId: formData.role === 'SUPER_ADMIN' ? undefined : formData.officeId,
            };
            const { data } = await api.post('/auth/register', payload);
            if (data.success) {
                setShowCreateModal(false);
                setFormData({ name: '', email: '', password: '', role: 'STAFF', officeId: '' });
                // Refresh users list
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN':
                return 'bg-red-500/20 text-red-400';
            case 'MANAGER':
                return 'bg-blue-500/20 text-blue-400';
            case 'TECHNICIAN':
                return 'bg-orange-500/20 text-orange-400';
            case 'VIEWER':
                return 'bg-emerald-500/20 text-emerald-400';
            default:
                return 'bg-zinc-700 text-zinc-300';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Users</h1>
                    <p className="text-zinc-500 text-sm mt-1">
                        Manage system users and their permissions
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-black font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                    <Plus className="w-4 h-4" />
                    Add User
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-80 pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--primary)]"
                />
            </div>

            {/* Users List */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
                </div>
            ) : users.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-900 flex items-center justify-center">
                        <UsersIcon className="w-8 h-8 text-zinc-600" />
                    </div>
                    <p className="text-zinc-500 mb-4">
                        User listing requires a dedicated API endpoint.
                        <br />
                        You can create new users using the button above.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map((user, index) => (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-cyan-500 flex items-center justify-center text-black font-bold">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-white truncate">{user.name}</h3>
                                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                                        <Mail className="w-3 h-3" />
                                        <span className="truncate">{user.email}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                                    <Shield className="w-3 h-3 inline mr-1" />
                                    {user.role.replace('_', ' ')}
                                </span>
                                {user.officeId && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                                        <Building2 className="w-3 h-3" />
                                        {user.officeId.code}
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md"
                    >
                        <h2 className="text-xl font-bold text-white mb-4">Create New User</h2>

                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[var(--primary)]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[var(--primary)]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1.5">Password</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[var(--primary)]"
                                    placeholder="Min 6 characters"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1.5">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[var(--primary)]"
                                >
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="STAFF">Staff</option>
                                    <option value="TECHNICIAN">Technician</option>
                                    <option value="VIEWER">Viewer</option>
                                </select>
                            </div>
                            {formData.role !== 'SUPER_ADMIN' && (
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1.5">Office</label>
                                    <select
                                        value={formData.officeId}
                                        onChange={(e) => setFormData({ ...formData, officeId: e.target.value })}
                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[var(--primary)]"
                                        required
                                    >
                                        <option value="">Select an office</option>
                                        {offices.map((office) => (
                                            <option key={office._id} value={office._id}>
                                                {office.name} ({office.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-[var(--primary)] text-black font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        'Create User'
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

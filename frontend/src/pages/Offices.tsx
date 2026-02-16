import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Plus, MapPin, Loader2, Search, Edit2 } from 'lucide-react';
import api from '../lib/api';
import type { Office } from '../types';

export function Offices() {
    const [offices, setOffices] = useState<Office[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        country: '',
        currency: 'INR',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchOffices = async () => {
        try {
            setIsLoading(true);
            const { data } = await api.get('/offices');
            if (data.success) {
                setOffices(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch offices:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOffices();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const { data } = await api.post('/offices', formData);
            if (data.success) {
                setOffices([data.data, ...offices]);
                setShowCreateModal(false);
                setFormData({ name: '', code: '', country: '', currency: 'INR' });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create office');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredOffices = offices.filter(
        (office) =>
            office.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            office.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Offices</h1>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">
                        Manage all office locations
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-black font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                    <Plus className="w-4 h-4" />
                    Add Office
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                    type="text"
                    placeholder="Search offices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-80 pl-10 pr-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                />
            </div>

            {/* Offices Grid */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
                </div>
            ) : filteredOffices.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                    {searchTerm ? 'No offices match your search' : 'No offices created yet'}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOffices.map((office, index) => (
                        <motion.div
                            key={office._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 hover:border-[var(--text-secondary)] transition-colors group"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-[var(--primary)]" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[var(--text-primary)]">{office.name}</h3>
                                        <p className="text-xs text-[var(--text-secondary)] font-mono">{office.code}</p>
                                    </div>
                                </div>
                                <button className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="mt-4 flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {office.country || 'Not set'}
                                </div>
                                <div className="px-2 py-0.5 bg-[var(--bg-overlay)] rounded text-xs font-mono">
                                    {office.currency}
                                </div>
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
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-md"
                    >
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Create New Office</h2>

                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Office Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Office Code</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full px-3 py-2 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--primary)]"
                                    placeholder="e.g., NYC-01"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Country</label>
                                <input
                                    type="text"
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Currency</label>
                                <select
                                    value={formData.currency}
                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                >
                                    <option value="INR">INR - Indian Rupee</option>
                                    <option value="USD">USD - US Dollar</option>
                                    <option value="EUR">EUR - Euro</option>
                                    <option value="GBP">GBP - British Pound</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 bg-[var(--bg-overlay)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors"
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
                                        'Create Office'
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

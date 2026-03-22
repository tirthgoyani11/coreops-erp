import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, DollarSign, Briefcase, Plus, X, Loader2, Search, Filter } from 'lucide-react';
import api from '../../lib/api';

interface Customer {
    id: string;
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    creditLimit: number;
    outstanding: number;
    status: string;
}

export function Customers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        name: '', company: '', email: '', phone: '', address: '', creditLimit: 0
    });

    useEffect(() => {
        fetchCustomers();
    }, [searchTerm]);

    const fetchCustomers = async () => {
        try {
            const params: any = {};
            if (searchTerm) params.search = searchTerm;
            const res = await api.get('/customers', { params });
            setCustomers(res.data.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            await api.post('/customers', formData);
            setShowModal(false);
            setFormData({ name: '', company: '', email: '', phone: '', address: '', creditLimit: 0 });
            fetchCustomers();
        } catch (error: any) {
            alert(`Error: ${error.response?.data?.message || 'Failed'}`);
        } finally {
            setFormLoading(false);
        }
    };

    if (loading) return <div className="animate-pulse h-96 bg-[var(--bg-card)] rounded-3xl" />;

    return (
        <div className="space-y-8">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl">
                    <p className="text-[var(--text-secondary)] font-medium mb-1">Total Customers</p>
                    <h2 className="text-3xl font-bold text-[var(--text-primary)]">{customers.length}</h2>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl">
                    <p className="text-[var(--text-secondary)] font-medium mb-1">Active Accounts</p>
                    <h2 className="text-3xl font-bold text-emerald-600">{customers.filter(c => c.status === 'ACTIVE').length}</h2>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-[var(--primary)] text-black rounded-3xl p-6 flex flex-col items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-95"
                >
                    <Plus className="w-8 h-8 p-1.5 bg-black/10 rounded-full" />
                    <span className="font-bold">Add Customer</span>
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customers.map((c, i) => (
                    <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-[2rem] relative overflow-hidden group cursor-pointer"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-overlay)] flex items-center justify-center text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-black transition-colors">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-[var(--text-primary)]">{c.name}</h4>
                                <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
                                    <Briefcase className="w-3 h-3" /> {c.company || 'Individual'}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                            <p>{c.email}</p>
                            <p>{c.phone}</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex justify-between text-sm">
                            <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4 text-emerald-500" />
                                <span>Limit: ${c.creditLimit}</span>
                            </div>
                            <span className={c.status === 'ACTIVE' ? 'text-emerald-500' : 'text-red-500'}>{c.status}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-[var(--bg-card)] border border-[var(--border-color)] p-8 rounded-3xl w-full max-w-lg shadow-2xl relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-[var(--bg-overlay)]"><X className="w-5 h-5" /></button>
                            <h2 className="text-2xl font-bold mb-6">Add New Customer</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <input placeholder="Full Name" required className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl px-4 py-3" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                <input placeholder="Company Name" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl px-4 py-3" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} />
                                <input type="email" placeholder="Email" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl px-4 py-3" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                <input placeholder="Phone" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl px-4 py-3" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                <input type="number" placeholder="Credit Limit" className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl px-4 py-3" value={formData.creditLimit} onChange={e => setFormData({ ...formData, creditLimit: parseInt(e.target.value) })} />
                                <button type="submit" disabled={formLoading} className="w-full bg-[var(--primary)] text-black font-bold py-4 rounded-xl mt-4 flex justify-center">
                                    {formLoading ? <Loader2 className="animate-spin" /> : 'Create Customer'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

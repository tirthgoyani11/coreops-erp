import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, XCircle } from 'lucide-react';
import api from '../../lib/api';

interface Quotation {
    id: string;
    quotationNumber: string;
    customer: { name: string };
    totalAmount: number;
    status: string;
    createdAt: string;
}

export function Quotations() {
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchQuotes();
    }, []);

    const fetchQuotes = async () => {
        try {
            const res = await api.get('/quotations');
            setQuotations(res.data.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await api.patch(`/quotations/${id}`, { status });
            fetchQuotes();
        } catch (error: any) {
            alert(`Error: ${error.response?.data?.message || 'Update failed'}`);
        }
    };

    if (loading) return <div className="h-96 animate-pulse bg-[var(--bg-card)] rounded-3xl" />;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                <FileText className="w-6 h-6 text-[var(--primary)]" />
                Sales Quotations
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quotations.length === 0 && (
                    <div className="col-span-full p-8 text-center bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)]">
                        <p className="text-[var(--text-secondary)]">No quotations available.</p>
                    </div>
                )}
                {quotations.map((q, i) => (
                    <motion.div
                        key={q.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-6 bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-color)] relative"
                    >
                        <div className="flex justify-between mb-4">
                            <span className={`px-3 py-1 text-xs rounded-full font-bold ${
                                q.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-400' :
                                q.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                                'bg-amber-500/20 text-amber-500'
                            }`}>
                                {q.status}
                            </span>
                            <span className="font-mono text-sm text-[var(--text-secondary)]">{q.quotationNumber}</span>
                        </div>
                        <h3 className="text-xl font-bold mb-1 text-[var(--text-primary)]">{q.customer?.name}</h3>
                        <p className="text-[var(--text-secondary)] text-sm mb-4">
                            Issued: {new Date(q.createdAt).toLocaleDateString()}
                        </p>
                        
                        <div className="text-2xl font-mono font-bold text-[var(--text-primary)] mb-6">
                            ${q.totalAmount}
                        </div>

                        {q.status === 'DRAFT' || q.status === 'SENT' ? (
                            <div className="flex gap-2 border-t border-[var(--border-color)] pt-4 mt-4">
                                <button 
                                    onClick={() => updateStatus(q.id, 'ACCEPTED')}
                                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-black transition-colors text-sm font-bold"
                                >
                                    <CheckCircle className="w-4 h-4" /> Accept
                                </button>
                                <button 
                                    onClick={() => updateStatus(q.id, 'REJECTED')}
                                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-colors text-sm font-bold"
                                >
                                    <XCircle className="w-4 h-4" /> Reject
                                </button>
                            </div>
                        ) : null}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

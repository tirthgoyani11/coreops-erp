import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, CheckCircle, Play, Loader2, User, Clock } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { cn } from '../lib/utils';

interface Ticket {
    _id: string;
    ticketNumber: string;
    assetId: { _id: string; name: string; location?: string; model?: string };
    issueDescription: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: string;
    reportedDate: string;
    requestedBy: { name: string };
    assignedTo?: { _id: string; name: string };
    repairCost?: number;
    decision?: string;
}

export default function TicketDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [completionNotes, setCompletionNotes] = useState('');
    const [showCompleteModal, setShowCompleteModal] = useState(false);

    useEffect(() => {
        fetchTicket();
    }, [id]);

    const fetchTicket = async () => {
        try {
            const res = await api.get(`/maintenance?_id=${id}`); // Get all and filter locally or assuming getById exists?
            // Wait, maintenanceController.getMaintenance returns array. 
            // Is there a getById?
            // maintenanceRoutes has validaton.getById middleware but no GET /:id route!
            // It only has POST /:id/action.
            // I need to fetch all and find, OR add GET /:id route.
            // For now, I'll fetch list and find.
            const allTickets = res.data.data;
            const found = allTickets.find((t: any) => t._id === id);
            setTicket(found || null);
        } catch (error) {
            console.error('Failed to fetch ticket:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartWork = async () => {
        if (!confirm('Start work on this ticket? It will be assigned to you.')) return;
        setActionLoading(true);
        try {
            await api.post(`/maintenance/${id}/start`);
            fetchTicket(); // Refresh
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to start work');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCompleteWork = async () => {
        setActionLoading(true);
        try {
            await api.post(`/maintenance/${id}/complete`, { notes: completionNotes });
            setShowCompleteModal(false);
            fetchTicket();
            navigate('/dashboard/tech'); // Go back to dashboard on completion
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to complete work');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;
    if (!ticket) return <div className="text-center py-20 text-[var(--text-primary)]">Ticket not found</div>;

    const priorityColors = {
        critical: 'text-red-400 bg-red-500/10',
        high: 'text-orange-400 bg-orange-500/10',
        medium: 'text-yellow-400 bg-yellow-500/10',
        low: 'text-blue-400 bg-blue-500/10',
    };

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-[var(--bg-overlay)] rounded-full text-[var(--text-primary)]">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold text-[var(--text-primary)] uppercase tracking-wider">{ticket.ticketNumber}</h1>
                <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase", priorityColors[ticket.priority])}>
                    {ticket.priority}
                </span>
            </div>

            {/* Asset Info Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
                <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-4">Asset Details</h2>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">{ticket.assetId.name}</h3>
                        <p className="text-sm text-[var(--text-secondary)]">{ticket.assetId.model || 'Unknown Model'}</p>
                    </div>
                    {ticket.assetId.location && (
                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] bg-[var(--bg-overlay)] px-3 py-1.5 rounded-lg">
                            <MapPin className="w-4 h-4" />
                            {ticket.assetId.location}
                        </div>
                    )}
                </div>
            </div>

            {/* Issue Details */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
                <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase mb-4">Issue Description</h2>
                <p className="text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{ticket.issueDescription}</p>

                <div className="mt-6 flex flex-wrap gap-4 pt-6 border-t border-[var(--border-color)]">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <User className="w-4 h-4" />
                        Requested by {ticket.requestedBy.name}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Clock className="w-4 h-4" />
                        Reported {new Date(ticket.reportedDate).toLocaleDateString()}
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--bg-card)]/80 backdrop-blur-md border-t border-[var(--border-color)]">
                <div className="max-w-2xl mx-auto flex gap-3">
                    {ticket.status === 'APPROVED' && (
                        <button
                            onClick={handleStartWork}
                            disabled={actionLoading}
                            className="flex-1 py-4 bg-[var(--primary)] text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Play className="w-5 h-5" /> START WORK</>}
                        </button>
                    )}

                    {ticket.status === 'IN_PROGRESS' && ticket.assignedTo?._id === user?._id && (
                        <button
                            onClick={() => setShowCompleteModal(true)}
                            disabled={actionLoading}
                            className="flex-1 py-4 bg-emerald-500 text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            <CheckCircle className="w-5 h-5" /> COMPLETE WORK
                        </button>
                    )}

                    {ticket.status === 'COMPLETED' && (
                        <div className="flex-1 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-center font-bold flex items-center justify-center gap-2">
                            <CheckCircle className="w-5 h-5" /> COMPLETED
                        </div>
                    )}
                </div>
            </div>

            {/* Complete Modal */}
            {showCompleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 w-full max-w-md"
                    >
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Complete Maintenance</h2>
                        <textarea
                            className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] min-h-[120px] mb-4"
                            placeholder="Add completion notes (work done, parts used, etc)..."
                            value={completionNotes}
                            onChange={(e) => setCompletionNotes(e.target.value)}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCompleteModal(false)}
                                className="flex-1 py-3 bg-[var(--bg-overlay)] text-[var(--text-primary)] font-bold rounded-xl hover:bg-[var(--bg-card-hover)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCompleteWork}
                                disabled={actionLoading}
                                className="flex-1 py-3 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Completion'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

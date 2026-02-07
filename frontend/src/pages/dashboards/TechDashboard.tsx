import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardList,
    Play,
    CheckCircle2,
    QrCode,
    Plus,
    MapPin,
    ChevronRight,
    Loader2
} from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface Ticket {
    _id: string;
    ticketNumber: string;
    title: string;
    location: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimatedHours: number;
    status: 'assigned' | 'in_progress' | 'completed';
    backendStatus: string;
}

const priorityConfig = {
    critical: { colorClass: 'text-red-400', icon: '🔴', label: 'Critical' },
    high: { colorClass: 'text-orange-400', icon: '🟠', label: 'High' },
    medium: { colorClass: 'text-yellow-400', icon: '🟡', label: 'Medium' },
    low: { colorClass: 'text-blue-400', icon: '🔵', label: 'Low' },
};

// Ticket Card Component
const TicketCard = memo(function TicketCard({
    ticket,
    onStartWork,
    onViewDetails,
    isPrimary = false,
}: {
    ticket: Ticket;
    onStartWork: (id: string) => void;
    onViewDetails: (id: string) => void;
    isPrimary?: boolean;
}) {
    const config = priorityConfig[ticket.priority] || priorityConfig.medium;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className={`
                bg-[#18181b] border rounded-2xl p-4
                ${isPrimary ? 'border-[var(--primary)]/30' : 'border-white/5'}
            `}
            onClick={() => onViewDetails(ticket._id)}
        >
            <div className="flex items-start gap-3">
                <div className="text-2xl">{config.icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold uppercase ${config.colorClass}`}>
                            {config.label}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">#{ticket.ticketNumber}</span>
                    </div>
                    <h3 className="text-white font-medium text-lg mb-1 truncate">{ticket.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {ticket.location}
                        </span>
                    </div>
                </div>
            </div>

            {isPrimary && (ticket.status === 'assigned') && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onStartWork(ticket._id);
                    }}
                    className="w-full mt-4 py-3 bg-[var(--primary)] text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(185,255,102,0.3)] transition-all active:scale-[0.98]"
                >
                    <Play className="w-5 h-5" />
                    START WORK
                </button>
            )}

            {!isPrimary && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(ticket._id);
                    }}
                    className="w-full mt-3 py-2 text-sm text-[var(--text-muted)] hover:text-white flex items-center justify-center gap-1 transition-colors"
                >
                    View Details <ChevronRight className="w-4 h-4" />
                </button>
            )}
        </motion.div>
    );
});

// Main Technician Dashboard
export const TechDashboard = memo(function TechDashboard() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [completedCount, setCompletedCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                setLoading(true);
                const res = await api.get('/maintenance');
                const allData = res.data.data || [];

                // Filter logic
                // 1. My Active Tickets (IN_PROGRESS)
                // 2. Assigned to me (PENDING/APPROVED) -- though backend assigns on 'start' usually
                // 3. Unassigned Approved Tickets (Available pool)
                // Filter: Status is APPROVED (Available) OR (assignedTo == me AND status != CLOSED/REJECTED)

                const myTickets = allData.filter((t: any) => {
                    const isMyTicket = t.assignedTo?._id === user?._id || t.assignedTo === user?._id;
                    const isUnassignedApproved = t.status === 'APPROVED' && !t.assignedTo;
                    const isMineInProgress = isMyTicket && ['IN_PROGRESS', 'APPROVED'].includes(t.status);

                    return isUnassignedApproved || isMineInProgress;
                });

                // Completed count
                const completed = allData.filter((t: any) =>
                    (t.assignedTo?._id === user?._id || t.assignedTo === user?._id) &&
                    t.status === 'COMPLETED'
                ).length;
                setCompletedCount(completed);

                // Map to UI Ticket
                const mapped: Ticket[] = myTickets.map((t: any) => ({
                    _id: t._id,
                    ticketNumber: t.ticketNumber || 'N/A',
                    title: t.assetId?.name || t.issueDescription || 'Unknown Ticket',
                    location: t.assetId?.location || 'Unknown', // Asset model usually has location? Or need to fetch asset details? 
                    // Controller population: { path: 'assetId', select: 'name guai' }. Location might be missing!
                    // If location missing, show 'Asset Name'.
                    priority: t.priority || 'medium',
                    estimatedHours: 0,
                    status: t.status === 'IN_PROGRESS' ? 'in_progress' : 'assigned',
                    backendStatus: t.status
                }));

                setTickets(mapped);
            } catch (err) {
                console.error("Failed to fetch tech tickets", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTickets();
    }, [user?._id]);

    const handleStartWork = (id: string) => {
        // Just navigate to details, let them confirm there
        navigate(`/maintenance/${id}`);
    };

    const handleViewDetails = (id: string) => {
        navigate(`/maintenance/${id}`);
    };

    const openTickets = tickets; // All fetched are "open" for tech
    // Sort: In Progress first, then Priority
    openTickets.sort((a, b) => {
        if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
        if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
        // Priority
        const pMap = { critical: 3, high: 2, medium: 1, low: 0 };
        return pMap[b.priority] - pMap[a.priority];
    });

    const [primaryTicket, ...otherTickets] = openTickets;

    if (loading) {
        return (
            <div className="p-6 space-y-4 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                <p className="text-[var(--text-muted)]">Loading Tickets...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-4 max-w-lg mx-auto min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">My Maintenance</h1>
                    <p className="text-sm text-[var(--text-muted)]">
                        {openTickets.length} active • {completedCount} completed
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--primary)]/10 rounded-full">
                    <ClipboardList className="w-4 h-4 text-[var(--primary)]" />
                    <span className="text-sm font-bold text-[var(--primary)]">{openTickets.length}</span>
                </div>
            </div>

            {/* Today's Priority */}
            {primaryTicket && (
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                        {primaryTicket.status === 'in_progress' ? 'IN PROGRESS' : "TOP PRIORITY"}
                    </h2>
                    <TicketCard
                        ticket={primaryTicket}
                        onStartWork={handleStartWork}
                        onViewDetails={handleViewDetails}
                        isPrimary
                    />
                </div>
            )}

            {/* Other Tickets */}
            {otherTickets.length > 0 && (
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                        QUEUE
                    </h2>
                    <AnimatePresence>
                        <div className="space-y-3">
                            {otherTickets.map(ticket => (
                                <TicketCard
                                    key={ticket._id}
                                    ticket={ticket}
                                    onStartWork={handleStartWork}
                                    onViewDetails={handleViewDetails}
                                />
                            ))}
                        </div>
                    </AnimatePresence>
                </div>
            )}

            {/* Empty State */}
            {openTickets.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                >
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">No tickets!</h2>
                    <p className="text-[var(--text-muted)]">You're all caught up or no tickets available.</p>
                </motion.div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 pb-8 mt-6">
                <button
                    onClick={() => navigate('/scan')}
                    className="flex flex-col items-center gap-2 py-6 bg-[#18181b] border border-white/5 rounded-2xl hover:border-white/10 transition-colors"
                >
                    <QrCode className="w-8 h-8 text-[var(--primary)]" />
                    <span className="text-sm font-medium text-white">Scan Asset</span>
                </button>
                <button
                    onClick={() => navigate('/maintenance')}
                    className="flex flex-col items-center gap-2 py-6 bg-[#18181b] border border-white/5 rounded-2xl hover:border-white/10 transition-colors"
                >
                    <Plus className="w-8 h-8 text-blue-400" />
                    <span className="text-sm font-medium text-white">All Requests</span>
                </button>
            </div>
        </div>
    );
});

export default TechDashboard;

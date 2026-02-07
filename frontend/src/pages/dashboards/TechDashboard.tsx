import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardList,
    Play,
    CheckCircle2,
    QrCode,
    Plus,
    Clock,
    MapPin,
    ChevronRight,
} from 'lucide-react';

interface Ticket {
    _id: string;
    ticketNumber: string;
    title: string;
    location: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimatedHours: number;
    status: 'assigned' | 'in_progress' | 'completed';
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
    isPrimary = false,
}: {
    ticket: Ticket;
    onStartWork: (id: string) => void;
    isPrimary?: boolean;
}) {
    const config = priorityConfig[ticket.priority];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className={`
                bg-[#18181b] border rounded-2xl p-4
                ${isPrimary ? 'border-[var(--primary)]/30' : 'border-white/5'}
            `}
        >
            <div className="flex items-start gap-3">
                <div className="text-2xl">{config.icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold uppercase ${config.colorClass}`}>
                            {config.label}
                        </span>
                    </div>
                    <h3 className="text-white font-medium text-lg mb-1 truncate">{ticket.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {ticket.location}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Est: {ticket.estimatedHours}h
                        </span>
                    </div>
                </div>
            </div>

            {isPrimary && ticket.status === 'assigned' && (
                <button
                    onClick={() => onStartWork(ticket._id)}
                    className="w-full mt-4 py-3 bg-[var(--primary)] text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(185,255,102,0.3)] transition-all active:scale-[0.98]"
                >
                    <Play className="w-5 h-5" />
                    START WORK
                </button>
            )}

            {!isPrimary && (
                <button className="w-full mt-3 py-2 text-sm text-[var(--text-muted)] hover:text-white flex items-center justify-center gap-1 transition-colors">
                    View Details <ChevronRight className="w-4 h-4" />
                </button>
            )}
        </motion.div>
    );
});

// Main Technician Dashboard
export const TechDashboard = memo(function TechDashboard() {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [completedCount, _setCompletedCount] = useState(12);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                setLoading(true);
                // Demo data - replace with API call
                setTickets([
                    {
                        _id: '1',
                        ticketNumber: 'MT-1234',
                        title: 'HVAC Unit Failure',
                        location: 'Building A, Floor 2',
                        priority: 'critical',
                        estimatedHours: 2,
                        status: 'assigned',
                    },
                    {
                        _id: '2',
                        ticketNumber: 'MT-1235',
                        title: 'Printer Maintenance',
                        location: 'Office 201',
                        priority: 'high',
                        estimatedHours: 1,
                        status: 'assigned',
                    },
                    {
                        _id: '3',
                        ticketNumber: 'MT-1236',
                        title: 'Network Switch Check',
                        location: 'Server Room B',
                        priority: 'medium',
                        estimatedHours: 0.5,
                        status: 'assigned',
                    },
                    {
                        _id: '4',
                        ticketNumber: 'MT-1237',
                        title: 'Desk Light Replacement',
                        location: 'Workspace C12',
                        priority: 'low',
                        estimatedHours: 0.25,
                        status: 'assigned',
                    },
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchTickets();
    }, []);

    const handleStartWork = (id: string) => {
        setTickets(prev => prev.map(t =>
            t._id === id ? { ...t, status: 'in_progress' as const } : t
        ));
        navigate(`/maintenance/${id}`);
    };

    const openTickets = tickets.filter(t => t.status !== 'completed');
    const [primaryTicket, ...otherTickets] = openTickets;

    if (loading) {
        return (
            <div className="p-6 space-y-4 max-w-lg mx-auto">
                <div className="h-8 w-40 bg-white/5 rounded animate-pulse" />
                <div className="h-48 bg-white/5 rounded-2xl animate-pulse" />
                <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
                <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-4 max-w-lg mx-auto min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">My Tickets</h1>
                    <p className="text-sm text-[var(--text-muted)]">
                        {openTickets.length} open • {completedCount} completed this week
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
                        TODAY'S PRIORITY
                    </h2>
                    <TicketCard
                        ticket={primaryTicket}
                        onStartWork={handleStartWork}
                        isPrimary
                    />
                </div>
            )}

            {/* Other Tickets */}
            {otherTickets.length > 0 && (
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                        UP NEXT
                    </h2>
                    <AnimatePresence>
                        <div className="space-y-3">
                            {otherTickets.map(ticket => (
                                <TicketCard
                                    key={ticket._id}
                                    ticket={ticket}
                                    onStartWork={handleStartWork}
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
                    <h2 className="text-xl font-bold text-white mb-2">All caught up!</h2>
                    <p className="text-[var(--text-muted)]">No pending tickets assigned to you.</p>
                </motion.div>
            )}

            {/* Completed This Week */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between"
            >
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    <div>
                        <p className="text-xs text-emerald-400 uppercase tracking-wide">Completed This Week</p>
                        <p className="text-2xl font-bold text-white">{completedCount}</p>
                    </div>
                </div>
            </motion.div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 pb-8">
                <button
                    onClick={() => navigate('/scan')}
                    className="flex flex-col items-center gap-2 py-6 bg-[#18181b] border border-white/5 rounded-2xl hover:border-white/10 transition-colors"
                >
                    <QrCode className="w-8 h-8 text-[var(--primary)]" />
                    <span className="text-sm font-medium text-white">Scan QR</span>
                </button>
                <button
                    onClick={() => navigate('/maintenance/new')}
                    className="flex flex-col items-center gap-2 py-6 bg-[#18181b] border border-white/5 rounded-2xl hover:border-white/10 transition-colors"
                >
                    <Plus className="w-8 h-8 text-blue-400" />
                    <span className="text-sm font-medium text-white">New Ticket</span>
                </button>
            </div>
        </div>
    );
});

export default TechDashboard;

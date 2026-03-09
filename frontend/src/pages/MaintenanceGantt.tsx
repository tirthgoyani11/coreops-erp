import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../hooks/useToast';
import api from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/Select';
import {
    Loader2, BarChart3, ChevronLeft, ChevronRight,
} from 'lucide-react';

interface GanttTicket {
    id: string;
    ticketNumber: string;
    asset?: { name: string };
    assignedTo?: { id: string; name: string };
    status: string;
    priority: string;
    createdAt: string;
    completedDate?: string;
    estimatedCost?: number;
}

const PRIORITY_COLORS: Record<string, string> = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#22c55e',
};

const STATUS_COLORS: Record<string, string> = {
    COMPLETED: '#10b981',
    IN_PROGRESS: '#3b82f6',
    REQUESTED: '#8b5cf6',
    ASSIGNED: '#6366f1',
    ON_HOLD: '#78716c',
};

export function MaintenanceGantt() {
    const toast = useToast();
    const [tickets, setTickets] = useState<GanttTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [colorBy, setColorBy] = useState<'priority' | 'status'>('priority');
    const [weekOffset, setWeekOffset] = useState(0);

    const fetchTickets = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/maintenance');
            setTickets(res.data.data || res.data.tickets || []);
        } catch (err: any) {
            toast.error('Failed to load tickets');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    // Calculate date range (4-week window)
    const dateRange = useMemo(() => {
        const today = new Date();
        const start = new Date(today);
        start.setDate(start.getDate() - 14 + (weekOffset * 7));
        const end = new Date(start);
        end.setDate(end.getDate() + 28);

        const days: Date[] = [];
        const d = new Date(start);
        while (d <= end) {
            days.push(new Date(d));
            d.setDate(d.getDate() + 1);
        }
        return { start, end, days };
    }, [weekOffset]);

    // Group tickets by technician
    const technicians = useMemo(() => {
        const map = new Map<string, { name: string; tickets: GanttTicket[] }>();

        // Unassigned group
        map.set('unassigned', { name: 'Unassigned', tickets: [] });

        tickets.forEach(t => {
            const key = t.assignedTo?.id || 'unassigned';
            if (!map.has(key)) {
                map.set(key, { name: t.assignedTo?.name || 'Unknown', tickets: [] });
            }
            map.get(key)!.tickets.push(t);
        });

        return Array.from(map.entries());
    }, [tickets]);

    const getBarPosition = (ticket: GanttTicket) => {
        const created = new Date(ticket.createdAt);
        const end = ticket.completedDate ? new Date(ticket.completedDate) : new Date();
        const rangeStart = dateRange.start.getTime();
        const rangeEnd = dateRange.end.getTime();
        const rangeWidth = rangeEnd - rangeStart;

        const barStart = Math.max(0, (created.getTime() - rangeStart) / rangeWidth * 100);
        const barEnd = Math.min(100, (end.getTime() - rangeStart) / rangeWidth * 100);
        const barWidth = Math.max(1.5, barEnd - barStart);

        return { left: `${barStart}%`, width: `${barWidth}%` };
    };

    const getBarColor = (ticket: GanttTicket) => {
        if (colorBy === 'priority') return PRIORITY_COLORS[ticket.priority] || '#6b7280';
        return STATUS_COLORS[ticket.status] || '#6b7280';
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading Gantt view...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <BarChart3 className="w-6 h-6" /> Maintenance Gantt Chart
                    </h1>
                    <p className="text-sm text-gray-500">{tickets.length} tickets across {technicians.length} technicians</p>
                </div>
                <div className="flex gap-2">
                    <Select value={colorBy} onValueChange={(v: any) => setColorBy(v)}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="priority">Color: Priority</SelectItem>
                            <SelectItem value="status">Color: Status</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
                {Object.entries(colorBy === 'priority' ? PRIORITY_COLORS : STATUS_COLORS).map(([key, color]) => (
                    <span key={key} className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded" style={{ backgroundColor: color }} /> {key}
                    </span>
                ))}
            </div>

            {/* Time navigation */}
            <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setWeekOffset(o => o - 1)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Earlier
                </Button>
                <span className="text-sm text-gray-500">
                    {dateRange.start.toLocaleDateString()} — {dateRange.end.toLocaleDateString()}
                </span>
                <Button variant="outline" size="sm" onClick={() => setWeekOffset(o => o + 1)}>
                    Later <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
            </div>

            {/* Gantt Chart */}
            <Card className="p-0 overflow-hidden">
                {/* Date headers */}
                <div className="flex border-b dark:border-gray-700">
                    <div className="w-48 flex-shrink-0 p-2 text-xs font-medium text-gray-500 border-r dark:border-gray-700">
                        Technician
                    </div>
                    <div className="flex-1 flex">
                        {dateRange.days
                            .filter((_, i) => i % 7 === 0) // Show weekly markers
                            .map((d, i) => (
                                <div key={i} className="flex-1 text-center text-xs text-gray-400 p-1 border-r dark:border-gray-800">
                                    {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                            ))}
                    </div>
                </div>

                {/* Rows */}
                {technicians.map(([id, tech]) => (
                    <div key={id} className="flex border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 min-h-[48px]">
                        <div className="w-48 flex-shrink-0 p-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-r dark:border-gray-700 flex items-center truncate">
                            {tech.name}
                            <Badge className="ml-2 text-xs">{tech.tickets.length}</Badge>
                        </div>
                        <div className="flex-1 relative py-1" style={{ minHeight: `${Math.max(32, tech.tickets.length * 28 + 8)}px` }}>
                            {tech.tickets.map((ticket, idx) => {
                                const pos = getBarPosition(ticket);
                                return (
                                    <div
                                        key={ticket.id}
                                        className="absolute h-6 rounded-md text-white text-xs flex items-center px-2 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden whitespace-nowrap"
                                        style={{
                                            left: pos.left,
                                            width: pos.width,
                                            backgroundColor: getBarColor(ticket),
                                            top: `${idx * 28 + 4}px`,
                                        }}
                                        title={`${ticket.ticketNumber} — ${ticket.asset?.name || 'Asset'} [${ticket.status}]`}
                                    >
                                        {ticket.ticketNumber}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {technicians.length === 0 && (
                    <div className="p-8 text-center text-gray-500">No tickets to display</div>
                )}
            </Card>
        </div>
    );
}

export default MaintenanceGantt;

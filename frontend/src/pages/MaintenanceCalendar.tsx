import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../hooks/useToast';
import api from '../lib/api';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Loader2, List, Grid } from 'lucide-react';

export function MaintenanceCalendar() {
    const toast = useToast();
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'calendar' | 'list'>('calendar');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [ticketRes, scheduleRes] = await Promise.all([
                api.get('/maintenance'),
                api.get('/preventive'),
            ]);
            setTickets(ticketRes.data.data || ticketRes.data.tickets || []);
            setSchedules(scheduleRes.data.data || []);
        } catch (err: any) {
            toast.error('Failed to load calendar data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Build calendar events
    const events = [
        // Active tickets (orange)
        ...tickets.map((t: any) => ({
            id: `ticket-${t.id}`,
            title: `🔧 ${t.ticketNumber} — ${t.asset?.name || 'Asset'}`,
            start: t.assignedDate || t.createdAt,
            end: t.completedDate || undefined,
            backgroundColor: t.status === 'COMPLETED' ? '#10b981'
                : t.priority === 'CRITICAL' ? '#ef4444'
                    : t.priority === 'HIGH' ? '#f97316'
                        : '#3b82f6',
            borderColor: 'transparent',
            extendedProps: { type: 'ticket', ...t },
        })),
        // Preventive schedules (purple)
        ...schedules
            .filter((s: any) => s.isActive)
            .map((s: any) => ({
                id: `pm-${s.id}`,
                title: `📅 ${s.name}`,
                start: s.nextDue,
                backgroundColor: '#8b5cf6',
                borderColor: 'transparent',
                extendedProps: { type: 'schedule', ...s },
            })),
    ];

    // List view items
    const sortedEvents = [...events].sort((a, b) =>
        new Date(a.start).getTime() - new Date(b.start).getTime());

    if (loading) {
        return (
            <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading calendar...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Maintenance Calendar</h1>
                    <p className="text-sm text-gray-500">
                        {tickets.length} tickets · {schedules.filter((s: any) => s.isActive).length} active schedules
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant={view === 'calendar' ? 'default' : 'outline'} size="sm"
                        onClick={() => setView('calendar')}>
                        <Grid className="w-4 h-4 mr-1" /> Calendar
                    </Button>
                    <Button variant={view === 'list' ? 'default' : 'outline'} size="sm"
                        onClick={() => setView('list')}>
                        <List className="w-4 h-4 mr-1" /> List
                    </Button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Normal ticket</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500 inline-block" /> High priority</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Critical</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Completed</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500 inline-block" /> PM Schedule</span>
            </div>

            {view === 'calendar' ? (
                <Card className="p-4 bg-white dark:bg-gray-900">
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,timeGridDay'
                        }}
                        events={events}
                        eventClick={(info) => {
                            const ep = info.event.extendedProps;
                            if (ep.type === 'ticket') {
                                navigate(`/maintenance/${ep.id}`);
                            }
                        }}
                        height="auto"
                        aspectRatio={1.8}
                        eventDisplay="block"
                    />
                </Card>
            ) : (
                <Card className="p-4">
                    <div className="space-y-2">
                        {sortedEvents.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No events to display</p>
                        ) : (
                            sortedEvents.map(ev => (
                                <div key={ev.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                                    onClick={() => {
                                        if (ev.extendedProps.type === 'ticket') navigate(`/maintenance/${ev.extendedProps.id}`);
                                    }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ev.backgroundColor as string }} />
                                        <div>
                                            <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{ev.title}</p>
                                            <p className="text-xs text-gray-500">{new Date(ev.start).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <Badge className={ev.extendedProps.type === 'schedule' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                                        {ev.extendedProps.type === 'schedule' ? 'PM Schedule' : ev.extendedProps.status || 'Ticket'}
                                    </Badge>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
}

export default MaintenanceCalendar;

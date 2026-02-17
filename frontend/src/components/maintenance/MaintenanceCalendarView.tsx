import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';

interface MaintenanceCalendarViewProps {
    tickets: any[];
}

export function MaintenanceCalendarView({ tickets }: MaintenanceCalendarViewProps) {
    const navigate = useNavigate();

    const events = tickets.map(ticket => ({
        id: ticket._id,
        title: `${ticket.ticketNumber} - ${ticket.assetId?.name || 'Asset'}`,
        start: ticket.assignedDate || ticket.createdAt, // Or schedulded date if we add it
        end: ticket.completedDate, // If completed
        backgroundColor: ticket.status === 'COMPLETED' ? '#10b981' :
            ticket.status === 'CRITICAL' ? '#ef4444' : '#3b82f6',
        borderColor: 'transparent',
        extendedProps: {
            description: ticket.issueDescription,
            status: ticket.status
        }
    }));

    return (
        <Card className="p-4 bg-white dark:bg-gray-900">
            {/* 
               FullCalendar requires some CSS to look good in dark mode. 
               We'll wrap it or add global overrides in index.css later if needed.
            */}
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
                    navigate(`/maintenance/${info.event.id}`);
                }}
                height="auto"
                aspectRatio={1.8}
            />
        </Card>
    );
}

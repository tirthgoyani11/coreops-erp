import { useState } from 'react';
import {
    DndContext,
    useSensor,
    useSensors,
    PointerSensor,
    DragOverlay,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';

import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';

interface MaintenanceKanbanViewProps {
    tickets: any[];
    onRefresh: () => void;
}

const COLUMNS = [
    { id: 'REQUESTED', title: 'Requested', color: 'border-blue-500' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-yellow-500' },
    { id: 'PENDING_PARTS', title: 'Pending Parts', color: 'border-orange-500' },
    { id: 'COMPLETED', title: 'Completed', color: 'border-green-500' },
];

export function MaintenanceKanbanView({ tickets, onRefresh }: MaintenanceKanbanViewProps) {
    const toast = useToast();
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement before drag starts (prevents accidental clicks)
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const ticketId = active.id as string;
        const newStatus = over.id as string; // We drop onto columns, so over.id = status

        // Find the ticket locally to check if status actually changed
        const ticket = tickets.find(t => t._id === ticketId);
        if (ticket && ticket.status !== newStatus) {
            // Optimistic Update can be hard with complex parent state, 
            // so we'll just trigger API and refresh
            try {
                // Determine API call based on status
                // Usually we just call updateTicket
                await api.put(`/maintenance/${ticketId}`, { status: newStatus });
                toast.success(`Ticket moved to ${newStatus.replace('_', ' ')}`);
                onRefresh();
            } catch (error) {
                console.error('Drag error:', error);
                toast.error('Failed to update status');
            }
        }
    };

    // Group tickets by status
    const ticketsByStatus = COLUMNS.reduce((acc, col) => {
        acc[col.id] = tickets.filter(t => t.status === col.id);
        return acc;
    }, {} as Record<string, any[]>);

    // Active ticket for overlay
    const activeTicket = activeId ? tickets.find(t => t._id === activeId) : null;

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex overflow-x-auto gap-6 pb-6 h-[calc(100vh-250px)] min-h-[500px]">
                {COLUMNS.map(col => (
                    <KanbanColumn
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        color={col.color}
                        tickets={ticketsByStatus[col.id] || []}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeTicket ? <KanbanCard ticket={activeTicket} isOverlay /> : null}
            </DragOverlay>
        </DndContext>
    );
}

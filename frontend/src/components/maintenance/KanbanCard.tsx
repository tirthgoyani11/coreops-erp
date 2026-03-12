import { useDraggable } from '@dnd-kit/core';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { User } from 'lucide-react';

interface KanbanCardProps {
    ticket: any;
    isOverlay?: boolean;
}

export function KanbanCard({ ticket, isOverlay }: KanbanCardProps) {
    const navigate = useNavigate();
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: ticket.id,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    // Badge color utility
    const getPriorityColor = (p: string) => {
        if (p === 'critical') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        if (p === 'high') return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`${isDragging ? 'opacity-50' : 'opacity-100'} cursor-grab active:cursor-grabbing outline-none`}
            onClick={() => {
                if (!isDragging) navigate(`/maintenance/${ticket.id}`);
            }}
        >
            <Card className={`p-3 relative group hover:shadow-md transition-shadow ${isOverlay ? 'shadow-xl cursor-grabbing rotate-2' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono text-gray-500">{ticket.ticketNumber}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                    </span>
                </div>

                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                    {ticket.issueDescription}
                </h4>

                <div className="text-xs text-gray-500 mb-3 truncate">
                    {ticket.asset?.name || 'Unknown Asset'}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 mt-2 border-t pt-2 dark:border-gray-800">
                    <div className="flex items-center">
                        {ticket.assignedTo ? (
                            <>
                                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-[9px] font-bold text-blue-600 dark:text-blue-400 mr-1.5 shadow-sm">
                                    {ticket.assignedTo.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                                </div>
                                <span className="truncate max-w-[120px]">{ticket.assignedTo.name}</span>
                            </>
                        ) : (
                            <>
                                <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-600 mr-1.5">
                                    <User className="w-3 h-3 text-gray-400" />
                                </div>
                                <span>Unassigned</span>
                            </>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}

import { useDroppable } from '@dnd-kit/core';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
    id: string;
    title: string;
    color: string;
    tickets: any[];
}

export function KanbanColumn({ id, title, color, tickets }: KanbanColumnProps) {
    const { setNodeRef } = useDroppable({ id });

    return (
        <div className="flex-shrink-0 w-80 bg-gray-50 dark:bg-gray-900/50 rounded-xl flex flex-col h-full border border-gray-200 dark:border-gray-800">
            {/* Header */}
            <div className={`p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center ${color} border-t-4 rounded-t-xl bg-white dark:bg-gray-900`}>
                <h3 className="font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
                <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-1 rounded-full font-medium">
                    {tickets.length}
                </span>
            </div>

            {/* Droppable Area */}
            <div
                ref={setNodeRef}
                className="flex-1 p-3 overflow-y-auto space-y-3 min-h-[200px]"
            >
                {tickets.map(ticket => (
                    <KanbanCard key={ticket.id} ticket={ticket} />
                ))}
            </div>
        </div>
    );
}

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface DraggableWidgetProps {
    id: string;
    isEditMode: boolean;
    children: React.ReactNode;
    className?: string;
    onRemove?: () => void;
}

export function DraggableWidget({ id, isEditMode, children, className = '', onRemove: _onRemove }: DraggableWidgetProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`relative ${isEditMode ? 'ring-2 ring-transparent hover:ring-[var(--primary)]/50 rounded-2xl transition-all shadow-sm group' : ''} ${className}`}
        >
            {isEditMode && (
                <div 
                    {...attributes} 
                    {...listeners}
                    className="absolute top-2 right-2 p-1.5 bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] cursor-grab active:cursor-grabbing z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <GripVertical size={16} />
                </div>
            )}
            <div className={isEditMode ? 'pointer-events-none' : ''}>
                {children}
            </div>
        </div>
    );
}

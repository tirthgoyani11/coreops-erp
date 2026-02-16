import { CheckCircle, AlertTriangle, Truck, UserPlus, FileText, LogIn, LogOut } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface AssetHistoryProps {
    asset?: any;
}

export function AssetHistory({ asset }: AssetHistoryProps) {
    // Merge real history from asset with mock fallback
    const realHistory = (asset?.history || []).map((h: any, i: number) => ({
        id: `real-${i}`,
        type: h.action || 'UPDATE',
        title: h.action === 'CHECKOUT' ? 'Asset Checked Out' :
            h.action === 'CHECKIN' ? 'Asset Checked In' :
                h.action === 'TRANSFER' ? 'Location Transfer' :
                    h.action === 'STATUS_CHANGE' ? 'Status Changed' :
                        h.action === 'LOCATION_MOVE' ? 'Location Moved' :
                            'Asset Updated',
        description: h.details || 'No details.',
        date: h.date,
        user: h.changedBy?.name || 'System',
        status: 'SUCCESS',
    }));

    const creationEvent = asset ? [{
        id: 'creation',
        type: 'CREATION',
        title: 'Asset Registered',
        description: `Asset "${asset.name}" created in system.`,
        date: asset.createdAt,
        user: asset.createdBy?.name || 'System Admin',
        status: 'SUCCESS'
    }] : [];

    const HISTORY = [...realHistory.reverse(), ...creationEvent];
    return (
        <div className="space-y-8 pl-4 border-l-2 border-[var(--border-color)] ml-4 md:ml-8">
            {HISTORY.map((event) => {
                const Icon = getIcon(event.type);
                const colorClass = getColor(event.type);

                return (
                    <div key={event.id} className="relative pl-8 pb-4 group">
                        {/* Timeline Dot */}
                        <div className={cn(
                            "absolute -left-[41px] top-0 w-10 h-10 rounded-full border-4 border-[var(--bg-background)] flex items-center justify-center transition-transform group-hover:scale-110",
                            colorClass
                        )}>
                            <Icon size={16} />
                        </div>

                        {/* Content Card */}
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 hover:border-[var(--primary)]/30 transition-colors">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-semibold text-[var(--text-primary)]">{event.title}</h4>
                                <span className="text-xs text-[var(--text-secondary)]">
                                    {new Date(event.date).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)] mb-3">{event.description}</p>

                            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] border-t border-[var(--border-color)] pt-2">
                                <span className="font-medium bg-[var(--bg-card-hover)] px-2 py-0.5 rounded text-[var(--text-primary)]">
                                    {event.user}
                                </span>
                                <span>•</span>
                                <span>{new Date(event.date).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function getIcon(type: string) {
    switch (type) {
        case 'MAINTENANCE': return AlertTriangle;
        case 'TRANSFER': return Truck;
        case 'ASSIGNMENT': return UserPlus;
        case 'CHECKOUT': return LogOut;
        case 'CHECKIN': return LogIn;
        case 'CREATION': return CheckCircle;
        default: return FileText;
    }
}

function getColor(type: string) {
    switch (type) {
        case 'MAINTENANCE': return "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400";
        case 'TRANSFER': return "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400";
        case 'CREATION': return "bg-green-100 text-green-600 dark:bg-[var(--primary)]/20 dark:text-[var(--primary)]";
        default: return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    }
}

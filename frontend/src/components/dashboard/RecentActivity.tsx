import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Activity, User, Monitor, Ticket, Package, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

interface AuditLog {
    id: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: string;
    timestamp: string;
    user: {
        name: string;
        role: string;
    };
}

const actionColors: Record<string, string> = {
    CREATE: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    UPDATE: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    DELETE: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    LOGIN: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    APPROVE: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
};

const resourceIcons: Record<string, any> = {
    ASSET: Monitor,
    TICKET: Ticket,
    INVENTORY: Package,
    USER: User,
};

export const RecentActivity: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLogs = async () => {
        try {
            const { data } = await api.get('/audit-logs?limit=10');
            if (data.success) {
                setLogs(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch activity feed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    // Format action string for display "Created an Asset", "Updated a Ticket"
    const formatActionText = (log: AuditLog) => {
        const actionMap: Record<string, string> = {
            CREATE: 'created a new',
            UPDATE: 'updated',
            DELETE: 'deleted',
            LOGIN: 'logged into',
            APPROVE: 'approved'
        };
        const actionWord = actionMap[log.action] || log.action.toLowerCase();
        return `${actionWord} ${log.resourceType.toLowerCase()}`;
    };

    if (isLoading) {
        return (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 min-h-[400px] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-[var(--primary)] border-r-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-[var(--border-color)] flex items-center gap-3 bg-[var(--bg-overlay)]">
                <div className="p-2 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg">
                    <Activity className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] leading-tight">Live Activity Feed</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Real-time system actions</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] uppercase font-bold text-emerald-500">Live</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-[var(--border-color)] scrollbar-track-transparent">
                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] space-y-3 opacity-60">
                        <AlertCircle className="w-10 h-10" />
                        <p className="text-sm">No recent activity detected</p>
                    </div>
                ) : (
                    <div className="relative border-l border-[var(--border-color)] ml-4 space-y-6">
                        {logs.map((log) => {
                            const Icon = resourceIcons[log.resourceType] || Activity;
                            const colorClass = actionColors[log.action] || 'text-[var(--text-secondary)] bg-[var(--bg-hover)] border-[var(--border-color)]';

                            return (
                                <div key={log.id} className="relative pl-6 animate-in fade-in slide-in-from-left-4 duration-500">
                                    {/* Timeline Dot */}
                                    <div className={`absolute -left-3.5 top-1 w-7 h-7 rounded-full border-2 flex items-center justify-center shadow-lg bg-[var(--bg-card)] ${colorClass}`}>
                                        <Icon className="w-3.5 h-3.5" />
                                    </div>

                                    {/* Content Card */}
                                    <div className="bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl p-3.5 hover:border-[var(--primary)]/50 transition-colors group">
                                        <div className="flex items-center justify-between gap-4 mb-2">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="font-bold text-[var(--text-primary)]">{log.user?.name || 'System'}</span>
                                                <span className="text-[var(--text-secondary)]">{formatActionText(log)}</span>
                                            </div>
                                            <span className="text-[10px] font-medium text-[var(--text-secondary)] whitespace-nowrap bg-[var(--bg-card)] px-2 py-1 rounded-md border border-[var(--border-color)]">
                                                {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                            </span>
                                        </div>
                                        
                                        {/* Details Badges */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${colorClass}`}>
                                                {log.action}
                                            </span>
                                            {log.resourceId && (
                                                <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-card)] px-2 py-1 rounded-md border border-[var(--border-color)]">
                                                    ID: {log.resourceId.substring(0, 8)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

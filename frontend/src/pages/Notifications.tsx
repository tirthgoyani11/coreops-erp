import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, Check, CheckCheck, Trash2, Loader2,
    AlertCircle, Info, AlertTriangle, X, Settings
} from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import type { Notification as NotificationType } from '../types';

const PRIORITY_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
    'critical': { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
    'high': { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    'medium': { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    'low': { icon: Bell, color: 'text-zinc-400', bg: 'bg-zinc-500/20' },
};

export function Notifications() {
    const [notifications, setNotifications] = useState<NotificationType[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            setError(null);
            const params: Record<string, any> = { limit: 50 };
            if (filter === 'unread') params.unreadOnly = 'true';

            const res = await api.get('/notifications', { params });
            setNotifications(res.data.data || []);
            setUnreadCount(res.data.unreadCount || 0);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const markAsRead = async (id: string) => {
        setActionLoading(id);
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setActionLoading(null);
        }
    };

    const markAllAsRead = async () => {
        setActionLoading('all');
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev =>
                prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
            );
            setUnreadCount(0);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setActionLoading(null);
        }
    };

    const deleteNotification = async (id: string) => {
        setActionLoading(id);
        try {
            await api.delete(`/notifications/${id}`);
            const notification = notifications.find(n => n._id === id);
            setNotifications(prev => prev.filter(n => n._id !== id));
            if (notification && !notification.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setActionLoading(null);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/20 flex items-center justify-center relative">
                        <Bell className="w-6 h-6 text-[var(--primary)]" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Notifications</h1>
                        <p className="text-[var(--text-secondary)]">{unreadCount} unread</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.location.href = '/notifications/preferences'}
                        className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] rounded-full transition-colors"
                        title="Preferences"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            disabled={actionLoading === 'all'}
                            className="px-4 py-2 bg-[var(--bg-overlay)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {actionLoading === 'all' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CheckCheck className="w-4 h-4" />
                            )}
                            Mark all read
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {(['all', 'unread'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${filter === f
                            ? 'bg-[var(--primary)] text-black'
                            : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Error */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center justify-between"
                    >
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/20 rounded">
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notifications List */}
            {notifications.length === 0 ? (
                <div className="text-center py-20 bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-color)]">
                    <Bell className="w-12 h-12 mx-auto text-[var(--text-secondary)] mb-4 opacity-50" />
                    <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">No Notifications</h3>
                    <p className="text-[var(--text-secondary)]">You're all caught up!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                        {notifications.map((notification, i) => {
                            const config = PRIORITY_CONFIG[notification.priority] || PRIORITY_CONFIG.low;
                            const Icon = config.icon;

                            return (
                                <motion.div
                                    key={notification._id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20, height: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className={`bg-[var(--bg-card)] border p-4 rounded-2xl flex items-start gap-4 group transition-all ${notification.isRead
                                        ? 'border-[var(--border-color)] opacity-70'
                                        : 'border-[var(--primary)]/30 bg-[var(--primary)]/5'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                                        <Icon className={`w-5 h-5 ${config.color}`} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className={`font-semibold ${notification.isRead ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                                                {notification.title}
                                            </h4>
                                            <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                                                {formatTime(notification.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
                                            {notification.message}
                                        </p>
                                        {notification.actionUrl && (
                                            <a
                                                href={notification.actionUrl}
                                                className="text-sm text-[var(--primary)] hover:underline mt-2 inline-block"
                                            >
                                                View details →
                                            </a>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!notification.isRead && (
                                            <button
                                                onClick={() => markAsRead(notification._id)}
                                                disabled={actionLoading === notification._id}
                                                className="p-2 hover:bg-[var(--bg-overlay)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                                title="Mark as read"
                                            >
                                                {actionLoading === notification._id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Check className="w-4 h-4" />
                                                )}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteNotification(notification._id)}
                                            disabled={actionLoading === notification._id}
                                            className="p-2 hover:bg-red-500/20 rounded-lg text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

import { create } from 'zustand';
import api from '../lib/api';

export interface Notification {
    _id: string;
    recipient: string;
    type: 'system' | 'approval_required' | 'approval_rejected' | 'ticket_assigned' | 'ticket_completed' | 'low_stock' | 'maintenance_due';
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    isRead: boolean;
    readAt?: string;
    metadata?: Record<string, any>;
    actionUrl?: string;
    createdAt: string;
}

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;

    // Actions
    fetchNotifications: (page?: number) => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    addNotification: (notification: Notification) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,

    fetchNotifications: async (page = 1) => {
        set({ isLoading: true });
        try {
            const { data } = await api.get(`/notifications?page=${page}&limit=20`);
            set({
                notifications: page === 1 ? data.data : [...get().notifications, ...data.data],
                unreadCount: data.unreadCount
            });
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchUnreadCount: async () => {
        try {
            const { data } = await api.get('/notifications/unread-count');
            set({ unreadCount: data.data.unreadCount });
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    },

    markAsRead: async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            set((state) => ({
                notifications: state.notifications.map((n) =>
                    n._id === id ? { ...n, isRead: true } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
            }));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    },

    markAllAsRead: async () => {
        try {
            await api.put('/notifications/read-all');
            set((state) => ({
                notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
                unreadCount: 0,
            }));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    },

    addNotification: (notification: Notification) => {
        set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
        }));
    },
}));

import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore'; // We'll create this next
import { toast } from 'sonner';

/**
 * Custom hook to handle Socket.IO connection and events
 */

let socket: Socket | null = null;

export const useSocket = () => {
    const { token, user } = useAuthStore();
    // Assuming you'll create a store or context to handle state
    // For now, we'll just trigger toasts and re-fetches

    useEffect(() => {
        if (!token || !user) return;

        // Initialize socket only if not already connected
        if (!socket) {
            socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
                auth: { token },
                withCredentials: true,
            });

            socket.on('connect', () => {
                console.log('Socket connected:', socket?.id);
                // Join office room if user has one (except Super Admin who might join all)
                if (user.office) {
                    socket?.emit('join-office', user.office);
                }
            });

            socket.on('connect_error', (err) => {
                console.error('Socket connection error:', err.message);
                if (err.message === 'Authentication error') {
                    // logout(); // Optional: force logout on invalid token
                }
            });

            // Listen for direct notifications
            socket.on('notification', (data) => {
                // Play sound (optional)
                const audio = new Audio('/notification.mp3');
                audio.play().catch(() => { }); // Catch error if user hasn't interacted

                // Show toast
                toast(data.title, {
                    description: data.message,
                    action: data.actionUrl ? {
                        label: 'View',
                        onClick: () => window.location.href = data.actionUrl
                    } : undefined,
                });

                // Update notification store
                useNotificationStore.getState().addNotification(data);
            });
        }

        return () => {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
        };
    }, [token, user]);

    return socket;
};

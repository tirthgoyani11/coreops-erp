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
        // If user logged out, disconnect the socket
        if (!token || !user) {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
            return;
        }

        // Initialize socket only if not already connected
        if (!socket) {
            const apiUrl = import.meta.env.VITE_API_URL;
            const socketUrl = apiUrl
                ? (apiUrl.startsWith('/') ? window.location.origin : apiUrl).replace(/\/api\/?$/, '')
                : 'http://localhost:5050';
            socket = io(socketUrl, {
                auth: { token },
                withCredentials: true,
            });

            socket.on('connect', () => {
                console.log('Socket connected:', socket?.id);
                // Join office room if user has one (except Super Admin who might join all)
                const officeId = user.officeId || (user.office && typeof user.office === 'object' ? user.office.id : user.office);
                if (officeId) {
                    socket?.emit('join-office', officeId);
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

                const firstAction = Array.isArray(data.actions) && data.actions.length > 0 ? data.actions[0] : null;
                const title = data.title || data.type || 'New Notification';
                const message = data.message || 'You have a new update in the system.';
                toast(title, {
                    description: message,
                    action: firstAction?.url ? {
                        label: firstAction.label || 'View',
                        onClick: () => window.location.href = firstAction.url
                    } : undefined,
                });

                // Update notification store
                useNotificationStore.getState().addNotification(data);
            });
        }

        // Do not return a cleanup function that disconnects the singleton socket,
        // because navigating/re-rendering might invoke it and cause constant connection churn.
        return () => {
            // Keep socket alive across component re-renders
        };
    }, [token, user]);

    return socket;
};

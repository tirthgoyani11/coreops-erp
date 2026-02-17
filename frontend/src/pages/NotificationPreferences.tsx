import { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Save, Bell, Mail, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function NotificationPreferences() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [preferences, setPreferences] = useState({
        notifications: {
            email: true,
            inApp: true
        }
    });

    useEffect(() => {
        if (user?.preferences) {
            // Merge defaults
            setPreferences({
                notifications: {
                    email: user.preferences.notifications?.email ?? true,
                    inApp: user.preferences.notifications?.inApp ?? true
                }
            });
        }
    }, [user]);

    const handleSave = async () => {
        try {
            await api.put('/profile', {
                preferences: {
                    notifications: preferences.notifications
                }
            });
            toast.success('Notification preferences saved');
            // Reload to update auth store - simplified approach
            window.location.reload();
        } catch (error) {
            toast.error('Failed to save preferences');
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <button
                onClick={() => navigate('/notifications')}
                className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6"
            >
                <ArrowLeft size={16} /> Back to Notifications
            </button>

            <h1 className="text-2xl font-bold mb-6">Notification Preferences</h1>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="p-6 border-b border-[var(--border)]">
                    <h2 className="font-semibold flex items-center gap-2">
                        <Bell size={18} /> Delivery Channels
                    </h2>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                        Choose how you want to receive notifications.
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <Mail size={20} className="text-blue-600 dark:text-blue-300" />
                            </div>
                            <div>
                                <h3 className="font-medium">Email Notifications</h3>
                                <p className="text-sm text-[var(--muted-foreground)]">Receive digests and alerts via email</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={preferences.notifications.email}
                                onChange={e => setPreferences(prev => ({
                                    ...prev,
                                    notifications: { ...prev.notifications, email: e.target.checked }
                                }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--primary)]"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                <Smartphone size={20} className="text-purple-600 dark:text-purple-300" />
                            </div>
                            <div>
                                <h3 className="font-medium">In-App Notifications</h3>
                                <p className="text-sm text-[var(--muted-foreground)]">Show badges and toasts while using the app</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={preferences.notifications.inApp}
                                onChange={e => setPreferences(prev => ({
                                    ...prev,
                                    notifications: { ...prev.notifications, inApp: e.target.checked }
                                }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--primary)]"></div>
                        </label>
                    </div>
                </div>

                <div className="p-6 bg-[var(--muted)]/50 border-t border-[var(--border)] flex justify-end">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2 bg-[var(--primary)] text-white rounded-md hover:opacity-90 transition-opacity"
                    >
                        <Save size={16} /> Save Preferences
                    </button>
                </div>
            </div>
        </div>
    );
}

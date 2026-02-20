import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import { toast } from 'sonner';
import { Camera, Save, Loader2, User, Mail, Phone, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProfileForm {
    name: string;
    phone: string;
    preferences: {
        language: string;
        timezone: string;
    };
}

export default function Profile() {
    const { user } = useAuthStore();
    const [isUploading, setIsUploading] = useState(false);
    const { register, handleSubmit, formState: { isSubmitting } } = useForm<ProfileForm>({
        defaultValues: {
            name: user?.name,
            phone: user?.phone,
            preferences: {
                language: user?.preferences?.language || 'en',
                timezone: user?.preferences?.timezone || 'Asia/Kolkata',
            },
        },
    });

    const onSubmit = async (data: ProfileForm) => {
        try {
            await api.put('/profile', data);
            // Update local user store with new data
            // detailed implementation depends on authStore structure, assumed safe to reload or patch
            toast.success('Profile updated successfully');
            // Force reload to get fresh data or update store manually
            window.location.reload();
        } catch (error) {
            toast.error('Failed to update profile');
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;

        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('avatar', file);

        setIsUploading(true);
        try {
            await api.put('/profile/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Avatar updated');
            window.location.reload();
        } catch (error) {
            toast.error('Failed to upload avatar');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-[var(--foreground)]">My Profile</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Avatar Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="col-span-1 flex flex-col items-center space-y-4"
                >
                    <div className="relative group">
                        <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-[var(--card-border)] bg-[var(--muted)]">
                            {user?.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[var(--muted-foreground)]">
                                    <User size={64} />
                                </div>
                            )}
                        </div>
                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                            <Camera className="text-white" size={32} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </label>
                        {isUploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                <Loader2 className="animate-spin text-white" />
                            </div>
                        )}
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-semibold">{user?.name}</h2>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {user?.role.replace('_', ' ')}
                        </span>
                    </div>
                </motion.div>

                {/* Form Section */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="col-span-1 md:col-span-2 bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 shadow-sm"
                >
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <User size={16} /> Full Name
                                </label>
                                <input
                                    {...register('name', { required: true })}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Mail size={16} /> Email
                                </label>
                                <input
                                    value={user?.email}
                                    disabled
                                    className="w-full px-3 py-2 bg-[var(--muted)] border border-[var(--input)] rounded-md cursor-not-allowed opacity-70"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Phone size={16} /> Phone
                                </label>
                                <input
                                    {...register('phone')}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Globe size={16} /> Timezone
                                </label>
                                <select
                                    {...register('preferences.timezone')}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md focus:ring-2 focus:ring-[var(--primary)]"
                                >
                                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                    <option value="UTC">UTC</option>
                                    <option value="America/New_York">New York (EST)</option>
                                    <option value="Europe/London">London (GMT)</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-[var(--border)] flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => window.location.href = '/profile/password'}
                                className="px-4 py-2 text-sm font-medium text-[var(--primary)] hover:underline"
                            >
                                Change Password
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2 bg-[var(--primary)] text-black font-semibold shadow-[0_0_10px_var(--primary-glow)] rounded-md hover:bg-[var(--primary)]/90 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}

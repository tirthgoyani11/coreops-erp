import { useForm } from 'react-hook-form';
import api from '../lib/api';
import { toast } from 'sonner';
import { Lock, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ChangePassword() {
    const navigate = useNavigate();
    const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
    const newPassword = watch('newPassword');

    const onSubmit = async (data: any) => {
        try {
            await api.put('/profile/password', {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword
            });
            toast.success('Password changed successfully');
            navigate('/profile');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to change password');
        }
    };

    return (
        <div className="max-w-md mx-auto py-12 px-4">
            <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6"
            >
                <ArrowLeft size={16} /> Back to Profile
            </button>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <Lock className="text-blue-600 dark:text-blue-300" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Change Password</h1>
                        <p className="text-sm text-[var(--muted-foreground)]">Secure your account</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Current Password</label>
                        <input
                            type="password"
                            {...register('currentPassword', { required: 'Required' })}
                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md"
                        />
                        {errors.currentPassword && <span className="text-xs text-red-500">{String(errors.currentPassword.message)}</span>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">New Password</label>
                        <input
                            type="password"
                            {...register('newPassword', {
                                required: 'Required',
                                minLength: { value: 8, message: 'Min 8 characters' }
                            })}
                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md"
                        />
                        {errors.newPassword && <span className="text-xs text-red-500">{String(errors.newPassword.message)}</span>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Confirm New Password</label>
                        <input
                            type="password"
                            {...register('confirmPassword', {
                                validate: (val) => val === newPassword || 'Passwords do not match'
                            })}
                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md"
                        />
                        {errors.confirmPassword && <span className="text-xs text-red-500">{String(errors.confirmPassword.message)}</span>}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary)]/90 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}

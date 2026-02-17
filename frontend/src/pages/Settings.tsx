import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../lib/api';
import { toast } from 'sonner';
import { Save, Loader2, Building2, Shield, AlertTriangle } from 'lucide-react';

export default function Settings() {
    const [isLoading, setIsLoading] = useState(true);
    const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await api.get('/settings');
            reset(res.data.data);
        } catch (error) {
            toast.error('Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (data: any) => {
        try {
            await api.put('/settings', data);
            toast.success('System settings updated');
        } catch (error) {
            toast.error('Failed to update settings');
        }
    };

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">System Settings</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* General Settings */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <Building2 size={20} /> General Configuration
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Company Name</label>
                            <input {...register('companyName')} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Company Logo URL</label>
                            <input {...register('companyLogo')} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Default Currency</label>
                            <input {...register('defaultCurrency')} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Session Timeout (minutes)</label>
                            <input type="number" {...register('sessionTimeout')} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md" />
                        </div>
                    </div>
                </div>

                {/* Security Policy */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <Shield size={20} /> Security & Password Policy
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Min Password Length</label>
                            <input type="number" {...register('passwordPolicy.minLength')} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md" />
                        </div>
                        <div className="flex items-center gap-2 pt-8">
                            <input type="checkbox" {...register('passwordPolicy.requireSpecialChar')} className="h-4 w-4" />
                            <label className="text-sm">Require Special Character</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" {...register('passwordPolicy.requireNumber')} className="h-4 w-4" />
                            <label className="text-sm">Require Number</label>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-red-700 dark:text-red-400">
                        <AlertTriangle size={20} /> Danger Zone
                    </h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium">Maintenance Mode</h3>
                            <p className="text-sm text-[var(--muted-foreground)]">Prevent non-admin users from logging in</p>
                        </div>
                        <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input type="checkbox" {...register('maintenanceMode')} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" />
                            <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-8 py-3 bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary)]/90 disabled:opacity-50 font-medium"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Save System Settings
                    </button>
                </div>
            </form>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../lib/api';
import { toast } from 'sonner';
import { Save, Loader2, Building2, Shield, AlertTriangle, RefreshCw, Clock3, Globe2 } from 'lucide-react';

type SettingsForm = {
    companyName: string;
    companyLogo: string;
    defaultCurrency: string;
    defaultTimezone: string;
    sessionTimeout: number;
    maintenanceMode: boolean;
    passwordPolicy: {
        minLength: number;
        requireSpecialChar: boolean;
        requireNumber: boolean;
    };
};

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'JPY'];
const TIMEZONES = ['Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'Asia/Singapore'];

const DEFAULT_VALUES: SettingsForm = {
    companyName: '',
    companyLogo: '',
    defaultCurrency: 'INR',
    defaultTimezone: 'Asia/Kolkata',
    sessionTimeout: 60,
    maintenanceMode: false,
    passwordPolicy: {
        minLength: 8,
        requireSpecialChar: true,
        requireNumber: true,
    },
};

export default function Settings() {
    const [isLoading, setIsLoading] = useState(true);
    const [logoPreviewFailed, setLogoPreviewFailed] = useState(false);
    const { register, handleSubmit, reset, watch, formState: { isSubmitting, isDirty } } = useForm<SettingsForm>({
        defaultValues: DEFAULT_VALUES,
    });

    const sessionTimeout = watch('sessionTimeout');
    const maintenanceMode = watch('maintenanceMode');
    const companyLogo = watch('companyLogo');
    const companyName = watch('companyName');

    const normalizedLogoUrl = (companyLogo || '').trim();
    const isLogoUrlValid = /^https?:\/\//i.test(normalizedLogoUrl);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        setLogoPreviewFailed(false);
    }, [normalizedLogoUrl]);

    const loadSettings = async () => {
        try {
            const res = await api.get('/settings');
            const payload = res.data?.data || {};
            reset({
                ...DEFAULT_VALUES,
                ...payload,
                passwordPolicy: {
                    ...DEFAULT_VALUES.passwordPolicy,
                    ...(payload.passwordPolicy || {}),
                },
            });
        } catch (error) {
            toast.error('Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (data: SettingsForm) => {
        try {
            await api.put('/settings', data);
            toast.success('System settings updated');
            reset(data);
        } catch (error) {
            toast.error('Failed to update settings');
        }
    };

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold">System Settings</h1>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">Control organization defaults, security policy, and runtime behavior.</p>
                </div>
                <button
                    type="button"
                    onClick={loadSettings}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                    <RefreshCw size={14} /> Reload
                </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* General Settings */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <Building2 size={20} /> General Configuration
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Company Name</label>
                            <input
                                {...register('companyName', { required: true })}
                                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md"
                                placeholder="CoreOps ERP"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Company Logo URL</label>
                            <input
                                {...register('companyLogo')}
                                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md"
                                placeholder="https://example.com/logo.png"
                            />
                            <p className="text-xs text-[var(--muted-foreground)]">Use a public URL starting with http:// or https://</p>
                        </div>
                        <div className="md:col-span-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                            <p className="text-sm font-medium mb-3">Logo Preview</p>
                            {!normalizedLogoUrl ? (
                                <div className="h-28 rounded-md border border-dashed border-[var(--border)] flex items-center justify-center text-sm text-[var(--muted-foreground)]">
                                    Add a logo URL to preview it here.
                                </div>
                            ) : !isLogoUrlValid ? (
                                <div className="h-28 rounded-md border border-amber-500/40 bg-amber-500/10 flex items-center justify-center text-sm text-amber-500">
                                    Invalid URL format. Use an absolute URL.
                                </div>
                            ) : logoPreviewFailed ? (
                                <div className="h-28 rounded-md border border-red-500/40 bg-red-500/10 flex items-center justify-center text-sm text-red-500">
                                    Could not load logo image from this URL.
                                </div>
                            ) : (
                                <div className="h-28 rounded-md border border-[var(--border)] bg-[var(--card)] flex items-center justify-center px-4">
                                    <img
                                        src={normalizedLogoUrl}
                                        alt={companyName ? `${companyName} logo` : 'Company logo preview'}
                                        className="max-h-20 max-w-full object-contain"
                                        onError={() => setLogoPreviewFailed(true)}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2"><Globe2 size={14} /> Default Currency</label>
                            <select {...register('defaultCurrency')} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md">
                                {CURRENCIES.map((currency) => (
                                    <option key={currency} value={currency}>{currency}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Default Timezone</label>
                            <select {...register('defaultTimezone')} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md">
                                {TIMEZONES.map((zone) => (
                                    <option key={zone} value={zone}>{zone}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2"><Clock3 size={14} /> Session Timeout (minutes)</label>
                            <input
                                type="number"
                                min={5}
                                max={1440}
                                {...register('sessionTimeout', { valueAsNumber: true, min: 5, max: 1440 })}
                                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md"
                            />
                            <p className="text-xs text-[var(--muted-foreground)]">Current timeout: {sessionTimeout || 0} min</p>
                        </div>
                    </div>
                </div>

                {/* Security Policy */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <Shield size={20} /> Security & Password Policy
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Min Password Length</label>
                            <input
                                type="number"
                                min={6}
                                max={64}
                                {...register('passwordPolicy.minLength', { valueAsNumber: true, min: 6, max: 64 })}
                                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md"
                            />
                        </div>
                        <div className="flex items-center gap-2">
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
                        <label className="inline-flex items-center cursor-pointer">
                            <input type="checkbox" {...register('maintenanceMode')} className="sr-only peer" />
                            <div className="relative w-12 h-6 bg-zinc-400/70 peer-focus:outline-none rounded-full peer peer-checked:bg-red-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-6" />
                        </label>
                    </div>
                    {maintenanceMode && <p className="text-xs text-red-600 dark:text-red-300 mt-3">Maintenance mode is currently enabled.</p>}
                </div>

                <div className="sticky bottom-4 bg-[var(--card)]/90 backdrop-blur-sm border border-[var(--border)] rounded-xl p-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-[var(--muted-foreground)]">{isDirty ? 'You have unsaved changes.' : 'All changes are saved.'}</p>
                    <button
                        type="submit"
                        disabled={isSubmitting || !isDirty}
                        className="flex items-center gap-2 px-8 py-3 bg-[var(--primary)] text-black font-bold shadow-[0_0_10px_var(--primary-glow)] rounded-md hover:bg-[var(--primary)]/90 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Save System Settings
                    </button>
                </div>
            </form>
        </div>
    );
}

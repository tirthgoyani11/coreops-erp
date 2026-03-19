import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Save, BellRing } from 'lucide-react';
import api from '../../lib/api';

interface KpiAlert {
    id: string;
    metricName: string;
    condition: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS';
    threshold: number;
    isActive: boolean;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const AVAILABLE_METRICS = [
    { value: 'activeTickets', label: 'Active Tickets' },
    { value: 'pendingApprovals', label: 'Pending Approvals' },
    { value: 'lowStockItems', label: 'Low Stock Inventory' },
    { value: 'monthlyExpense', label: 'Monthly Expenses' },
];

export function KpiAlertsModal({ isOpen, onClose }: Props) {
    const [alerts, setAlerts] = useState<KpiAlert[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) fetchAlerts();
    }, [isOpen]);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/users/me/alerts');
            if (data?.data) {
                setAlerts(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const addAlert = () => {
        const newAlert: any = {
            id: `temp_${Date.now()}`,
            metricName: 'activeTickets',
            condition: 'GREATER_THAN',
            threshold: 0,
            isActive: true,
            isNew: true
        };
        setAlerts([...alerts, newAlert]);
    };

    const updateAlertState = (id: string, field: keyof KpiAlert, value: any) => {
        setAlerts(alerts.map(a => a.id === id ? { ...a, [field]: value } : a));
    };

    const removeAlert = async (id: string) => {
        if (!id.startsWith('temp_')) {
            try {
                await api.delete(`/users/me/alerts/${id}`);
            } catch (err) {
                console.error('Failed to delete alert:', err);
                return;
            }
        }
        setAlerts(alerts.filter(a => a.id !== id));
    };

    const saveAlerts = async () => {
        try {
            setSaving(true);
            const promises = alerts.map(async (alert: any) => {
                const payload = {
                    metricName: alert.metricName,
                    condition: alert.condition,
                    threshold: Number(alert.threshold),
                    isActive: alert.isActive
                };
                if (alert.isNew) {
                    await api.post('/users/me/alerts', payload);
                } else {
                    await api.put(`/users/me/alerts/${alert.id}`, payload);
                }
            });
            await Promise.all(promises);
            onClose();
        } catch (error) {
            console.error('Failed to save alerts:', error);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
                >
                    <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <BellRing className="w-5 h-5 text-primary" />
                                KPI Alerts
                            </h2>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">Configure threshold alerts for your metrics.</p>
                        </div>
                        <button onClick={onClose} className="p-2 text-[var(--text-secondary)] hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                        {loading ? (
                            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/></div>
                        ) : alerts.length === 0 ? (
                            <div className="text-center py-8 text-[var(--text-secondary)]">
                                <p>No alerts configured.</p>
                            </div>
                        ) : (
                            alerts.map((alert) => (
                                <div key={alert.id} className="flex flex-col sm:flex-row gap-3 items-center bg-[var(--bg-overlay)] p-4 rounded-xl border border-[var(--border-color)]">
                                    <div className="flex-1 w-full">
                                        <label className="text-xs text-[var(--text-secondary)] mb-1 block">Metric</label>
                                        <select
                                            value={alert.metricName}
                                            onChange={(e) => updateAlertState(alert.id, 'metricName', e.target.value)}
                                            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] outline-none"
                                        >
                                            {AVAILABLE_METRICS.map(m => (
                                                <option key={m.value} value={m.value}>{m.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="w-full sm:w-32">
                                        <label className="text-xs text-[var(--text-secondary)] mb-1 block">Condition</label>
                                        <select
                                            value={alert.condition}
                                            onChange={(e) => updateAlertState(alert.id, 'condition', e.target.value as any)}
                                            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] outline-none"
                                        >
                                            <option value="GREATER_THAN">{'&gt;'} Greater</option>
                                            <option value="LESS_THAN">{'&lt;'} Less</option>
                                            <option value="EQUALS">{'='} Equals</option>
                                        </select>
                                    </div>

                                    <div className="w-full sm:w-32">
                                        <label className="text-xs text-[var(--text-secondary)] mb-1 block">Threshold</label>
                                        <input
                                            type="number"
                                            value={alert.threshold}
                                            onChange={(e) => updateAlertState(alert.id, 'threshold', e.target.value)}
                                            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] outline-none"
                                        />
                                    </div>

                                    <div className="flex items-end gap-2 sm:ml-2 mt-4 sm:mt-0 w-full sm:w-auto h-[60px] pb-1">
                                        <button
                                            onClick={() => updateAlertState(alert.id, 'isActive', !alert.isActive)}
                                            className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-sm font-medium transition-colors ${alert.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}
                                        >
                                            {alert.isActive ? 'Active' : 'Muted'}
                                        </button>
                                        <button
                                            onClick={() => removeAlert(alert.id)}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                                            title="Delete Alert"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}

                        <button
                            onClick={addAlert}
                            className="w-full py-3 border-2 border-dashed border-[var(--border-color)] hover:border-[var(--primary)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--primary)] flex items-center justify-center gap-2 transition-colors font-medium outline-none"
                        >
                            <Plus size={18} />
                            Add Alert
                        </button>
                    </div>

                    <div className="p-6 border-t border-[var(--border-color)] flex justify-end gap-3 bg-[var(--bg-overlay)]">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={saveAlerts}
                            disabled={saving}
                            className="px-5 py-2 bg-[var(--primary)] hover:brightness-110 text-black rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            <Save size={18} />
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

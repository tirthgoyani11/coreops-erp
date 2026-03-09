import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../hooks/useToast';
import api from '../lib/api';
import {
    Plus,
    Play,
    Pause,
    Zap,
    Calendar,
    Clock,
    AlertTriangle,
    Loader2,
    Trash2,
} from 'lucide-react';

// Components
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../components/ui/Dialog';

interface PMSchedule {
    id: string;
    name: string;
    description?: string;
    asset?: { id: string; name: string; guai: string; category?: string };
    office?: { id: string; name: string };
    assetCategory?: string;
    frequency: string;
    intervalDays?: number;
    priority: string;
    estimatedCost?: number;
    assignedToId?: string;
    nextDue: string;
    lastExecuted?: string;
    isActive: boolean;
    checklist?: { item: string; required: boolean }[];
}

export function PreventiveMaintenance() {
    const toast = useToast();
    const [schedules, setSchedules] = useState<PMSchedule[]>([]);
    const [dueSchedules, setDueSchedules] = useState<PMSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [executing, setExecuting] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        frequency: 'MONTHLY',
        intervalDays: 30,
        priority: 'MEDIUM',
        estimatedCost: '',
        assetId: '',
    });

    const fetchSchedules = useCallback(async () => {
        try {
            setLoading(true);
            const [schedulesRes, dueRes] = await Promise.all([
                api.get('/preventive'),
                api.get('/preventive/due'),
            ]);
            setSchedules(schedulesRes.data.data || []);
            setDueSchedules(dueRes.data.data || []);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to load schedules');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSchedules();
    }, [fetchSchedules]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/preventive', {
                ...formData,
                estimatedCost: formData.estimatedCost ? Number(formData.estimatedCost) : undefined,
                assetId: formData.assetId || undefined,
            });
            toast.success('Schedule created successfully');
            setShowCreateModal(false);
            setFormData({ name: '', description: '', frequency: 'MONTHLY', intervalDays: 30, priority: 'MEDIUM', estimatedCost: '', assetId: '' });
            fetchSchedules();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to create schedule');
        }
    };

    const handleExecute = async (id: string) => {
        try {
            setExecuting(id);
            const res = await api.post(`/preventive/${id}/execute`);
            toast.success(res.data.message || 'Maintenance ticket created');
            fetchSchedules();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to execute schedule');
        } finally {
            setExecuting(null);
        }
    };

    const handleToggle = async (id: string, isActive: boolean) => {
        try {
            await api.patch(`/preventive/${id}`, { isActive: !isActive });
            toast.success(isActive ? 'Schedule paused' : 'Schedule resumed');
            fetchSchedules();
        } catch (err: any) {
            toast.error('Failed to update schedule');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/preventive/${id}`);
            toast.success('Schedule deactivated');
            fetchSchedules();
        } catch (err: any) {
            toast.error('Failed to delete schedule');
        }
    };

    const getFrequencyBadge = (freq: string) => {
        const colors: Record<string, string> = {
            DAILY: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            WEEKLY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            BIWEEKLY: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
            MONTHLY: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            QUARTERLY: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
            SEMI_ANNUAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
            YEARLY: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
            CUSTOM: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
        };
        return colors[freq] || 'bg-gray-100 text-gray-800';
    };

    const getPriorityColor = (p: string) => {
        const c: Record<string, string> = {
            CRITICAL: 'text-red-600', HIGH: 'text-orange-600',
            MEDIUM: 'text-yellow-600', LOW: 'text-green-600',
        };
        return c[p] || 'text-gray-600';
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading schedules...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Preventive Maintenance</h1>
                    <p className="text-sm text-gray-500">Manage recurring maintenance schedules and tasks</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Schedule
                </Button>
            </div>

            {/* Due / Overdue Alert */}
            {dueSchedules.length > 0 && (
                <Card className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                            {dueSchedules.length} schedule(s) overdue
                        </h3>
                    </div>
                    <div className="space-y-1">
                        {dueSchedules.map(s => (
                            <div key={s.id} className="flex justify-between items-center text-sm">
                                <span>{s.name} — {s.asset?.name || s.assetCategory || 'No asset'}</span>
                                <Button size="sm" variant="outline" onClick={() => handleExecute(s.id)}
                                    disabled={executing === s.id}>
                                    {executing === s.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
                                    Execute Now
                                </Button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Schedule Cards */}
            {schedules.length === 0 ? (
                <Card className="p-12 text-center text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No preventive schedules yet. Create one to get started.</p>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {schedules.map((schedule) => (
                        <Card key={schedule.id} className={`p-4 space-y-4 hover:shadow-md transition-shadow ${!schedule.isActive ? 'opacity-60' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div className="space-y-1 flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{schedule.name}</h3>
                                    <p className="text-sm text-gray-500 truncate">
                                        {schedule.asset?.name || schedule.assetCategory || 'All assets'}
                                        {schedule.asset?.guai && ` (${schedule.asset.guai})`}
                                    </p>
                                </div>
                                <div className="flex gap-1 ml-2 flex-shrink-0">
                                    <Badge className={getFrequencyBadge(schedule.frequency)}>
                                        {schedule.frequency.replace('_', ' ')}
                                    </Badge>
                                </div>
                            </div>

                            {schedule.description && (
                                <p className="text-xs text-gray-500 line-clamp-2">{schedule.description}</p>
                            )}

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Next Due:
                                    </span>
                                    <span className="font-medium">{new Date(schedule.nextDue).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Last Executed:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {schedule.lastExecuted ? new Date(schedule.lastExecuted).toLocaleDateString() : 'Never'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Priority:</span>
                                    <span className={`font-medium ${getPriorityColor(schedule.priority)}`}>
                                        {schedule.priority}
                                    </span>
                                </div>
                                {schedule.estimatedCost && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Est. Cost:</span>
                                        <span className="font-medium">₹{schedule.estimatedCost.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 flex justify-between gap-2 border-t border-gray-100 dark:border-gray-800">
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                                    onClick={() => handleDelete(schedule.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handleExecute(schedule.id)}
                                        disabled={executing === schedule.id || !schedule.isActive}>
                                        {executing === schedule.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
                                        Run Now
                                    </Button>
                                    {schedule.isActive ? (
                                        <Button variant="outline" size="sm" className="text-amber-600 hover:text-amber-700"
                                            onClick={() => handleToggle(schedule.id, schedule.isActive)}>
                                            <Pause className="w-4 h-4 mr-1" /> Pause
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700"
                                            onClick={() => handleToggle(schedule.id, schedule.isActive)}>
                                            <Play className="w-4 h-4 mr-1" /> Resume
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create PM Schedule</DialogTitle>
                        <DialogDescription>Set up a recurring maintenance task for an asset.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Name *</Label>
                                <Input placeholder="e.g. Monthly HVAC Inspection" value={formData.name}
                                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input placeholder="What needs to be done" value={formData.description}
                                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Frequency *</Label>
                                    <Select value={formData.frequency}
                                        onValueChange={(v: string) => setFormData(p => ({ ...p, frequency: v }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select frequency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DAILY">Daily</SelectItem>
                                            <SelectItem value="WEEKLY">Weekly</SelectItem>
                                            <SelectItem value="BIWEEKLY">Bi-Weekly</SelectItem>
                                            <SelectItem value="MONTHLY">Monthly</SelectItem>
                                            <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                                            <SelectItem value="SEMI_ANNUAL">Semi-Annual</SelectItem>
                                            <SelectItem value="YEARLY">Yearly</SelectItem>
                                            <SelectItem value="CUSTOM">Custom</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Priority</Label>
                                    <Select value={formData.priority}
                                        onValueChange={(v: string) => setFormData(p => ({ ...p, priority: v }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LOW">Low</SelectItem>
                                            <SelectItem value="MEDIUM">Medium</SelectItem>
                                            <SelectItem value="HIGH">High</SelectItem>
                                            <SelectItem value="CRITICAL">Critical</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {formData.frequency === 'CUSTOM' && (
                                <div className="space-y-2">
                                    <Label>Interval (days)</Label>
                                    <Input type="number" min="1" value={formData.intervalDays}
                                        onChange={e => setFormData(p => ({ ...p, intervalDays: parseInt(e.target.value) || 30 }))} />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Estimated Cost (₹)</Label>
                                <Input type="number" placeholder="0" value={formData.estimatedCost}
                                    onChange={e => setFormData(p => ({ ...p, estimatedCost: e.target.value }))} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                            <Button type="submit" disabled={!formData.name}>Create Schedule</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default PreventiveMaintenance;

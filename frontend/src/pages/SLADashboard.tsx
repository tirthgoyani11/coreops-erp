import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../hooks/useToast';
import api from '../lib/api';
import {
    ShieldCheck,
    AlertTriangle,
    Clock,
    CheckCircle,
    XCircle,
    Plus,
    Loader2,
    TrendingUp,
    Timer,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/Dialog';

interface SLAPolicy {
    id: string; name: string; priority: string;
    responseTimeHours: number; resolutionTimeHours: number;
    escalationLevels?: any; officeId?: string; isDefault: boolean; isActive: boolean;
}

interface ComplianceData {
    total: number; breached: number; onTrack: number;
    complianceRate: number; avgResolutionHours: number;
    byPriority: { priority: string; total: number; breached: number; rate: number }[];
    recentBreaches: any[];
}

export function SLADashboard() {
    const toast = useToast();
    const [policies, setPolicies] = useState<SLAPolicy[]>([]);
    const [compliance, setCompliance] = useState<ComplianceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '', priority: 'MEDIUM', responseTimeHours: 4, resolutionTimeHours: 24,
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [polRes, compRes] = await Promise.all([
                api.get('/sla'),
                api.get('/sla/compliance'),
            ]);
            setPolicies(polRes.data.data || []);
            setCompliance(compRes.data.data || null);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to load SLA data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/sla', {
                ...formData,
                responseTimeHours: Number(formData.responseTimeHours),
                resolutionTimeHours: Number(formData.resolutionTimeHours),
            });
            toast.success('SLA policy created');
            setShowCreateModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to create policy');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/sla/${id}`);
            toast.success('Policy deleted');
            fetchData();
        } catch (err: any) {
            toast.error('Failed to delete policy');
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading SLA data...
            </div>
        );
    }

    const rate = compliance?.complianceRate ?? 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">SLA Dashboard</h1>
                    <p className="text-sm text-gray-500">Monitor service level agreement compliance</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Create Policy
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${rate >= 90 ? 'bg-green-100 dark:bg-green-900/30' : rate >= 70 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                            <TrendingUp className={`w-5 h-5 ${rate >= 90 ? 'text-green-600' : rate >= 70 ? 'text-yellow-600' : 'text-red-600'}`} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Compliance Rate</p>
                            <p className="text-2xl font-bold">{rate.toFixed(1)}%</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <ShieldCheck className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Tickets</p>
                            <p className="text-2xl font-bold">{compliance?.total || 0}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">On Track</p>
                            <p className="text-2xl font-bold">{compliance?.onTrack || 0}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                            <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Breached</p>
                            <p className="text-2xl font-bold text-red-600">{compliance?.breached || 0}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Compliance by Priority */}
            {compliance?.byPriority && compliance.byPriority.length > 0 && (
                <Card className="p-4">
                    <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Compliance by Priority</h3>
                    <div className="grid gap-3 md:grid-cols-4">
                        {compliance.byPriority.map(bp => (
                            <div key={bp.priority} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                                <div>
                                    <Badge className={bp.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' : bp.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' : bp.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                                        {bp.priority}
                                    </Badge>
                                    <p className="text-xs text-gray-500 mt-1">{bp.total} tickets, {bp.breached} breached</p>
                                </div>
                                <span className={`text-lg font-bold ${bp.rate >= 90 ? 'text-green-600' : bp.rate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {bp.rate.toFixed(0)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Recent Breaches */}
            {compliance?.recentBreaches && compliance.recentBreaches.length > 0 && (
                <Card className="p-4">
                    <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" /> Recent SLA Breaches
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b dark:border-gray-700 text-left text-gray-500">
                                    <th className="pb-2 pr-4">Ticket</th>
                                    <th className="pb-2 pr-4">Priority</th>
                                    <th className="pb-2 pr-4">Status</th>
                                    <th className="pb-2 pr-4">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {compliance.recentBreaches.map((t: any) => (
                                    <tr key={t.id} className="border-b dark:border-gray-800">
                                        <td className="py-2 pr-4 font-medium">{t.ticketNumber}</td>
                                        <td className="py-2 pr-4"><Badge>{t.priority}</Badge></td>
                                        <td className="py-2 pr-4">{t.status}</td>
                                        <td className="py-2 pr-4">{new Date(t.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* SLA Policies */}
            <Card className="p-4">
                <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">SLA Policies</h3>
                {policies.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No SLA policies defined. Create one to start tracking.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b dark:border-gray-700 text-left text-gray-500">
                                    <th className="pb-2 pr-4">Name</th>
                                    <th className="pb-2 pr-4">Priority</th>
                                    <th className="pb-2 pr-4">Response Time</th>
                                    <th className="pb-2 pr-4">Resolution Time</th>
                                    <th className="pb-2 pr-4">Default</th>
                                    <th className="pb-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {policies.map(p => (
                                    <tr key={p.id} className="border-b dark:border-gray-800">
                                        <td className="py-2 pr-4 font-medium">{p.name}</td>
                                        <td className="py-2 pr-4"><Badge>{p.priority}</Badge></td>
                                        <td className="py-2 pr-4 flex items-center gap-1"><Timer className="w-3 h-3" /> {p.responseTimeHours}h</td>
                                        <td className="py-2 pr-4"><Clock className="w-3 h-3 inline mr-1" />{p.resolutionTimeHours}h</td>
                                        <td className="py-2 pr-4">{p.isDefault ? <CheckCircle className="w-4 h-4 text-green-600" /> : '—'}</td>
                                        <td className="py-2">
                                            <Button variant="ghost" size="sm" className="text-red-500 h-7" onClick={() => handleDelete(p.id)}>Delete</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Create Policy Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create SLA Policy</DialogTitle>
                        <DialogDescription>Define response and resolution time targets per priority level.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Policy Name *</Label>
                                <Input placeholder="e.g. Critical Response SLA" value={formData.name}
                                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Priority Level *</Label>
                                <Select value={formData.priority} onValueChange={(v: string) => setFormData(p => ({ ...p, priority: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOW">Low</SelectItem>
                                        <SelectItem value="MEDIUM">Medium</SelectItem>
                                        <SelectItem value="HIGH">High</SelectItem>
                                        <SelectItem value="CRITICAL">Critical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Response Time (hours) *</Label>
                                    <Input type="number" min="1" value={formData.responseTimeHours}
                                        onChange={e => setFormData(p => ({ ...p, responseTimeHours: parseInt(e.target.value) || 4 }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Resolution Time (hours) *</Label>
                                    <Input type="number" min="1" value={formData.resolutionTimeHours}
                                        onChange={e => setFormData(p => ({ ...p, resolutionTimeHours: parseInt(e.target.value) || 24 }))} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                            <Button type="submit" disabled={!formData.name}>Create Policy</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default SLADashboard;

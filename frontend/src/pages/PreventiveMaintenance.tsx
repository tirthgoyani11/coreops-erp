import { useState, useEffect } from 'react';
import { useToast } from '../hooks/useToast';
import {
    Plus,
    MoreHorizontal,
    Play,
    Pause
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
    asset: {
        id: string;
        name: string;
        assetTag: string;
    };
    title: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    nextRun: string;
    lastRun?: string;
    status: 'active' | 'paused';
    assignedTo?: {
        firstName: string;
        lastName: string;
    };
}

export function PreventiveMaintenance() {
    const toast = useToast();
    const [schedules, setSchedules] = useState<PMSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    useEffect(() => {
        setSchedules([
            {
                id: '1',
                asset: { id: 'a1', name: 'Main HVAC Unit', assetTag: 'AST-001' },
                title: 'Monthly Filter Check',
                frequency: 'monthly',
                nextRun: '2024-03-15T09:00:00Z',
                lastRun: '2024-02-15T09:00:00Z',
                status: 'active',
                assignedTo: { firstName: 'John', lastName: 'Doe' }
            },
            {
                id: '2',
                asset: { id: 'a2', name: 'Generator B', assetTag: 'AST-005' },
                title: 'Annual Oil Change',
                frequency: 'yearly',
                nextRun: '2024-06-01T08:00:00Z',
                status: 'active'
            },
            {
                id: '3',
                asset: { id: 'a3', name: 'Conveyor 1', assetTag: 'AST-012' },
                title: 'Weekly Belt Inspection',
                frequency: 'weekly',
                nextRun: '2024-02-26T07:00:00Z',
                lastRun: '2024-02-19T07:00:00Z',
                status: 'paused'
            }
        ]);
        setLoading(false);
    }, []);



    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        toast.success("Schedule created successfully (Mock)");
        setShowCreateModal(false);
    };

    const getFrequencyBadge = (freq: string) => {
        const colors: Record<string, string> = {
            daily: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            weekly: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            monthly: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            quarterly: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
            yearly: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        };
        return colors[freq] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading schedules...</div>;
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {schedules.map((schedule) => (
                    <Card key={schedule.id} className="p-4 space-y-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{schedule.title}</h3>
                                <p className="text-sm text-gray-500">{schedule.asset.name} ({schedule.asset.assetTag})</p>
                            </div>
                            <Badge className={getFrequencyBadge(schedule.frequency)}>
                                {schedule.frequency}
                            </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Next Run:</span>
                                <span className="font-medium">{new Date(schedule.nextRun).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Last Run:</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {schedule.lastRun ? new Date(schedule.lastRun).toLocaleDateString() : 'Never'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Assigned To:</span>
                                <span className="font-medium">
                                    {schedule.assignedTo ? `${schedule.assignedTo.firstName} ${schedule.assignedTo.lastName}` : 'Unassigned'}
                                </span>
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                            {schedule.status === 'active' ? (
                                <Button variant="outline" size="sm" className="text-amber-600 hover:text-amber-700">
                                    <Pause className="w-4 h-4 mr-1" /> Pause
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700">
                                    <Play className="w-4 h-4 mr-1" /> Resume
                                </Button>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Create Modal Mock */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create PM Schedule</DialogTitle>
                        <DialogDescription>Set up a recurring maintenance task for an asset.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input placeholder="e.g. Monthly Inspection" />
                        </div>
                        <div className="space-y-2">
                            <Label>Frequency</Label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                        <Button onClick={handleCreate}>Create Schedule</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default PreventiveMaintenance;

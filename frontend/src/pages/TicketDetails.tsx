import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../hooks/useToast';
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    User,
    Calendar,
    Clock,
    AlertTriangle,
    FileText,
    Wrench,
    DollarSign,
    Package
} from 'lucide-react';
import { format } from 'date-fns';

// Components
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { Input } from '../components/ui/Input';

export default function TicketDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, hasPermission } = useAuthStore();
    const toast = useToast();
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState('overview');

    // Approval state
    const [approvalNote, setApprovalNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Fetch ticket
    const fetchTicket = async () => {
        try {
            const res = await api.get(`/maintenance/${id}`);
            setTicket(res.data.data);
        } catch (error) {
            toast.error('Failed to load ticket details');
            navigate('/maintenance');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTicket();
    }, [id]);

    const handleApproval = async (status: 'approved' | 'rejected') => {
        if (!approvalNote) {
            toast.error('Please add a note for this decision');
            return;
        }

        setActionLoading(true);
        try {
            await api.put(`/maintenance/${id}`, {
                approvalStatus: status,
                approvalNotes: approvalNote
            });
            toast.success(`Ticket ${status}`);
            fetchTicket();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAssign = async (userId: string) => {
        // Implementation for assigning user dialog would go here
        // For MVP, simplistic
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!ticket) return <div className="p-8 text-center">Ticket not found</div>;

    const algo = ticket.algorithmDecision || {};
    const isManager = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user?.role || '');

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/maintenance')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{ticket.ticketNumber}</h1>
                            <Badge variant={ticket.status === 'COMPLETED' ? 'success' : 'default'}>
                                {ticket.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline">{ticket.priority}</Badge>
                        </div>
                        <p className="text-gray-500 mt-1">{ticket.issueDescription}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {ticket.status === 'COMPLETED' && (
                        <Button variant="outline">Download Report</Button>
                    )}
                    {/* Primary Action Button based on status & role */}
                    {ticket.approvalStatus === 'pending' && isManager && (
                        <div className="flex gap-2">
                            <Button variant="destructive" onClick={() => handleApproval('rejected')}>
                                Reject
                            </Button>
                            <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproval('approved')}>
                                Approve
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column (2/3) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Algorithm Panel */}
                    {algo.recommendation && (
                        <Card className="p-4 border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10">
                            <h3 className="flex items-center gap-2 font-semibold text-blue-800 dark:text-blue-300">
                                <DollarSign className="w-4 h-4" />
                                Repair-vs-Replace Analysis
                            </h3>
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">Asset Value</p>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                        ₹{algo.currentBookValue?.toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Repair Cost</p>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                        ₹{algo.estimatedRepairCost?.toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Ratio</p>
                                    <p className={`font-medium ${(algo.repairToValueRatio || 0) > 0.5 ? 'text-red-600' : 'text-green-600'}`}>
                                        {((algo.repairToValueRatio || 0) * 100).toFixed(1)}%
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Recommendation</p>
                                    <Badge variant={algo.recommendation === 'approve' ? 'success' : 'destructive'} className="uppercase">
                                        {algo.recommendation}
                                    </Badge>
                                </div>
                            </div>
                            <p className="mt-3 text-sm text-blue-700 dark:text-blue-400 italic">
                                "{algo.reasoning}"
                            </p>
                        </Card>
                    )}

                    <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                        <TabsList className="w-full justify-start">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="worklog">Work Log</TabsTrigger>
                            <TabsTrigger value="parts">Parts Used</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-4">
                            <Card className="p-6">
                                <h3 className="font-semibold mb-4">Ticket Information</h3>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 text-sm">
                                    <div>
                                        <dt className="text-gray-500">Asset</dt>
                                        <dd className="font-medium flex items-center gap-2 mt-1">
                                            {ticket.assetId?.name}
                                            <span className="text-xs text-gray-400">({ticket.assetId?.serialNumber})</span>
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Location</dt>
                                        <dd className="font-medium mt-1">
                                            {ticket.assetId?.location?.building} - {ticket.assetId?.location?.room}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Reported By</dt>
                                        <dd className="font-medium mt-1">{ticket.requestedBy?.name}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Reported Date</dt>
                                        <dd className="font-medium mt-1">{format(new Date(ticket.createdAt), 'PP p')}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Issue Type</dt>
                                        <dd className="font-medium capitalize mt-1">{ticket.issueType?.replace('_', ' ')}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Assigned Technician</dt>
                                        <dd className="font-medium mt-1">{ticket.assignedTo?.name || 'Unassigned'}</dd>
                                    </div>
                                </dl>
                            </Card>

                            {ticket.approvalStatus === 'pending' && isManager && (
                                <Card className="p-6 border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800">
                                    <h3 className="font-semibold mb-2 flex items-center gap-2 text-orange-800 dark:text-orange-200">
                                        <AlertTriangle className="w-4 h-4" />
                                        Approval Required
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        This ticket requires manager approval because the estimated cost (₹{ticket.estimatedCost}) exceeds the auto-approval threshold.
                                    </p>
                                    <Input
                                        placeholder="Add approval/rejection notes..."
                                        value={approvalNote}
                                        onChange={(e) => setApprovalNote(e.target.value)}
                                        className="bg-white dark:bg-gray-900"
                                    />
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="worklog">
                            <Card className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold">Technician Logs</h3>
                                    <Button variant="outline" size="sm">Add Entry</Button>
                                </div>
                                {ticket.workLog?.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No work logged yet.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {ticket.workLog.map((log: any, i: number) => (
                                            <div key={i} className="flex gap-4 pb-4 border-b last:border-0 border-gray-100 dark:border-gray-800">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold">
                                                    {log.technician?.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{log.technician?.name}</p>
                                                    <p className="text-xs text-gray-500">{format(new Date(log.startTime), 'MMM d, h:mm a')} - {log.hoursWorked} hrs</p>
                                                    <p className="text-sm mt-1">{log.notes}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </TabsContent>

                        <TabsContent value="parts">
                            <Card className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold">Spare Parts Used</h3>
                                    <Button variant="outline" size="sm">Add Part</Button>
                                </div>
                                {ticket.sparePartsUsed?.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No parts used yet.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm item-left">
                                            <thead>
                                                <tr className="text-gray-500 border-b">
                                                    <th className="pb-2 text-left">Part Name</th>
                                                    <th className="pb-2 text-right">Qty</th>
                                                    <th className="pb-2 text-right">Cost</th>
                                                    <th className="pb-2 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ticket.sparePartsUsed.map((part: any, i: number) => (
                                                    <tr key={i} className="border-b last:border-0">
                                                        <td className="py-2">{part.name} <span className="text-xs text-gray-400">({part.partNumber})</span></td>
                                                        <td className="py-2 text-right">{part.quantity}</td>
                                                        <td className="py-2 text-right">₹{part.costPerUnit}</td>
                                                        <td className="py-2 text-right">₹{part.quantity * part.costPerUnit}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right Column (1/3) */}
                <div className="space-y-6">
                    <Card className="p-4">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Timeline</h3>
                        <div className="relative pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-6">
                            {[
                                { label: 'Created', date: ticket.createdAt, icon: FileText },
                                ticket.assignedDate ? { label: 'Assigned', date: ticket.assignedDate, icon: User } : null,
                                ticket.approvalDate ? { label: 'Approved', date: ticket.approvalDate, icon: CheckCircle } : null,
                                ticket.completedDate ? { label: 'Completed', date: ticket.completedDate, icon: CheckCircle } : null,
                            ].filter(Boolean).map((step: any, i) => (
                                <div key={i} className="relative">
                                    <div className="absolute -left-[21px] top-0 bg-white dark:bg-gray-900 p-1">
                                        <step.icon className="w-4 h-4 text-primary-600" />
                                    </div>
                                    <p className="text-sm font-medium">{step.label}</p>
                                    <p className="text-xs text-gray-500">{format(new Date(step.date), 'MMM d, h:mm a')}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

            </div>
        </div>
    );
}

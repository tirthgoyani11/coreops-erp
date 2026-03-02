import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
    AlertCircle,
    CheckCircle2,
    ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';

interface MaintenanceTableViewProps {
    tickets: any[];
    onRefresh: () => void;
}

export function MaintenanceTableView({ tickets }: MaintenanceTableViewProps) {
    const navigate = useNavigate();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CRITICAL': return 'destructive';
            case 'COMPLETED': return 'success';
            case 'IN_PROGRESS': return 'default'; // Blue usually
            case 'REQUESTED': return 'secondary';
            default: return 'outline';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'CRITICAL': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'HIGH': return <AlertCircle className="w-4 h-4 text-orange-500" />;
            default: return null;
        }
    };

    if (tickets.length === 0) {
        return (
            <Card className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                    <CheckCircle2 className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No tickets found</h3>
                <p className="mt-1">Try adjusting your filters or create a new ticket.</p>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden border border-gray-200 dark:border-gray-800">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900/50 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-3">Ticket ID</th>
                            <th className="px-4 py-3">Asset</th>
                            <th className="px-4 py-3">Issue</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Priority</th>
                            <th className="px-4 py-3">Assigned To</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {tickets.map((ticket) => (
                            <tr
                                key={ticket.id}
                                className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                onClick={() => navigate(`/maintenance/${ticket.id}`)}
                            >
                                <td className="px-4 py-3 font-medium text-primary-600">
                                    {ticket.ticketNumber}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                            {ticket.asset?.name || 'Unknown Asset'}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {ticket.asset?.serialNumber}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 max-w-xs truncate" title={ticket.issueDescription}>
                                    {ticket.issueDescription}
                                </td>
                                <td className="px-4 py-3">
                                    <Badge variant={getStatusColor(ticket.status) as any}>
                                        {ticket.status.replaceAll('_', ' ')}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {getPriorityIcon(ticket.priority)}
                                        <span className="capitalize">{ticket.priority}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {ticket.assignedTo ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                                                {ticket.assignedTo.name.charAt(0)}
                                            </div>
                                            <span className="truncate max-w-[100px]">{ticket.assignedTo.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic">Unassigned</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-gray-500">
                                    {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        View <ArrowRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

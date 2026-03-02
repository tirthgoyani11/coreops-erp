import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import { useToast } from '../hooks/useToast';
import {
    List,
    Calendar as CalendarIcon,
    Plus,
    Search,
    Kanban as KanbanIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Components
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/Select';
import { Card } from '../components/ui/Card';
// Badge unused
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs'; // TabsContent unused

// Views
import { MaintenanceTableView } from '../components/maintenance/MaintenanceTableView';
import { MaintenanceKanbanView } from '../components/maintenance/MaintenanceKanbanView';
import { MaintenanceCalendarView } from '../components/maintenance/MaintenanceCalendarView';

export function Maintenance() {
    const { hasPermission } = useAuthStore(); // user unused
    const navigate = useNavigate();
    const toast = useToast();
    const [view, setView] = useState<'table' | 'kanban' | 'calendar'>('table');
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'all',
        priority: 'all',
        search: ''
    });

    // Fetch tickets
    const fetchTickets = async () => {
        setLoading(true);
        try {
            // Build query string
            const params = new URLSearchParams();
            if (filters.status !== 'all') params.append('status', filters.status);
            if (filters.priority !== 'all') params.append('priority', filters.priority);

            // For calendar, we might need a specific range, but for now fetch all active
            // Backend handles role-based scoping automatically

            const response = await api.get(`/maintenance?${params.toString()}`);
            setTickets(response.data.data);
        } catch (error) {
            console.error('Failed to fetch tickets:', error);
            toast.error('Failed to load maintenance tickets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [filters]);

    // Derived filtered tickets for client-side search (since backend search might be partial)
    const filteredTickets = tickets.filter((ticket: any) =>
        (ticket.ticketNumber || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (ticket.issueDescription || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (ticket.asset?.name || '').toLowerCase().includes(filters.search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Maintenance</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage work orders, schedules, and repairs
                    </p>
                </div>

                {hasPermission('tickets.create') && (
                    <Button onClick={() => navigate('/maintenance/new')}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Ticket
                    </Button>
                )}
            </div>

            {/* Controls */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    {/* View Switcher */}
                    <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full md:w-auto">
                        <TabsList>
                            <TabsTrigger value="table">
                                <List className="w-4 h-4 mr-2" />
                                List
                            </TabsTrigger>
                            <TabsTrigger value="kanban">
                                <KanbanIcon className="w-4 h-4 mr-2" />
                                Kanban
                            </TabsTrigger>
                            <TabsTrigger value="calendar">
                                <CalendarIcon className="w-4 h-4 mr-2" />
                                Calendar
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search tickets..."
                                className="pl-9"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>

                        <Select
                            value={filters.status}
                            onValueChange={(val: string) => setFilters({ ...filters, status: val })}
                        >
                            <SelectTrigger className="w-full sm:w-40">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="REQUESTED">Requested</SelectItem>
                                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                <SelectItem value="PENDING_PARTS">Pending Parts</SelectItem>
                                <SelectItem value="APPROVED">Approved</SelectItem>
                                <SelectItem value="REJECTED">Rejected</SelectItem>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                                <SelectItem value="CLOSED">Closed</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.priority}
                            onValueChange={(val: string) => setFilters({ ...filters, priority: val })}
                        >
                            <SelectTrigger className="w-full sm:w-40">
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                <SelectItem value="CRITICAL">Critical</SelectItem>
                                <SelectItem value="HIGH">High</SelectItem>
                                <SelectItem value="MEDIUM">Medium</SelectItem>
                                <SelectItem value="LOW">Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Card>

            {/* Content Area */}
            <div className="min-h-[500px]">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : (
                    <>
                        {view === 'table' && (
                            <MaintenanceTableView
                                tickets={filteredTickets}
                                onRefresh={fetchTickets}
                            />
                        )}
                        {view === 'kanban' && (
                            <MaintenanceKanbanView
                                tickets={filteredTickets}
                                onRefresh={fetchTickets}
                            />
                        )}
                        {view === 'calendar' && (
                            <MaintenanceCalendarView
                                tickets={filteredTickets}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default Maintenance;

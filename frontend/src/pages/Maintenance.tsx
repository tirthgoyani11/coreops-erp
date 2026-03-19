import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import { useToast } from '../hooks/useToast';
import {
    List,
    Calendar as CalendarIcon,
    Plus,
    Search,
    Kanban as KanbanIcon,
    ShieldCheck,
    GanttChart,
    ClipboardCheck,
    BarChart3,
    Wrench,
    Siren,
    Clock3,
    AlertTriangle,
    Users,
    Bot,
    RotateCw
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
import { PageHeader } from '../components/ui/PageHeader';

export function Maintenance() {
    const { hasPermission } = useAuthStore(); // user unused
    const navigate = useNavigate();
    const toast = useToast();
    const [view, setView] = useState<'table' | 'kanban' | 'calendar'>('table');
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<any>(null);
    const [insights, setInsights] = useState<any>(null);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [insightsLoading, setInsightsLoading] = useState(true);
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

    const fetchOperationalIntelligence = async () => {
        setOverviewLoading(true);
        setInsightsLoading(true);
        try {
            const [overviewResponse, insightsResponse] = await Promise.all([
                api.get('/maintenance/overview'),
                api.get('/maintenance/insights', { params: { limit: 12 } }),
            ]);

            setOverview(overviewResponse.data?.data || null);
            setInsights(insightsResponse.data?.data || null);
        } catch (error) {
            console.error('Failed to fetch maintenance intelligence:', error);
            toast.error('Maintenance intelligence is temporarily unavailable');
        } finally {
            setOverviewLoading(false);
            setInsightsLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [filters.status, filters.priority]);

    useEffect(() => {
        fetchOperationalIntelligence();
    }, [filters.status, filters.priority]);

    // Derived filtered tickets for client-side search (since backend search might be partial)
    const filteredTickets = tickets.filter((ticket: any) =>
        (ticket.ticketNumber || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (ticket.issueDescription || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (ticket.asset?.name || '').toLowerCase().includes(filters.search.toLowerCase())
    );

    const riskLabel = (() => {
        const score = Number(insights?.riskScore || 0);
        if (score >= 75) return 'Severe';
        if (score >= 50) return 'Elevated';
        if (score >= 25) return 'Guarded';
        return 'Stable';
    })();

    const intelligenceCards = [
        {
            title: 'Open Work Orders',
            value: overview?.openTickets ?? 0,
            helper: `${overview?.criticalOpen ?? 0} critical`,
            icon: Siren,
            tone: 'text-red-600',
        },
        {
            title: 'SLA Pressure',
            value: `${overview?.slaBreached ?? 0} / ${overview?.slaAtRisk ?? 0}`,
            helper: 'Breached / next 24h risk',
            icon: AlertTriangle,
            tone: 'text-amber-600',
        },
        {
            title: 'Avg Resolution',
            value: `${overview?.avgResolutionHours ?? 0}h`,
            helper: 'Last 30 days',
            icon: Clock3,
            tone: 'text-blue-600',
        },
        {
            title: 'Unassigned Queue',
            value: overview?.unassignedOpen ?? 0,
            helper: `${overview?.highOpen ?? 0} high priority`,
            icon: Users,
            tone: 'text-emerald-600',
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Maintenance"
                subtitle="Manage work orders, schedules, and repairs"
                icon={Wrench}
                actions={
                    hasPermission('tickets.create') && (
                        <Button onClick={() => navigate('/maintenance/new')}>
                            <Plus className="w-4 h-4 mr-2" />
                            New Ticket
                        </Button>
                    )
                }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {intelligenceCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Card key={card.title} className="p-4 border border-gray-200/70 dark:border-gray-800/80">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{card.title}</p>
                                    <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                        {overviewLoading ? '...' : card.value}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">{card.helper}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900">
                                    <Icon className={`w-5 h-5 ${card.tone}`} />
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <Card className="p-4 md:p-5 border border-emerald-300/50 dark:border-emerald-700/40 bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                            <Bot className="w-4 h-4" />
                            <p className="text-xs font-semibold tracking-wide uppercase">AI Operations Brief</p>
                        </div>
                        <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-50">Maintenance command intelligence</h3>
                        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                            {insightsLoading ? 'Generating operational brief...' : (insights?.summary || 'No insights available right now.')}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-1.5 bg-white/80 dark:bg-slate-900/80">
                            <p className="text-xs text-gray-600 dark:text-slate-300">Risk Score</p>
                            <p className="text-base font-semibold text-gray-900 dark:text-white">
                                {insightsLoading ? '...' : `${insights?.riskScore ?? 0}/100`} <span className="text-xs font-normal text-gray-600 dark:text-slate-300">{riskLabel}</span>
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchOperationalIntelligence}>
                            <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                            Refresh brief
                        </Button>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 p-3">
                        <p className="text-xs font-semibold tracking-wide uppercase text-gray-600 dark:text-slate-300">Immediate Actions</p>
                        <ul className="mt-2 space-y-1.5 text-sm text-gray-800 dark:text-gray-100">
                            {(insights?.immediateActions || []).slice(0, 4).map((item: string, idx: number) => (
                                <li key={idx}>• {item}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 p-3">
                        <p className="text-xs font-semibold tracking-wide uppercase text-gray-600 dark:text-slate-300">Structural Upgrades</p>
                        <ul className="mt-2 space-y-1.5 text-sm text-gray-800 dark:text-gray-100">
                            {(insights?.structuralFixes || []).slice(0, 4).map((item: string, idx: number) => (
                                <li key={idx}>• {item}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </Card>

            {/* Sub-page Navigation */}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/maintenance/preventive')}
                    className="gap-1.5"
                >
                    <ClipboardCheck className="w-4 h-4" />
                    PM Schedules
                </Button>
                {(hasPermission('tickets.approve')) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/maintenance/sla')}
                        className="gap-1.5"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        SLA Dashboard
                    </Button>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/maintenance/calendar')}
                    className="gap-1.5"
                >
                    <CalendarIcon className="w-4 h-4" />
                    Calendar
                </Button>
                {(hasPermission('tickets.approve')) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/maintenance/gantt')}
                        className="gap-1.5"
                    >
                        <GanttChart className="w-4 h-4" />
                        Gantt
                    </Button>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/maintenance/analytics')}
                    className="gap-1.5"
                >
                    <BarChart3 className="w-4 h-4" />
                    Analytics
                </Button>
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
    Ticket,
    Clock,
    QrCode,
    CheckCircle,
    AlertTriangle
} from 'lucide-react';

export function TechDashboard() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        openTickets: 0,
        completedToday: 0,
        avgResponseTime: '0h'
    });
    const [myTickets, setMyTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch stats and tickets assigned to current user
                // Using a specific dashboard endpoint or filtering maintenance list
                const res = await api.get('/maintenance?assignedTo=me&status=open,in_progress');
                const tickets = res.data.data;
                setMyTickets(tickets.slice(0, 5)); // Show top 5
                setStats({
                    openTickets: tickets.length,
                    completedToday: 0, // Placeholder, needs backend support for 'completed today' count
                    avgResponseTime: '1.5h' // Placeholder
                });
            } catch (error) {
                console.error("Failed to load tech dashboard", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Hello, {user?.name.split(' ')[0]} 👋
                    </h1>
                    <p className="text-gray-500">Ready for your shift?</p>
                </div>
                <Button onClick={() => navigate('/scan')}>
                    <QrCode className="w-4 h-4 mr-2" /> Scan Asset
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 flex items-center gap-4 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-200">
                        <Ticket className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Open Tasks</p>
                        <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.openTickets}</h3>
                    </div>
                </Card>
                <Card className="p-4 flex items-center gap-4 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-200">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Done Today</p>
                        <h3 className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.completedToday}</h3>
                    </div>
                </Card>
                <Card className="p-4 flex items-center gap-4 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800">
                    <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-200">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Avg Time</p>
                        <h3 className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.avgResponseTime}</h3>
                    </div>
                </Card>
            </div>

            {/* My Active Tickets */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">My Queue</h2>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/my-tickets')}>View All</Button>
                </div>
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading tasks...</div>
                    ) : myTickets.length === 0 ? (
                        <Card className="p-8 text-center text-gray-500">
                            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                            <p>All caught up! No open tickets.</p>
                        </Card>
                    ) : (
                        myTickets.map((ticket: any) => (
                            <Card
                                key={ticket.id}
                                className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500"
                                onClick={() => navigate(`/maintenance/${ticket.id}`)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                {ticket.ticketNumber}
                                            </span>
                                            <Badge variant={
                                                ticket.priority === 'critical' ? 'destructive' :
                                                    ticket.priority === 'high' ? 'warning' : 'secondary'
                                            }>
                                                {ticket.priority}
                                            </Badge>
                                        </div>
                                        <h3 className="font-medium text-lg">{ticket.title}</h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-2">
                                            <AlertTriangle className="w-3 h-3" />
                                            {ticket.asset?.name || 'Unknown Asset'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="outline" className="mb-2">
                                            {ticket.status.replace('_', ' ')}
                                        </Badge>
                                        <p className="text-xs text-gray-400">
                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

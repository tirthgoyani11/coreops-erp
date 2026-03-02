import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ArrowLeft } from 'lucide-react';

export function MyTickets() {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, open, closed

    useEffect(() => {
        fetchTickets();
    }, [filter]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            let statusQuery = '';
            if (filter === 'open') statusQuery = '&status=open,in_progress,pending_approval';
            if (filter === 'closed') statusQuery = '&status=completed,rejected';

            const res = await api.get(`/maintenance?assignedTo=me${statusQuery}`);
            setTickets(res.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-2xl font-bold">My Tickets</h1>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                >
                    All
                </Button>
                <Button
                    variant={filter === 'open' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('open')}
                >
                    Open
                </Button>
                <Button
                    variant={filter === 'closed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('closed')}
                >
                    Closed
                </Button>
            </div>

            {/* List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-8">Loading...</div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No tickets found.
                    </div>
                ) : (
                    tickets.map((ticket: any) => (
                        <Card
                            key={ticket.id}
                            className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                            onClick={() => navigate(`/maintenance/${ticket.id}`)}
                        >
                            <div className="flex justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs text-gray-500">{ticket.ticketNumber}</span>
                                        <Badge variant={ticket.priority === 'critical' ? 'destructive' : 'secondary'} className="text-[10px] px-1 py-0 h-5">
                                            {ticket.priority}
                                        </Badge>
                                    </div>
                                    <h3 className="font-semibold">{ticket.title}</h3>
                                    <p className="text-sm text-gray-500">{ticket.asset?.name}</p>
                                </div>
                                <div className="text-right">
                                    <Badge variant="outline" className="capitalize">
                                        {ticket.status.replace('_', ' ')}
                                    </Badge>
                                    <p className="text-xs text-gray-400 mt-2">
                                        {new Date(ticket.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

export default MyTickets;

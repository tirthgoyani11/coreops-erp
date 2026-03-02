import { useState, useEffect } from 'react';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
    TrendingUp,
    DollarSign,
    Clock,
    Activity,
    AlertTriangle
} from 'lucide-react';

import api from '../lib/api';

// Components
import { Card } from '../components/ui/Card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/Select';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function MaintenanceAnalytics() {
    const [timeRange, setTimeRange] = useState('30d');
    const [inventoryStats, setInventoryStats] = useState<any>(null);
    const [maintenanceTrends, setMaintenanceTrends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Initial Load
    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // Fetch Inventory Status & Trends
                const [invRes, trendsRes] = await Promise.all([
                    api.get('/analytics/inventory/status'),
                    api.get('/analytics/maintenance/trends?months=12')
                ]);

                setInventoryStats(invRes.data.data);

                // Compute 90-day (3-month) rolling average for totalCost
                const trends = trendsRes.data.data || [];
                const trendsWithRolling = trends.map((t: any, index: number, arr: any[]) => {
                    let sum = 0;
                    let count = 0;
                    for (let i = Math.max(0, index - 2); i <= index; i++) {
                        sum += arr[i].totalCost;
                        count++;
                    }
                    return {
                        ...t,
                        rollingAvg: Math.round(sum / count)
                    };
                });
                setMaintenanceTrends(trendsWithRolling);
            } catch (error) {
                console.error('Failed to load analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [timeRange]);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading analytics...</div>;
    }

    const { lowStockItems = [], byType = [], totalInventoryValue = 0 } = inventoryStats || {};

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Maintenance & Inventory Analytics</h1>
                    <p className="text-sm text-gray-500">Real-time insights and Smart Replenishment</p>
                </div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="30d">Last 30 Days</SelectItem>
                        <SelectItem value="90d">Last Quarter</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium text-gray-500">
                        Total Inventory Value
                        <DollarSign className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        ₹{totalInventoryValue.toLocaleString()}
                    </div>
                    <p className="text-xs text-blue-500 flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" /> Real-time Valuation
                    </p>
                </Card>
                <Card className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium text-gray-500">
                        Low Stock Items
                        <AlertTriangle className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{lowStockItems.length}</div>
                    <p className="text-xs text-red-500 flex items-center">
                        Needs Attention
                    </p>
                </Card>
                <Card className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium text-gray-500">
                        Avg Resolution Time
                        <Clock className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">-- hrs</div>
                    <p className="text-xs text-gray-500">Coming Soon</p>
                </Card>
                <Card className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium text-gray-500">
                        MTBF
                        <Activity className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">-- hrs</div>
                    <p className="text-xs text-gray-500">Coming Soon</p>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {/* Smart Replenishment Table */}
                <Card className="p-6 col-span-3 lg:col-span-2">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" /> Smart Replenishment (Low Stock)
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-500 border-b dark:border-gray-700">
                                <tr>
                                    <th className="pb-2">Item Name</th>
                                    <th className="pb-2">SKU</th>
                                    <th className="pb-2 text-right">Current Qty</th>
                                    <th className="pb-2 text-right">Reorder Point</th>
                                    <th className="pb-2">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {lowStockItems.length > 0 ? (
                                    lowStockItems.map((item: any) => (
                                        <tr key={item.id}>
                                            <td className="py-2 font-medium">{item.name}</td>
                                            <td className="py-2 text-gray-500">{item.sku}</td>
                                            <td className="py-2 text-right font-bold text-red-600">{item.stock?.currentQuantity ?? item.quantity}</td>
                                            <td className="py-2 text-right text-gray-500">{item.stock?.reorderPoint ?? 10}</td>
                                            <td className="py-2"><span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Critical</span></td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-green-600">
                                            All stock levels are healthy!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Maintenance Cost Trends */}
                <Card className="p-6 col-span-3">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" /> Maintenance Cost Trends (90-Day Rolling Avg)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={maintenanceTrends} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-default)" />
                                <XAxis dataKey="period" tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="left" tickFormatter={(v) => `₹${v}`} tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}
                                    formatter={(value: any, name: any) => [
                                        name === 'ticketCount' ? value : `₹${value.toLocaleString()}`,
                                        name === 'totalCost' ? 'Monthly Cost' : name === 'rollingAvg' ? '90-Day Rolling Avg' : 'Ticket Count'
                                    ]}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="totalCost" name="Monthly Cost" fill="var(--color-primary-muted)" radius={[4, 4, 0, 0]} />
                                <Line yAxisId="left" type="monotone" dataKey="rollingAvg" name="90-Day Rolling Avg" stroke="var(--color-error)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                <Line yAxisId="right" type="step" dataKey="ticketCount" name="Ticket Count" stroke="var(--color-success)" strokeWidth={2} dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Inventory Distribution */}
                <Card className="p-6 col-span-3 lg:col-span-1">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Inventory Distribution</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={byType} // From API
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="count"
                                    nameKey="id"
                                >
                                    {byType.map((_entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default MaintenanceAnalytics;

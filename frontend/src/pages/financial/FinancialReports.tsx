import { useState, useEffect, useMemo } from 'react';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Download,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import api from '../../lib/api';

interface Transaction {
    _id: string;
    type: 'INCOME' | 'EXPENSE';
    category: string;
    amount: number;
    date: string;
    description: string;
    status?: 'pending' | 'cleared' | 'reconciled';
}

interface Budget {
    category: string;
    amount: {
        limit: number;
        spent: number;
    };
}

export function FinancialReports() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('this_month'); // 'this_month', 'last_month', 'ytd'

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [txRes, budgetRes] = await Promise.all([
                    api.get('/finance/transactions'),
                    api.get('/finance/budgets')
                ]);

                if (txRes.data.success) {
                    setTransactions(txRes.data.data);
                }
                if (budgetRes.data.success) {
                    setBudgets(budgetRes.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch report data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // 1. Budget vs Actual Data
    const budgetVsActualData = useMemo(() => {
        return budgets.map(b => ({
            name: b.category,
            Budget: b.amount.limit,
            Actual: b.amount.spent,
            fill: b.amount.spent > b.amount.limit ? '#ef4444' : '#10b981' // Red if over budget
        })).filter(b => b.Budget > 0); // Only show active budgets
    }, [budgets]);

    // 2. Profit & Loss (Income vs Expense Trend)
    const pnlData = useMemo(() => {
        // Group by month (last 6 months)
        const months: Record<string, { income: number; expense: number }> = {};

        transactions.forEach(t => {
            const date = new Date(t.date);
            const key = date.toLocaleString('default', { month: 'short' });

            if (!months[key]) months[key] = { income: 0, expense: 0 };

            if (t.type === 'INCOME') months[key].income += t.amount;
            else months[key].expense += t.amount;
        });

        return Object.entries(months).map(([name, data]) => ({
            name,
            Income: data.income,
            Expense: data.expense,
            Profit: data.income - data.expense
        }));
    }, [transactions]);

    // 3. Pending Reconciliation
    const pendingTransactions = useMemo(() => {
        return transactions.filter(t => t.status === 'pending' || !t.status);
    }, [transactions]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-[380px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                    <div className="h-[380px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                </div>
                <div className="h-[300px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Controls */}
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-[var(--primary)]/10 rounded-lg text-emerald-600 dark:text-[var(--primary)]">
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Financial Reports</h2>
                        <p className="text-sm text-gray-500">Real-time financial analysis</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    >
                        <option value="this_month">This Month</option>
                        <option value="last_month">Last Month</option>
                        <option value="ytd">Year to Date (YTD)</option>
                    </select>
                    <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Budget vs Actual */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-gray-500" />
                        Budget vs Actual
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={budgetVsActualData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#6B7280" />
                                <YAxis axisLine={false} tickLine={false} stroke="#6B7280" />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: 'transparent' }}
                                />
                                <Legend />
                                <Bar dataKey="Budget" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Actual" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Profit & Loss Trend */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-gray-500" />
                        Profit & Loss Trend
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={pnlData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#6B7280" />
                                <YAxis axisLine={false} tickLine={false} stroke="#6B7280" />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="Income" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="Expense" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="Profit" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Reconciliation Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold">Bank Reconciliation</h3>
                        <p className="text-sm text-gray-500">Transactions pending verification</p>
                    </div>
                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-medium">
                        {pendingTransactions.length} Pending
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Description</th>
                                <th className="px-6 py-3">Reference</th>
                                <th className="px-6 py-3 text-right">Amount</th>
                                <th className="px-6 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {pendingTransactions.slice(0, 5).map((tx) => (
                                <tr key={tx._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-6 py-4 font-medium">{new Date(tx.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">{tx.description}</td>
                                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">REF-{tx._id.slice(-6)}</td>
                                    <td className={`px-6 py-4 text-right font-medium ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                        {tx.type === 'INCOME' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="text-blue-600 hover:text-blue-700 font-medium text-xs">Verify</button>
                                    </td>
                                </tr>
                            ))}
                            {pendingTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        All transactions reconciled.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

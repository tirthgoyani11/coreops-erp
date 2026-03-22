import { useState, useEffect } from 'react';
import { apiGet, getErrorMessage } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { TrendingUp, TrendingDown, DollarSign, Loader2, AlertCircle, ArrowUpRight, ArrowDownRight, Percent } from 'lucide-react';

interface PLData {
    period: { startDate: string; endDate: string };
    revenue: { items: { code: string; name: string; amount: number }[]; total: number };
    expenses: { items: { code: string; name: string; amount: number }[]; total: number };
    netIncome: number;
    profitMargin: number | string;
    transactionSummary: { income: number; expense: number; net: number };
}

function fmt(n: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
}

export function ProfitLoss() {
    const [data, setData] = useState<PLData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

    useEffect(() => { fetchPL(); }, [period]);

    const fetchPL = async () => {
        setLoading(true);
        const now = new Date();
        let startDate: string;
        if (period === 'month') startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        else if (period === 'quarter') startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
        else startDate = new Date(now.getFullYear(), 0, 1).toISOString();

        try {
            const res = await apiGet<any>('/gl/profit-loss', { startDate, endDate: now.toISOString() });
            setData(res.data);
        } catch (e) { setError(getErrorMessage(e)); }
        setLoading(false);
    };

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;
    if (!data) return null;

    const isProfit = data.netIncome >= 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Profit & Loss Statement</h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                        {new Date(data.period.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' — '}
                        {new Date(data.period.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex bg-[var(--bg-card)] border border-[var(--border-color)] p-1 rounded-lg">
                    {(['month', 'quarter', 'year'] as const).map(p => (
                        <button key={p} onClick={() => setPeriod(p)}
                            className={`px-4 py-2 rounded-md text-sm capitalize transition-colors ${period === p
                                ? 'bg-[var(--primary)] text-black font-semibold shadow-[0_0_10px_var(--primary-glow)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}>{p}</button>
                    ))}
                </div>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card variant="glass">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Total Revenue</p>
                                <p className="text-2xl font-bold text-emerald-400 mt-1">{fmt(data.revenue.total)}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                                <ArrowUpRight className="w-6 h-6 text-emerald-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card variant="glass">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Total Expenses</p>
                                <p className="text-2xl font-bold text-red-400 mt-1">{fmt(data.expenses.total)}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                                <ArrowDownRight className="w-6 h-6 text-red-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card variant="glass">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                                    {isProfit ? 'Net Profit' : 'Net Loss'}
                                </p>
                                <p className={`text-2xl font-bold mt-1 ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {fmt(Math.abs(data.netIncome))}
                                </p>
                                <p className="text-xs text-[var(--text-secondary)] mt-1">
                                    Margin: {data.profitMargin}%
                                </p>
                            </div>
                            <div className={`w-12 h-12 rounded-xl ${isProfit ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'} border flex items-center justify-center`}>
                                <Percent className={`w-6 h-6 ${isProfit ? 'text-emerald-400' : 'text-red-400'}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* P&L Statement */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue */}
                <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Revenue</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {data.revenue.items.map((item, i) => (
                                <div key={i} className="flex justify-between items-center p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                    <div>
                                        <span className="font-mono text-xs text-emerald-400 mr-2">{item.code}</span>
                                        <span className="text-sm text-[var(--text-primary)]">{item.name}</span>
                                    </div>
                                    <span className="font-semibold text-emerald-400">{fmt(item.amount)}</span>
                                </div>
                            ))}
                            {data.revenue.items.length === 0 && <p className="text-[var(--text-secondary)] text-sm text-center py-4">No GL revenue entries</p>}
                            <div className="flex justify-between items-center p-2.5 border-t-2 border-emerald-500/30 mt-2 pt-3">
                                <span className="font-bold text-[var(--text-primary)]">Total Revenue</span>
                                <span className="font-bold text-emerald-400 text-lg">{fmt(data.revenue.total)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Expenses */}
                <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-400" /> Expenses</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {data.expenses.items.map((item, i) => (
                                <div key={i} className="flex justify-between items-center p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                                    <div>
                                        <span className="font-mono text-xs text-red-400 mr-2">{item.code}</span>
                                        <span className="text-sm text-[var(--text-primary)]">{item.name}</span>
                                    </div>
                                    <span className="font-semibold text-red-400">{fmt(item.amount)}</span>
                                </div>
                            ))}
                            {data.expenses.items.length === 0 && <p className="text-[var(--text-secondary)] text-sm text-center py-4">No GL expense entries</p>}
                            <div className="flex justify-between items-center p-2.5 border-t-2 border-red-500/30 mt-2 pt-3">
                                <span className="font-bold text-[var(--text-primary)]">Total Expenses</span>
                                <span className="font-bold text-red-400 text-lg">{fmt(data.expenses.total)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Net Income Bar */}
            <Card variant={isProfit ? 'glass' : 'outlined'}>
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl ${isProfit ? 'bg-emerald-500/15' : 'bg-red-500/15'} flex items-center justify-center`}>
                                <DollarSign className={`w-6 h-6 ${isProfit ? 'text-emerald-400' : 'text-red-400'}`} />
                            </div>
                            <div>
                                <p className="font-bold text-lg text-[var(--text-primary)]">{isProfit ? 'Net Profit' : 'Net Loss'}</p>
                                <p className="text-xs text-[var(--text-secondary)]">Revenue - Expenses = {fmt(data.revenue.total)} - {fmt(data.expenses.total)}</p>
                            </div>
                        </div>
                        <p className={`text-3xl font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isProfit ? '+' : '-'}{fmt(Math.abs(data.netIncome))}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Transaction-based comparison */}
            <Card variant="outlined">
                <CardHeader><CardTitle className="text-sm text-[var(--text-secondary)]">Transaction-Based Comparison</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-xs text-[var(--text-secondary)]">Income (Txn)</p>
                            <p className="font-semibold text-emerald-400">{fmt(data.transactionSummary.income)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-[var(--text-secondary)]">Expense (Txn)</p>
                            <p className="font-semibold text-red-400">{fmt(data.transactionSummary.expense)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-[var(--text-secondary)]">Net (Txn)</p>
                            <p className={`font-semibold ${data.transactionSummary.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {fmt(data.transactionSummary.net)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

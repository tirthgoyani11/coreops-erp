import { useState, useEffect } from 'react';
import { apiGet, getErrorMessage } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import {
    TrendingUp, ArrowUpRight, ArrowDownRight,
    Loader2, AlertCircle, ArrowRight, Activity
} from 'lucide-react';

interface CashFlowData {
    historical: Record<string, { income: number; expense: number; net: number; dailyAvgIncome: number; dailyAvgExpense: number }>;
    projections: Record<string, { projectedIncome: number; projectedExpense: number; projectedNet: number }>;
    monthly: { month: string; income: number; expense: number; net: number }[];
}

function fmt(n: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
}

export function CashFlow() {
    const [data, setData] = useState<CashFlowData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const res = await apiGet<any>('/gl/cash-flow');
                setData(res.data);
            } catch (e) { setError(getErrorMessage(e)); }
            setLoading(false);
        })();
    }, []);

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;
    if (!data) return null;

    const hist = data.historical.last30Days;
    const maxMonthly = Math.max(...data.monthly.map(m => Math.max(m.income, m.expense)), 1);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Cash Flow Analysis</h1>
                <p className="text-sm text-[var(--text-secondary)]">Historical trends, projections & monthly breakdown</p>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}

            {/* Period Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['last30Days', 'last60Days', 'last90Days'].map((key, i) => {
                    const d = (data.historical as any)[key];
                    const label = ['Last 30 Days', 'Last 60 Days', 'Last 90 Days'][i];
                    return (
                        <Card key={key} variant="glass">
                            <CardContent className="p-5">
                                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-3">{label}</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-emerald-400 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> Income</span>
                                        <span className="font-semibold text-emerald-400">{fmt(d.income)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-red-400 flex items-center gap-1"><ArrowDownRight className="w-3 h-3" /> Expense</span>
                                        <span className="font-semibold text-red-400">{fmt(d.expense)}</span>
                                    </div>
                                    <div className="border-t border-[var(--border-color)] pt-2 flex justify-between items-center">
                                        <span className="text-sm text-[var(--text-primary)] font-medium">Net</span>
                                        <span className={`font-bold text-lg ${d.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {d.net >= 0 ? '+' : ''}{fmt(d.net)}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Daily Averages */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[var(--primary)]" /> Daily Averages (Last 30 Days)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="text-center p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                            <p className="text-xs text-[var(--text-secondary)]">Avg Daily Income</p>
                            <p className="text-2xl font-bold text-emerald-400 mt-1">{fmt(hist.dailyAvgIncome)}</p>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                            <p className="text-xs text-[var(--text-secondary)]">Avg Daily Expense</p>
                            <p className="text-2xl font-bold text-red-400 mt-1">{fmt(hist.dailyAvgExpense)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Projections */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[var(--primary)]" /> Cash Flow Projections
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border-color)]">
                                    <th className="text-left p-3 text-[var(--text-secondary)]">Period</th>
                                    <th className="text-right p-3 text-emerald-400">Projected Income</th>
                                    <th className="text-right p-3 text-red-400">Projected Expense</th>
                                    <th className="text-right p-3 text-[var(--text-primary)]">Projected Net</th>
                                </tr>
                            </thead>
                            <tbody>
                                {['next30Days', 'next60Days', 'next90Days'].map((key, i) => {
                                    const p = (data.projections as any)[key];
                                    const label = ['Next 30 Days', 'Next 60 Days', 'Next 90 Days'][i];
                                    return (
                                        <tr key={key} className="border-b border-[var(--border-color)]/30 hover:bg-[var(--bg-card-hover)]">
                                            <td className="p-3 text-[var(--text-primary)] font-medium flex items-center gap-2">
                                                <ArrowRight className="w-3 h-3 text-[var(--primary)]" /> {label}
                                            </td>
                                            <td className="p-3 text-right text-emerald-400">{fmt(p.projectedIncome)}</td>
                                            <td className="p-3 text-right text-red-400">{fmt(p.projectedExpense)}</td>
                                            <td className={`p-3 text-right font-bold ${p.projectedNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {p.projectedNet >= 0 ? '+' : ''}{fmt(p.projectedNet)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Monthly Breakdown — Visual Bars */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Monthly Breakdown (Last 6 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.monthly.map((m, i) => (
                            <div key={i} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-[var(--text-primary)] font-medium">{m.month}</span>
                                    <span className={m.net >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                        Net: {m.net >= 0 ? '+' : ''}{fmt(m.net)}
                                    </span>
                                </div>
                                <div className="flex gap-1 h-6">
                                    <div className="bg-emerald-500/30 rounded-l-md transition-all duration-500"
                                        style={{ width: `${(m.income / maxMonthly) * 100}%` }}
                                        title={`Income: ${fmt(m.income)}`}
                                    />
                                    <div className="bg-red-500/30 rounded-r-md transition-all duration-500"
                                        style={{ width: `${(m.expense / maxMonthly) * 100}%` }}
                                        title={`Expense: ${fmt(m.expense)}`}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                                    <span>↑ {fmt(m.income)}</span>
                                    <span>↓ {fmt(m.expense)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-4 mt-4 text-xs text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500/30" /> Income</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500/30" /> Expense</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

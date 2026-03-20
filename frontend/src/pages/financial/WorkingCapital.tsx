import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Loader2, RefreshCw, Scale, TrendingUp } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

type AgingSummary = {
    current: number;
    thirtyDays: number;
    sixtyDays: number;
    ninetyDays: number;
    overNinetyDays: number;
    total: number;
};

type APResponse = {
    summary: AgingSummary;
    vendors: Array<{
        vendorName: string;
        buckets: AgingSummary;
    }>;
};

type ARResponse = {
    summary: AgingSummary;
    customers: Array<{
        customerName: string;
        buckets: AgingSummary;
    }>;
};

function riskRatio(overdue: number, total: number) {
    if (!total) return 0;
    return Math.round((overdue / total) * 100);
}

export function WorkingCapital() {
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'AP' | 'AR'>('AR');
    const [ap, setAp] = useState<APResponse | null>(null);
    const [ar, setAr] = useState<ARResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [apRes, arRes] = await Promise.allSettled([
                api.get('/finance-ext/ap-aging'),
                api.get('/finance-ext/ar-aging'),
            ]);

            const nextAp = apRes.status === 'fulfilled' && apRes.value.data?.success ? apRes.value.data.data : null;
            const nextAr = arRes.status === 'fulfilled' && arRes.value.data?.success ? arRes.value.data.data : null;

            setAp(nextAp);
            setAr(nextAr);

            if (!nextAp && !nextAr) {
                setError('Unable to load AP and AR aging data right now.');
            } else if (!nextAp) {
                setError('AP aging is temporarily unavailable. Showing AR data only.');
            } else if (!nextAr) {
                setError('AR aging is temporarily unavailable. Showing AP data only.');
            }
        } catch (fetchError: any) {
            console.error('Failed to fetch working capital data:', fetchError);
            setError(fetchError?.response?.data?.message || 'Failed to load working capital data');
            setAp(null);
            setAr(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void fetchData();
    }, []);

    const metrics = useMemo(() => {
        const apTotal = Number(ap?.summary.total || 0);
        const arTotal = Number(ar?.summary.total || 0);
        const netWorkingCapital = arTotal - apTotal;

        const apOverdue = Number(ap?.summary.sixtyDays || 0) + Number(ap?.summary.ninetyDays || 0) + Number(ap?.summary.overNinetyDays || 0);
        const arOverdue = Number(ar?.summary.sixtyDays || 0) + Number(ar?.summary.ninetyDays || 0) + Number(ar?.summary.overNinetyDays || 0);

        return {
            apTotal,
            arTotal,
            netWorkingCapital,
            apRisk: riskRatio(apOverdue, apTotal),
            arRisk: riskRatio(arOverdue, arTotal),
            liquidityCover: apTotal > 0 ? Math.round((arTotal / apTotal) * 100) : 0,
        };
    }, [ap, ar]);

    const currentRows = activeTab === 'AP' ? (ap?.vendors || []) : (ar?.customers || []);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <Scale className="w-6 h-6 text-[var(--primary)]" />
                        Working Capital Command Center
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Unified AP and AR aging for cash velocity, overdue risk, and liquidity decisions.
                    </p>
                </div>
                <button
                    onClick={() => void fetchData()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                >
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </section>

            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
            ) : (
                <>
                    {error && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
                            {error}
                        </div>
                    )}
                    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Accounts Receivable</p>
                            <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(metrics.arTotal)}</p>
                        </div>
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Accounts Payable</p>
                            <p className="text-xl font-bold text-orange-400 mt-1">{formatCurrency(metrics.apTotal)}</p>
                        </div>
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Net Working Capital</p>
                            <p className={`text-xl font-bold mt-1 ${metrics.netWorkingCapital >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatCurrency(metrics.netWorkingCapital)}
                            </p>
                        </div>
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">AP Overdue Risk</p>
                            <p className="text-xl font-bold text-orange-300 mt-1">{metrics.apRisk}%</p>
                        </div>
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Liquidity Cover (AR/AP)</p>
                            <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{metrics.liquidityCover}%</p>
                        </div>
                    </section>

                    <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
                            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Actionable Signals</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div className="rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-color)] p-3">
                                <p className="text-[var(--text-secondary)]">Receivable Velocity</p>
                                <p className="text-[var(--text-primary)] mt-1">
                                    {metrics.arRisk > 35 ? 'Collections are aging fast. Escalate top delinquent accounts.' : 'Collections posture is acceptable.'}
                                </p>
                            </div>
                            <div className="rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-color)] p-3">
                                <p className="text-[var(--text-secondary)]">Payables Pressure</p>
                                <p className="text-[var(--text-primary)] mt-1">
                                    {metrics.apRisk > 30 ? 'Vendor overdue exposure is high. Prioritize settlement plan.' : 'Vendor dues are within healthy band.'}
                                </p>
                            </div>
                            <div className="rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-color)] p-3">
                                <p className="text-[var(--text-secondary)]">Liquidity Status</p>
                                <p className="text-[var(--text-primary)] mt-1">
                                    {metrics.netWorkingCapital >= 0 ? 'Working capital is net positive.' : 'Working capital is negative. Tighten spend or accelerate receivables.'}
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Aging Details</h2>
                            <div className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] p-1">
                                <button
                                    onClick={() => setActiveTab('AR')}
                                    className={`px-3 py-1.5 rounded-md text-sm ${activeTab === 'AR' ? 'bg-emerald-500/20 text-emerald-300' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]'}`}
                                >
                                    <ArrowUpRight className="w-4 h-4 inline mr-1" /> Receivables
                                </button>
                                <button
                                    onClick={() => setActiveTab('AP')}
                                    className={`px-3 py-1.5 rounded-md text-sm ${activeTab === 'AP' ? 'bg-orange-500/20 text-orange-300' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]'}`}
                                >
                                    <ArrowDownRight className="w-4 h-4 inline mr-1" /> Payables
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[var(--bg-overlay)] border-b border-[var(--border-color)] text-[var(--text-secondary)] text-sm">
                                        <th className="p-4 font-medium">{activeTab === 'AP' ? 'Vendor' : 'Customer'}</th>
                                        <th className="p-4 font-medium text-right">Current</th>
                                        <th className="p-4 font-medium text-right">1 - 30</th>
                                        <th className="p-4 font-medium text-right">31 - 60</th>
                                        <th className="p-4 font-medium text-right">61 - 90</th>
                                        <th className="p-4 font-medium text-right">&gt; 90</th>
                                        <th className="p-4 font-medium text-right border-l border-[var(--border-color)]">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">No records available.</td>
                                        </tr>
                                    ) : (
                                        currentRows.map((row: any, index: number) => (
                                            <tr key={index} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-overlay)] transition-colors">
                                                <td className="p-4 text-[var(--text-primary)] font-medium">{row.vendorName || row.customerName}</td>
                                                <td className="p-4 text-right tabular-nums text-[var(--text-secondary)]">{formatCurrency(row.buckets.current)}</td>
                                                <td className="p-4 text-right tabular-nums text-[var(--text-secondary)]">{formatCurrency(row.buckets.thirtyDays)}</td>
                                                <td className="p-4 text-right tabular-nums text-amber-300">{formatCurrency(row.buckets.sixtyDays)}</td>
                                                <td className="p-4 text-right tabular-nums text-orange-300">{formatCurrency(row.buckets.ninetyDays)}</td>
                                                <td className="p-4 text-right tabular-nums text-red-400">{formatCurrency(row.buckets.overNinetyDays)}</td>
                                                <td className="p-4 text-right tabular-nums font-bold text-[var(--primary)] border-l border-[var(--border-color)]">{formatCurrency(row.buckets.total)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

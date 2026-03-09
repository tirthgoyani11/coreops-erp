import { useState, useEffect } from 'react';
import { Loader2, ArrowDownRight, Printer } from 'lucide-react';
import api from '../../lib/api';

export function APAging() {
    const [report, setReport] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAPAging();
    }, []);

    const fetchAPAging = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/finance-ext/ap-aging');
            if (res.data.success) {
                setReport(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch AP aging report:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center pb-4 border-b border-[var(--border-color)]">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <ArrowDownRight className="w-6 h-6 text-red-400" />
                        Accounts Payable (AP) Aging
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Outstanding balances you owe to vendors, categorized by past due duration.
                    </p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-overlay)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-card)] transition-colors"
                >
                    <Printer className="w-4 h-4" /> Print
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
            ) : !report ? (
                <div className="text-center py-10 text-[var(--text-muted)]">Failed to load report.</div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                            <div className="text-xs text-[var(--text-muted)] font-medium mb-1">Current (Not Due)</div>
                            <div className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(report.summary.current)}</div>
                        </div>
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                            <div className="text-xs text-[var(--text-muted)] font-medium mb-1">1 - 30 Days Left</div>
                            <div className="text-lg font-bold text-yellow-400">{formatCurrency(report.summary.thirtyDays)}</div>
                        </div>
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                            <div className="text-xs text-[var(--text-muted)] font-medium mb-1">31 - 60 Days Overdue</div>
                            <div className="text-lg font-bold text-orange-400">{formatCurrency(report.summary.sixtyDays)}</div>
                        </div>
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                            <div className="text-xs text-[var(--text-muted)] font-medium mb-1">61 - 90 Days Overdue</div>
                            <div className="text-lg font-bold text-orange-500">{formatCurrency(report.summary.ninetyDays)}</div>
                        </div>
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                            <div className="text-xs text-[var(--text-muted)] font-medium mb-1">&gt; 90 Days Overdue</div>
                            <div className="text-lg font-bold text-red-500">{formatCurrency(report.summary.overNinetyDays)}</div>
                        </div>
                        <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-xl p-4">
                            <div className="text-xs text-[var(--primary)] font-medium mb-1 uppercase tracking-wider">Total Payable</div>
                            <div className="text-xl font-black text-[var(--primary)]">{formatCurrency(report.summary.total)}</div>
                        </div>
                    </div>

                    {/* Report Table */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-lg mt-6">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[var(--bg-overlay)] border-b border-[var(--border-color)] text-[var(--text-secondary)] text-sm">
                                        <th className="p-4 font-medium">Vendor</th>
                                        <th className="p-4 font-medium text-right">Current</th>
                                        <th className="p-4 font-medium text-right text-yellow-500/80">1 - 30 Days</th>
                                        <th className="p-4 font-medium text-right text-orange-400/80">31 - 60 Days</th>
                                        <th className="p-4 font-medium text-right text-orange-500/80">61 - 90 Days</th>
                                        <th className="p-4 font-medium text-right text-red-500/80">&gt; 90 Days</th>
                                        <th className="p-4 font-medium text-right border-l border-[var(--border-color)]">Total Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.vendors.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">No outstanding payables found.</td>
                                        </tr>
                                    ) : (
                                        report.vendors.map((v: any, idx: number) => (
                                            <tr key={idx} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-overlay)] transition-colors">
                                                <td className="p-4 text-[var(--text-primary)] font-medium">{v.vendorName}</td>
                                                <td className="p-4 text-right tabular-nums text-[var(--text-secondary)]">{formatCurrency(v.buckets.current)}</td>
                                                <td className="p-4 text-right tabular-nums text-yellow-400">{formatCurrency(v.buckets.thirtyDays)}</td>
                                                <td className="p-4 text-right tabular-nums text-orange-400">{formatCurrency(v.buckets.sixtyDays)}</td>
                                                <td className="p-4 text-right tabular-nums text-orange-500">{formatCurrency(v.buckets.ninetyDays)}</td>
                                                <td className="p-4 text-right tabular-nums text-red-500">{formatCurrency(v.buckets.overNinetyDays)}</td>
                                                <td className="p-4 text-right tabular-nums font-bold text-[var(--primary)] border-l border-[var(--border-color)]">
                                                    {formatCurrency(v.buckets.total)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

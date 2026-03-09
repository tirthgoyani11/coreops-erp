import { useState, useEffect } from 'react';
import { Scale, Printer, Loader2, Download } from 'lucide-react';
import api from '../../lib/api';

export function BalanceSheet() {
    const [report, setReport] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchBalanceSheet();
    }, []);

    const fetchBalanceSheet = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/gl/balance-sheet');
            if (res.data.success) {
                setReport(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch balance sheet:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4 pb-4 border-b border-[var(--border-color)]">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <Scale className="w-6 h-6 text-purple-400" />
                        Balance Sheet
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Snapshot of Assets, Liabilities, and Equity
                        {report?.asOfDate && ` as of ${new Date(report.asOfDate).toLocaleDateString()}`}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-overlay)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-card)] transition-colors"
                    >
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-black rounded-lg hover:shadow-[0_0_15px_rgba(185,255,102,0.4)] transition-all font-medium"
                    >
                        <Printer className="w-4 h-4" /> Print
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
            ) : !report ? (
                <div className="text-center py-10 text-[var(--text-muted)]">Failed to load report.</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* ASSETS column */}
                    <div className="space-y-6">
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-emerald-500/10 border-b border-[var(--border-color)] p-4 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-emerald-400">Assets</h2>
                            </div>
                            <div className="p-4 space-y-3">
                                {report.assets.items.length === 0 ? (
                                    <div className="text-[var(--text-muted)] text-sm italic">No asset accounts found</div>
                                ) : (
                                    report.assets.items.map((item: any) => (
                                        <div key={item.id} className="flex justify-between items-center border-b border-[var(--border-color)] border-dashed pb-2 last:border-0 last:pb-0">
                                            <div>
                                                <div className="text-[var(--text-primary)] font-medium">{item.name}</div>
                                                <div className="text-xs text-[var(--text-muted)] font-mono">{item.code}</div>
                                            </div>
                                            <div className="text-right tabular-nums text-[var(--text-secondary)]">
                                                {formatCurrency(item.balance)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="bg-[var(--bg-overlay)] border-t border-[var(--border-color)] p-4 flex justify-between items-center">
                                <span className="font-bold text-[var(--text-primary)]">Total Assets</span>
                                <span className="font-bold text-emerald-400 text-lg tabular-nums">{formatCurrency(report.assets.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* LIABILITIES & EQUITY column */}
                    <div className="space-y-6">
                        {/* Liabilities */}
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-red-500/10 border-b border-[var(--border-color)] p-4 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-red-400">Liabilities</h2>
                            </div>
                            <div className="p-4 space-y-3">
                                {report.liabilities.items.length === 0 ? (
                                    <div className="text-[var(--text-muted)] text-sm italic">No liability accounts found</div>
                                ) : (
                                    report.liabilities.items.map((item: any) => (
                                        <div key={item.id} className="flex justify-between items-center border-b border-[var(--border-color)] border-dashed pb-2 last:border-0 last:pb-0">
                                            <div>
                                                <div className="text-[var(--text-primary)] font-medium">{item.name}</div>
                                                <div className="text-xs text-[var(--text-muted)] font-mono">{item.code}</div>
                                            </div>
                                            <div className="text-right tabular-nums text-[var(--text-secondary)]">
                                                {formatCurrency(item.balance)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="bg-[var(--bg-overlay)] border-t border-[var(--border-color)] p-4 flex justify-between items-center">
                                <span className="font-bold text-[var(--text-primary)]">Total Liabilities</span>
                                <span className="font-bold text-red-400 text-lg tabular-nums">{formatCurrency(report.liabilities.total)}</span>
                            </div>
                        </div>

                        {/* Equity */}
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-blue-500/10 border-b border-[var(--border-color)] p-4 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-blue-400">Equity</h2>
                            </div>
                            <div className="p-4 space-y-3">
                                {report.equity.items.map((item: any) => (
                                    <div key={item.id} className="flex justify-between items-center border-b border-[var(--border-color)] border-dashed pb-2 last:border-0 last:pb-0">
                                        <div>
                                            <div className="text-[var(--text-primary)] font-medium">{item.name}</div>
                                            <div className="text-xs text-[var(--text-muted)] font-mono">{item.code}</div>
                                        </div>
                                        <div className="text-right tabular-nums text-[var(--text-secondary)]">
                                            {formatCurrency(item.balance)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-[var(--bg-overlay)] border-t border-[var(--border-color)] p-4 flex justify-between items-center">
                                <span className="font-bold text-[var(--text-primary)]">Total Equity</span>
                                <span className="font-bold text-blue-400 text-lg tabular-nums">{formatCurrency(report.equity.total)}</span>
                            </div>
                        </div>

                        {/* Summary Liabilities + Equity */}
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 flex justify-between items-center">
                            <span className="font-bold text-[var(--text-primary)] text-lg">Total Liabilities & Equity</span>
                            <div className="text-right">
                                <span className={`font-black text-2xl tabular-nums ${report.isBalanced ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {formatCurrency(report.liabilities.total + report.equity.total)}
                                </span>
                                {!report.isBalanced && (
                                    <div className="text-xs text-red-400 mt-1 font-medium">Balance mismatch</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

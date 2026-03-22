import { useState, useEffect } from 'react';
import { CalendarRange, Loader2, AlertTriangle, ArrowRight, Save } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

export function YearEndClose() {
    const [preview, setPreview] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchPreview();
    }, []);

    const fetchPreview = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/finance-ext/year-end');
            if (res.data.success) {
                setPreview(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch year-end preview:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseYear = async () => {
        if (!confirm(`Are you sure you want to CLOSE the financial year ${year}? This action will zero out all Revenue and Expense accounts and transfer Net Income to Retained Earnings. THIS CANNOT BE UNDONE EASILY.`)) {
            return;
        }

        try {
            setIsClosing(true);
            const res = await api.post('/finance-ext/year-end', { year, notes });
            if (res.data.success) {
                alert(res.data.message);
                fetchPreview(); // Refresh to see zero balances
            }
        } catch (error: any) {
            console.error('Year end close failed:', error);
            alert(error?.response?.data?.message || 'Failed to close financial year');
        } finally {
            setIsClosing(false);
        }
    };



    const totalAccounts = preview ? preview.revenueAccounts.length + preview.expenseAccounts.length : 0;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center pb-4 border-b border-[var(--border-color)]">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <CalendarRange className="w-6 h-6 text-red-400" />
                        Financial Year End Closing
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Zero out operating accounts and map net income to Retained Earnings.
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
            ) : !preview ? (
                <div className="text-center py-10 text-[var(--text-muted)]">Failed to load preview. Ensure you have Admin rights.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Preview Stats */}
                    <div className="space-y-6">
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm">
                            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border-color)] pb-2 flex items-center gap-2">
                                Closing Preview
                            </h2>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--text-secondary)]">Revenue Accounts Impacted:</span>
                                    <span className="font-bold text-[var(--text-primary)]">{preview.revenueAccounts.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--text-secondary)]">Total Revenue Balance:</span>
                                    <span className="font-bold text-emerald-400">{formatCurrency(preview.totalRevenue)}</span>
                                </div>

                                <div className="border-t border-[var(--border-color)] border-dashed pt-4"></div>

                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--text-secondary)]">Expense Accounts Impacted:</span>
                                    <span className="font-bold text-[var(--text-primary)]">{preview.expenseAccounts.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--text-secondary)]">Total Expense Balance:</span>
                                    <span className="font-bold text-red-400">{formatCurrency(preview.totalExpense)}</span>
                                </div>

                                <div className="border-t border-[var(--border-color)] pt-4 mt-4">
                                    <div className="flex justify-between items-center bg-[var(--bg-overlay)] p-3 rounded-lg border border-[var(--border-color)]">
                                        <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-sm">Net Income to Transfer:</span>
                                        <span className={`font-black text-xl ${preview.netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {formatCurrency(preview.netIncome)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-400 text-sm">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <div>
                                <strong className="block mb-1">Warning: Irreversible Action</strong>
                                This process will create a Journal Entry setting the balances of all {totalAccounts} P&L accounts to 0.
                                It requires strict Super Admin privileges. Please ensure all transactions for the year are cleared before proceeding.
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Close Action Form */}
                    <div className="space-y-6">
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                            <h2 className="text-xl font-black text-red-400 mb-6 flex items-center gap-2">
                                Execute Year End
                            </h2>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Fiscal Year</label>
                                    <input
                                        type="text"
                                        value={year}
                                        onChange={(e) => setYear(e.target.value)}
                                        placeholder="e.g. 2024"
                                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-red-400 transition-colors font-mono text-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Closing Notes (Optional)</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={3}
                                        placeholder="Authorized closing by..."
                                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-red-400 transition-colors"
                                    />
                                </div>

                                <div className="bg-[var(--bg-overlay)] p-4 rounded-lg border border-[var(--border-color)] mb-4 flex items-center justify-between text-sm">
                                    <div className="text-[var(--text-secondary)] flex items-center gap-2">
                                        P&L Summary <ArrowRight className="w-4 h-4" /> Retained Earnings
                                    </div>
                                    <div className="font-bold text-[var(--primary)]">{formatCurrency(preview.netIncome)}</div>
                                </div>

                                <button
                                    onClick={handleCloseYear}
                                    disabled={isClosing || totalAccounts === 0}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-bold text-lg shadow-[0_4px_15px_rgba(239,68,68,0.3)] hover:shadow-[0_6px_25px_rgba(239,68,68,0.5)] disabled:opacity-50 disabled:hover:shadow-none"
                                >
                                    {isClosing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                    Close Financial Year
                                </button>
                                {totalAccounts === 0 && (
                                    <p className="text-center text-xs text-[var(--text-muted)] mt-2">No operating accounts found to close.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useEffect, useMemo, useState } from 'react';
import { InvoiceUpload } from './InvoiceUpload';
import { TransactionList } from './TransactionList';
import { BudgetOverview } from './BudgetOverview';
import { FinancialReports } from './FinancialReports';
import {
    LayoutDashboard,
    Receipt,
    Wallet,
    PieChart,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
} from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

type Snapshot = {
    expenseTotal: number;
    incomeTotal: number;
    budgetSpentTotal: number;
    budgetLimitTotal: number;
};

function getMonthRange(year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
    };
}

export function Financial() {
    const [activeTab, setActiveTab] = useState('DASHBOARD');
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [refreshKey, setRefreshKey] = useState(0);
    const [snapshot, setSnapshot] = useState<Snapshot>({
        expenseTotal: 0,
        incomeTotal: 0,
        budgetSpentTotal: 0,
        budgetLimitTotal: 0,
    });
    const [snapshotLoading, setSnapshotLoading] = useState(true);

    const { startDate, endDate } = useMemo(
        () => getMonthRange(selectedYear, selectedMonth),
        [selectedYear, selectedMonth]
    );

    const months = [
        { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
        { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
        { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
        { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
    ];

    useEffect(() => {
        const fetchSnapshot = async () => {
            setSnapshotLoading(true);
            try {
                const [txRes, budgetRes] = await Promise.all([
                    api.get('/finance/transactions', { params: { startDate, endDate, limit: 500, page: 1 } }),
                    api.get('/finance/budgets', { params: { month: selectedMonth, year: selectedYear } }),
                ]);

                const tx = Array.isArray(txRes.data?.data) ? txRes.data.data : [];
                const budgets = Array.isArray(budgetRes.data?.data) ? budgetRes.data.data : [];

                const expenseTotal = tx
                    .filter((item: any) => item.type === 'EXPENSE')
                    .reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);

                const incomeTotal = tx
                    .filter((item: any) => item.type === 'INCOME')
                    .reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);

                const budgetSpentTotal = budgets.reduce((sum: number, item: any) => sum + Number(item.spent || 0), 0);
                const budgetLimitTotal = budgets.reduce((sum: number, item: any) => sum + Number(item.limit || 0), 0);

                setSnapshot({ expenseTotal, incomeTotal, budgetSpentTotal, budgetLimitTotal });
            } catch {
                setSnapshot({ expenseTotal: 0, incomeTotal: 0, budgetSpentTotal: 0, budgetLimitTotal: 0 });
            } finally {
                setSnapshotLoading(false);
            }
        };

        fetchSnapshot();
    }, [startDate, endDate, selectedMonth, selectedYear, refreshKey]);

    const discrepancy = Math.abs(snapshot.expenseTotal - snapshot.budgetSpentTotal);
    const isConsistent = discrepancy < 0.5;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial Management</h1>
                    <p className="text-sm text-gray-500">Monitor expenses, budgets, invoices, and reconciliation consistency</p>
                </div>
                <div className="flex flex-col md:flex-row gap-2 w-full sm:w-auto">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] text-sm"
                    >
                        {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <input
                        type="number"
                        min={2020}
                        max={2100}
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-24 px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] text-sm"
                    />
                    <button
                        onClick={() => setRefreshKey((k) => k + 1)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] text-sm"
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <p className="text-xs text-[var(--text-secondary)]">Data Consistency Check</p>
                    <p className="text-sm mt-1 text-[var(--text-primary)]">
                        Period totals use the same month window for all financial modules.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="px-2 py-1 rounded bg-[var(--bg-overlay)]">Expense: {formatCurrency(snapshot.expenseTotal || 0)}</span>
                    <span className="px-2 py-1 rounded bg-[var(--bg-overlay)]">Budget Spent: {formatCurrency(snapshot.budgetSpentTotal || 0)}</span>
                    {snapshotLoading ? (
                        <span className="text-[var(--text-secondary)]">Checking...</span>
                    ) : isConsistent ? (
                        <span className="inline-flex items-center gap-1 text-emerald-500"><CheckCircle2 size={14} /> Consistent</span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-amber-500"><AlertTriangle size={14} /> Variance {formatCurrency(discrepancy)}</span>
                    )}
                </div>
            </div>

            <div className="flex bg-[var(--bg-card)] border border-[var(--border-color)] p-1 rounded-lg w-full overflow-auto">
                {[
                    { id: 'DASHBOARD', label: 'Overview', icon: LayoutDashboard },
                    { id: 'REPORTS', label: 'Reports', icon: PieChart },
                    { id: 'TRANSACTIONS', label: 'Transactions', icon: Wallet },
                    { id: 'INVOICES', label: 'Invoices (AI)', icon: Receipt },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors whitespace-nowrap
                            ${activeTab === tab.id
                                ? 'bg-[var(--primary)] text-black shadow-[0_0_10px_var(--primary-glow)] font-semibold'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'DASHBOARD' && (
                <div className="space-y-6">
                    <BudgetOverview
                        month={selectedMonth}
                        year={selectedYear}
                        refreshKey={refreshKey}
                        onBudgetChanged={() => setRefreshKey((k) => k + 1)}
                    />
                    <TransactionList startDate={startDate} endDate={endDate} refreshKey={refreshKey} />
                </div>
            )}

            {activeTab === 'REPORTS' && (
                <FinancialReports
                    startDate={startDate}
                    endDate={endDate}
                    month={selectedMonth}
                    year={selectedYear}
                    refreshKey={refreshKey}
                />
            )}

            {activeTab === 'TRANSACTIONS' && (
                <TransactionList startDate={startDate} endDate={endDate} refreshKey={refreshKey} />
            )}

            {activeTab === 'INVOICES' && (
                <div className="space-y-6">
                    <InvoiceUpload onUploadSuccess={() => {
                        setRefreshKey((k) => k + 1);
                        setActiveTab('TRANSACTIONS');
                    }} />
                </div>
            )}
        </div>
    );
}

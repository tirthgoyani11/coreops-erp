import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    ArrowRight,
    Landmark,
    ShieldAlert,
    Target,
} from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import type { UserRole } from '../../types';

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
    const navigate = useNavigate();
    const userRole = useAuthStore((state) => state.user?.role);
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
                const [txRes, budgetRes] = await Promise.allSettled([
                    api.get('/finance/transactions', { params: { startDate, endDate, limit: 500, page: 1 } }),
                    api.get('/finance/budgets', { params: { month: selectedMonth, year: selectedYear } }),
                ]);

                const tx = txRes.status === 'fulfilled' && Array.isArray(txRes.value.data?.data) ? txRes.value.data.data : [];
                const budgets = budgetRes.status === 'fulfilled' && Array.isArray(budgetRes.value.data?.data) ? budgetRes.value.data.data : [];

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
    const netCash = snapshot.incomeTotal - snapshot.expenseTotal;
    const budgetUtilization = snapshot.budgetLimitTotal > 0 ? (snapshot.budgetSpentTotal / snapshot.budgetLimitTotal) * 100 : 0;
    const burnMultiple = snapshot.incomeTotal > 0 ? snapshot.expenseTotal / snapshot.incomeTotal : 0;
    const cashRunwayMonths = snapshot.expenseTotal > 0 && netCash > 0 ? netCash / snapshot.expenseTotal : 0;

    const recommendations = useMemo(() => {
        const items: string[] = [];
        if (budgetUtilization > 90) {
            items.push('Budget utilization exceeded 90%. Lock non-essential spends and move exceptions to approval gate.');
        }
        if (burnMultiple > 1) {
            items.push('Burn multiple is above 1. Reduce discretionary expenses or accelerate receivables.');
        }
        if (!isConsistent) {
            items.push(`Detected variance of ${formatCurrency(discrepancy)} between expense ledger and budget usage.`);
        }
        if (items.length === 0) {
            items.push('Financial controls are stable. Focus on efficiency gains and cash conversion optimization.');
        }
        return items;
    }, [budgetUtilization, burnMultiple, discrepancy, isConsistent]);

    const quickLinks: Array<{ label: string; path: string; icon: any; note: string; roles: UserRole[] }> = [
        {
            label: 'Working Capital',
            path: '/finance/working-capital',
            icon: Landmark,
            note: 'AP + AR unified aging',
            roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER'],
        },
        {
            label: 'Exception Center',
            path: '/finance/exception-center',
            icon: ShieldAlert,
            note: 'Escalations and SLA breaches',
            roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'],
        },
        {
            label: 'Profit & Loss',
            path: '/profit-loss',
            icon: Target,
            note: 'Performance and margin trend',
            roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER'],
        },
        {
            label: 'Cash Flow',
            path: '/cash-flow',
            icon: Wallet,
            note: 'Operating cash movement',
            roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER'],
        },
        {
            label: 'Expense Claims',
            path: '/expense-claims',
            icon: Receipt,
            note: 'Claims and reimbursements',
            roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'],
        },
    ];
    const visibleQuickLinks = quickLinks.filter((item) => !userRole || item.roles.includes(userRole));

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

            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Net Cash Position</p>
                    <p className={`text-2xl font-bold mt-1 ${netCash >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(netCash)}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Income minus expense for selected month</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Budget Utilization</p>
                    <p className={`text-2xl font-bold mt-1 ${budgetUtilization > 90 ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>
                        {budgetUtilization.toFixed(1)}%
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Total spent vs allocated limit</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Burn Multiple</p>
                    <p className={`text-2xl font-bold mt-1 ${burnMultiple > 1 ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {Number.isFinite(burnMultiple) ? burnMultiple.toFixed(2) : '0.00'}x
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Expense divided by income</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Estimated Runway</p>
                    <p className="text-2xl font-bold mt-1 text-[var(--text-primary)]">
                        {cashRunwayMonths > 0 ? `${cashRunwayMonths.toFixed(1)} mo` : 'At Risk'}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Based on current monthly burn</p>
                </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <div className="xl:col-span-7 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">CFO Recommendations</h3>
                    <div className="space-y-2">
                        {recommendations.map((rec, index) => (
                            <div key={index} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                                {rec}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="xl:col-span-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Quick Navigation</h3>
                    <div className="space-y-2">
                        {visibleQuickLinks.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className="w-full text-left rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] px-3 py-2 hover:border-[var(--primary)]/40 hover:bg-[var(--bg-card-hover)] transition-colors"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
                                            <item.icon className="w-4 h-4 text-[var(--primary)]" />
                                            {item.label}
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)] mt-1">{item.note}</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-[var(--text-secondary)]" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

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

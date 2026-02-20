import { useState } from 'react';
import { InvoiceUpload } from './InvoiceUpload';
import { TransactionList } from './TransactionList';
import { BudgetOverview } from './BudgetOverview';
import { FinancialReports } from './FinancialReports';
import {
    LayoutDashboard,
    Receipt,
    Wallet,
    PieChart
} from 'lucide-react';

export function Financial() {
    const [activeTab, setActiveTab] = useState('DASHBOARD');

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial Management</h1>
                    <p className="text-sm text-gray-500">Monitor expenses, budgets, and invoices</p>
                </div>
                <div className="flex bg-[var(--bg-card)] border border-[var(--border-color)] p-1 rounded-lg">
                    {[
                        { id: 'DASHBOARD', label: 'Overview', icon: LayoutDashboard },
                        { id: 'REPORTS', label: 'Reports', icon: PieChart },
                        { id: 'TRANSACTIONS', label: 'Transactions', icon: Wallet },
                        { id: 'INVOICES', label: 'Invoices (AI)', icon: Receipt },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors
                                ${activeTab === tab.id
                                    ? 'bg-[var(--primary)] text-black shadow-[0_0_10px_var(--primary-glow)] font-semibold'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'DASHBOARD' && (
                <div className="space-y-6">
                    <BudgetOverview />
                    <TransactionList />
                </div>
            )}

            {activeTab === 'REPORTS' && (
                <FinancialReports />
            )}

            {activeTab === 'TRANSACTIONS' && (
                <TransactionList />
            )}

            {activeTab === 'INVOICES' && (
                <div className="space-y-6">
                    <InvoiceUpload onUploadSuccess={() => setActiveTab('TRANSACTIONS')} />
                </div>
            )}
        </div>
    );
}

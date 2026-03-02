import { useState, useEffect } from 'react';
import { apiGet, apiPost, getErrorMessage } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    BookOpen, TrendingUp, TrendingDown, Scale, Plus,
    ArrowUpRight, ArrowDownRight, Loader2,
    AlertCircle, CheckCircle2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';

interface GLAccount {
    id: string; code: string; name: string; type: string; balance: number;
    normalSide: string; isActive: boolean; parentId?: string;
    children?: GLAccount[];
}
interface JournalEntry {
    id: string; entryNumber: string; date: string; description: string;
    reference: string; status: string; totalAmount: number;
    createdBy?: { name: string };
    lines: {
        id: string; debit: number; credit: number; description: string;
        account: { code: string; name: string; type: string }
    }[];
}
interface TrialBalance {
    rows: { code: string; name: string; type: string; debit: number; credit: number; balance: number }[];
    totals: { debit: number; credit: number };
    isBalanced: boolean;
}

const TYPE_COLORS: Record<string, string> = {
    ASSET: 'text-blue-400', LIABILITY: 'text-orange-400', EQUITY: 'text-purple-400',
    REVENUE: 'text-emerald-400', EXPENSE: 'text-red-400',
};

const TYPE_BADGES: Record<string, string> = {
    ASSET: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    LIABILITY: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    EQUITY: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    REVENUE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    EXPENSE: 'bg-red-500/15 text-red-400 border-red-500/30',
};

function formatCurrency(n: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
}

export function GLDashboard() {
    const [accounts, setAccounts] = useState<GLAccount[]>([]);
    const [journal, setJournal] = useState<JournalEntry[]>([]);
    const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'journal' | 'trial-balance'>('overview');
    const [showNewJE, setShowNewJE] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [accRes, jeRes, tbRes] = await Promise.all([
                apiGet<any>('/gl/accounts'),
                apiGet<any>('/gl/journal'),
                apiGet<any>('/gl/trial-balance'),
            ]);
            setAccounts(accRes.data || []);
            setJournal(jeRes.data || []);
            setTrialBalance(tbRes.data || null);
        } catch (e) {
            setError(getErrorMessage(e));
        }
        setLoading(false);
    };

    // Summary cards data
    const totalAssets = accounts.filter(a => a.type === 'ASSET').reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = accounts.filter(a => a.type === 'LIABILITY').reduce((s, a) => s + Math.abs(a.balance), 0);
    const totalRevenue = accounts.filter(a => a.type === 'REVENUE').reduce((s, a) => s + Math.abs(a.balance), 0);
    const totalExpenses = accounts.filter(a => a.type === 'EXPENSE').reduce((s, a) => s + a.balance, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">General Ledger</h1>
                    <p className="text-sm text-[var(--text-secondary)]">Chart of Accounts · Journal Entries · Trial Balance</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchAll}>
                        Refresh
                    </Button>
                    <Button size="sm" onClick={() => setShowNewJE(true)}>
                        <Plus className="w-4 h-4 mr-1" /> New Journal Entry
                    </Button>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="flex bg-[var(--bg-card)] border border-[var(--border-color)] p-1 rounded-lg overflow-x-auto">
                {[
                    { id: 'overview' as const, label: 'Overview', icon: BookOpen },
                    { id: 'accounts' as const, label: 'Chart of Accounts', icon: Scale },
                    { id: 'journal' as const, label: 'Journal Entries', icon: TrendingUp },
                    { id: 'trial-balance' as const, label: 'Trial Balance', icon: CheckCircle2 },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-[var(--primary)] text-black shadow-[0_0_10px_var(--primary-glow)] font-semibold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                ))}
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryCard title="Total Assets" amount={totalAssets} icon={ArrowUpRight}
                            color="text-blue-400" bgColor="bg-blue-500/10" borderColor="border-blue-500/30" />
                        <SummaryCard title="Total Liabilities" amount={totalLiabilities} icon={ArrowDownRight}
                            color="text-orange-400" bgColor="bg-orange-500/10" borderColor="border-orange-500/30" />
                        <SummaryCard title="Total Revenue" amount={totalRevenue} icon={TrendingUp}
                            color="text-emerald-400" bgColor="bg-emerald-500/10" borderColor="border-emerald-500/30" />
                        <SummaryCard title="Total Expenses" amount={totalExpenses} icon={TrendingDown}
                            color="text-red-400" bgColor="bg-red-500/10" borderColor="border-red-500/30" />
                    </div>

                    {/* Balance Indicator */}
                    <Card variant="glass">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {trialBalance?.isBalanced ? (
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                                            <AlertCircle className="w-5 h-5 text-red-400" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-semibold text-[var(--text-primary)]">
                                            {trialBalance?.isBalanced ? 'Books are Balanced' : 'Books are Unbalanced'}
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)]">
                                            Debit: {formatCurrency(trialBalance?.totals.debit || 0)} · Credit: {formatCurrency(trialBalance?.totals.credit || 0)}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${trialBalance?.isBalanced
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-red-500/15 text-red-400'
                                    }`}>
                                    {accounts.length} Accounts · {journal.length} Entries
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Journal Entries */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Recent Journal Entries</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {journal.slice(0, 5).map(je => (
                                    <div key={je.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--primary)]/40 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                                                <BookOpen className="w-4 h-4 text-[var(--primary)]" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-primary)]">{je.entryNumber}</p>
                                                <p className="text-xs text-[var(--text-secondary)]">{je.description}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(je.totalAmount)}</p>
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                {new Date(je.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {journal.length === 0 && (
                                    <p className="text-center text-[var(--text-secondary)] text-sm py-4">No journal entries yet</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* CHART OF ACCOUNTS TAB */}
            {activeTab === 'accounts' && (
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border-color)]">
                                        <th className="text-left p-4 text-[var(--text-secondary)] font-medium">Code</th>
                                        <th className="text-left p-4 text-[var(--text-secondary)] font-medium">Account Name</th>
                                        <th className="text-left p-4 text-[var(--text-secondary)] font-medium">Type</th>
                                        <th className="text-left p-4 text-[var(--text-secondary)] font-medium">Normal Side</th>
                                        <th className="text-right p-4 text-[var(--text-secondary)] font-medium">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map(acc => (
                                        <tr key={acc.id} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-card-hover)] transition-colors">
                                            <td className="p-4 font-mono text-[var(--primary)]">{acc.code}</td>
                                            <td className="p-4 text-[var(--text-primary)] font-medium">{acc.name}</td>
                                            <td className="p-4">
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${TYPE_BADGES[acc.type] || ''}`}>
                                                    {acc.type}
                                                </span>
                                            </td>
                                            <td className="p-4 text-[var(--text-secondary)] text-xs">{acc.normalSide}</td>
                                            <td className={`p-4 text-right font-semibold ${acc.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {formatCurrency(Math.abs(acc.balance))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* JOURNAL ENTRIES TAB */}
            {activeTab === 'journal' && (
                <div className="space-y-4">
                    {journal.map(je => (
                        <Card key={je.id} variant="outlined">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-[var(--primary)] font-semibold">{je.entryNumber}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${je.status === 'POSTED' ? 'bg-emerald-500/15 text-emerald-400' :
                                                je.status === 'DRAFT' ? 'bg-yellow-500/15 text-yellow-400' :
                                                    'bg-red-500/15 text-red-400'
                                                }`}>{je.status}</span>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] mt-1">{je.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-[var(--text-primary)]">{formatCurrency(je.totalAmount)}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">
                                            {new Date(je.date).toLocaleDateString('en-IN')} · {je.createdBy?.name}
                                        </p>
                                    </div>
                                </div>
                                <div className="border-t border-[var(--border-color)]/50 pt-3">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-[var(--text-secondary)]">
                                                <th className="text-left pb-2">Account</th>
                                                <th className="text-left pb-2">Description</th>
                                                <th className="text-right pb-2">Debit</th>
                                                <th className="text-right pb-2">Credit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {je.lines.map(line => (
                                                <tr key={line.id} className="border-t border-[var(--border-color)]/30">
                                                    <td className="py-1.5">
                                                        <span className="font-mono text-[var(--primary)]">{line.account.code}</span>
                                                        <span className="ml-2 text-[var(--text-primary)]">{line.account.name}</span>
                                                    </td>
                                                    <td className="py-1.5 text-[var(--text-secondary)]">{line.description}</td>
                                                    <td className="py-1.5 text-right font-semibold text-emerald-400">
                                                        {line.debit > 0 ? formatCurrency(line.debit) : ''}
                                                    </td>
                                                    <td className="py-1.5 text-right font-semibold text-red-400">
                                                        {line.credit > 0 ? formatCurrency(line.credit) : ''}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* TRIAL BALANCE TAB */}
            {activeTab === 'trial-balance' && trialBalance && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Trial Balance</CardTitle>
                            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${trialBalance.isBalanced ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                                }`}>
                                {trialBalance.isBalanced ? '✓ Balanced' : '✗ Unbalanced'}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border-color)] bg-[var(--bg-card)]/50">
                                        <th className="text-left p-4 text-[var(--text-secondary)] font-medium">Code</th>
                                        <th className="text-left p-4 text-[var(--text-secondary)] font-medium">Account</th>
                                        <th className="text-left p-4 text-[var(--text-secondary)] font-medium">Type</th>
                                        <th className="text-right p-4 text-[var(--text-secondary)] font-medium">Debit</th>
                                        <th className="text-right p-4 text-[var(--text-secondary)] font-medium">Credit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trialBalance.rows.filter(r => r.debit > 0 || r.credit > 0).map((row, i) => (
                                        <tr key={i} className="border-b border-[var(--border-color)]/30 hover:bg-[var(--bg-card-hover)]">
                                            <td className="p-4 font-mono text-[var(--primary)]">{row.code}</td>
                                            <td className="p-4 text-[var(--text-primary)]">{row.name}</td>
                                            <td className="p-4">
                                                <span className={`text-xs ${TYPE_COLORS[row.type] || ''}`}>{row.type}</span>
                                            </td>
                                            <td className="p-4 text-right font-semibold text-emerald-400">
                                                {row.debit > 0 ? formatCurrency(row.debit) : '—'}
                                            </td>
                                            <td className="p-4 text-right font-semibold text-red-400">
                                                {row.credit > 0 ? formatCurrency(row.credit) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-[var(--primary)]/30 bg-[var(--bg-card)]">
                                        <td colSpan={3} className="p-4 font-bold text-[var(--text-primary)]">TOTALS</td>
                                        <td className="p-4 text-right font-bold text-emerald-400">{formatCurrency(trialBalance.totals.debit)}</td>
                                        <td className="p-4 text-right font-bold text-red-400">{formatCurrency(trialBalance.totals.credit)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* New Journal Entry Dialog */}
            <NewJournalEntryDialog open={showNewJE} onClose={() => setShowNewJE(false)} accounts={accounts} onSuccess={() => { setShowNewJE(false); fetchAll(); }} />
        </div>
    );
}

// ─── Summary Card ──────────────────────────────────────────────
function SummaryCard({ title, amount, icon: Icon, color, bgColor, borderColor }: {
    title: string; amount: number; icon: any; color: string; bgColor: string; borderColor: string;
}) {
    return (
        <Card variant="glass">
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">{title}</p>
                        <p className={`text-xl font-bold mt-1 ${color}`}>{formatCurrency(amount)}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${bgColor} border ${borderColor} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── New Journal Entry Dialog ──────────────────────────────────
function NewJournalEntryDialog({ open, onClose, accounts, onSuccess }: {
    open: boolean; onClose: () => void; accounts: GLAccount[]; onSuccess: () => void;
}) {
    const [description, setDescription] = useState('');
    const [reference, setReference] = useState('');
    const [lines, setLines] = useState([
        { accountId: '', debit: '', credit: '', description: '' },
        { accountId: '', debit: '', credit: '', description: '' },
    ]);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    const addLine = () => setLines([...lines, { accountId: '', debit: '', credit: '', description: '' }]);
    const removeLine = (i: number) => { if (lines.length > 2) setLines(lines.filter((_, idx) => idx !== i)); };

    const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

    const handleSubmit = async () => {
        if (!description) return setFormError('Description required');
        if (!isBalanced) return setFormError('Debits must equal credits');
        if (lines.some(l => !l.accountId)) return setFormError('All lines need an account');

        setSubmitting(true); setFormError('');
        try {
            await apiPost('/gl/journal', {
                description, reference, referenceType: 'MANUAL',
                lines: lines.map(l => ({
                    accountId: l.accountId,
                    debit: parseFloat(l.debit) || 0,
                    credit: parseFloat(l.credit) || 0,
                    description: l.description,
                })),
            });
            onSuccess();
            setDescription(''); setReference('');
            setLines([
                { accountId: '', debit: '', credit: '', description: '' },
                { accountId: '', debit: '', credit: '', description: '' },
            ]);
        } catch (e) {
            setFormError(getErrorMessage(e));
        }
        setSubmitting(false);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>New Journal Entry</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-[var(--text-secondary)] mb-1 block">Description *</label>
                            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Office rent payment" />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--text-secondary)] mb-1 block">Reference</label>
                            <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. INV-001" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-[var(--text-primary)]">Entry Lines</label>
                            <Button variant="ghost" size="sm" onClick={addLine}><Plus className="w-3 h-3 mr-1" /> Add Line</Button>
                        </div>
                        {lines.map((line, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                <select value={line.accountId}
                                    onChange={e => { const n = [...lines]; n[i].accountId = e.target.value; setLines(n); }}
                                    className="col-span-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md px-2 py-2 text-sm text-[var(--text-primary)]"
                                >
                                    <option value="">Select Account</option>
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                    ))}
                                </select>
                                <Input className="col-span-3" type="number" placeholder="Debit" value={line.debit}
                                    onChange={e => { const n = [...lines]; n[i].debit = e.target.value; n[i].credit = ''; setLines(n); }} />
                                <Input className="col-span-3" type="number" placeholder="Credit" value={line.credit}
                                    onChange={e => { const n = [...lines]; n[i].credit = e.target.value; n[i].debit = ''; setLines(n); }} />
                                <button onClick={() => removeLine(i)} className="col-span-2 text-xs text-red-400 hover:text-red-300"
                                    disabled={lines.length <= 2}>✕</button>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end gap-6 text-sm border-t border-[var(--border-color)] pt-3">
                        <span>Debit: <b className="text-emerald-400">{formatCurrency(totalDebit)}</b></span>
                        <span>Credit: <b className="text-red-400">{formatCurrency(totalCredit)}</b></span>
                        <span className={isBalanced ? 'text-emerald-400' : 'text-red-400'}>
                            {isBalanced ? '✓ Balanced' : '✗ Unbalanced'}
                        </span>
                    </div>

                    {formError && <p className="text-red-400 text-xs">{formError}</p>}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting || !isBalanced}>
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Post Entry
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

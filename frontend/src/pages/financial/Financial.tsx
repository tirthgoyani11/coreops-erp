import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    Calculator,
    CheckCircle2,
    FileSpreadsheet,
    GitCompare,
    Landmark,
    RefreshCw,
    Receipt,
    ShieldCheck,
} from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

type WorkspaceView = 'overview' | 'ap' | 'matching' | 'tax' | 'capital' | 'enterprise';

type APInvoice = {
    id: string;
    invoiceNumber: string;
    vendorId: string;
    status: string;
    matchStatus: string;
    totalAmount: number;
    amountPaid?: number;
    dueDate?: string;
    invoiceDate?: string;
    poId?: string | null;
    grnId?: string | null;
    vendor?: { name?: string; vendorCode?: string };
};

type MatchingReportRow = {
    invoiceNumber: string;
    vendor: string;
    totalAmount: number;
    matchStatus: string;
    variances: number;
    criticalVariances: number;
};

type TaxSummaryRow = {
    code: string;
    rate: number;
    inputBase: number;
    inputTax: number;
    outputBase: number;
    outputTax: number;
    netTax: number;
};

type GSTRow = {
    credit: number;
    liability: number;
    net: number;
};

type APAgingBucket = {
    amount: number;
    count: number;
};

type APAging = {
    totalOutstanding: number;
    buckets: {
        current: APAgingBucket;
        thirtyDays: APAgingBucket;
        sixtyDays: APAgingBucket;
        ninetyDays: APAgingBucket;
    };
};

type IntercompanyEntry = {
    id: string;
    fromOfficeId?: string | null;
    toOfficeId?: string | null;
    amount: number;
    status: string;
};

type RevenueSchedule = {
    id: string;
    scheduleNumber?: string;
    contractRef?: string | null;
    totalAmount: number;
    recognizedAmount?: number;
    status: string;
    milestones?: Array<{
        index: number;
        milestoneCode?: string;
        amount: number;
        status: string;
    }>;
};

type CloseCockpit = {
    runId?: string;
    runNumber?: string;
    status: string;
    isReadyToClose: boolean;
    tasks: Array<{
        key: string;
        label?: string;
        status: string;
    }>;
};

function getViewFromPath(pathname: string): WorkspaceView {
    if (pathname.endsWith('/ap-invoices')) return 'ap';
    if (pathname.endsWith('/matching')) return 'matching';
    if (pathname.endsWith('/tax')) return 'tax';
    if (pathname.endsWith('/working-capital')) return 'capital';
    if (pathname.endsWith('/enterprise-close')) return 'enterprise';
    return 'overview';
}

function dateInputValue(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function makeIdempotencyKey(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function Financial() {
    const navigate = useNavigate();
    const location = useLocation();

    const activeView = getViewFromPath(location.pathname);

    const [loading, setLoading] = useState(true);
    const [apInvoices, setApInvoices] = useState<APInvoice[]>([]);
    const [apAging, setApAging] = useState<APAging | null>(null);
    const [matchingReport, setMatchingReport] = useState<MatchingReportRow[]>([]);
    const [taxSummary, setTaxSummary] = useState<TaxSummaryRow[]>([]);
    const [gstSummary, setGstSummary] = useState<Record<string, GSTRow>>({});
    const [netPayable, setNetPayable] = useState(0);
    const [pageError, setPageError] = useState<string | null>(null);
    const [phase1Busy, setPhase1Busy] = useState(false);

    const [intercompanyEntries, setIntercompanyEntries] = useState<IntercompanyEntry[]>([]);
    const [revenueSchedules, setRevenueSchedules] = useState<RevenueSchedule[]>([]);
    const [closeCockpit, setCloseCockpit] = useState<CloseCockpit | null>(null);

    const [icForm, setIcForm] = useState({
        fromOfficeId: '',
        toOfficeId: '',
        amount: 0,
        description: 'Intercompany transfer',
        profitCenter: '',
        costCenter: '',
    });

    const [revRecForm, setRevRecForm] = useState({
        officeId: '',
        contractRef: '',
        customerRef: '',
        totalAmount: 0,
        periods: 12,
        frequency: 'MONTHLY',
    });

    const [taxFrom, setTaxFrom] = useState<string>(dateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
    const [taxTo, setTaxTo] = useState<string>(dateInputValue(new Date()));
    const [taxCalcAmount, setTaxCalcAmount] = useState<number>(1000);
    const [taxCalcCode, setTaxCalcCode] = useState<string>('GST_18');
    const [taxCalcResult, setTaxCalcResult] = useState<number | null>(null);

    const fetchWorkspace = useCallback(async () => {
        setLoading(true);
        setPageError(null);

        try {
            const [
                apRes,
                matchingRes,
                apAgingRes,
                taxRes,
                gstRes,
                intercompanyRes,
                revRecRes,
                closeCockpitRes,
            ] = await Promise.allSettled([
                api.get('/ap-invoices', { params: { limit: 100, page: 1 } }),
                api.get('/ap-invoices/matching/report'),
                api.get('/ap-invoices/aging'),
                api.get('/finance-ext/tax-reconciliation', { params: { startDate: new Date(taxFrom).toISOString(), endDate: new Date(taxTo).toISOString() } }),
                api.get('/finance-ext/gst-reconciliation', { params: { startDate: new Date(taxFrom).toISOString(), endDate: new Date(taxTo).toISOString() } }),
                api.get('/finance-ext/intercompany/entries'),
                api.get('/finance-ext/revenue-recognition/schedules'),
                api.get('/finance-ext/close-cockpit'),
            ]);

            if (apRes.status === 'fulfilled' && apRes.value.data?.success) {
                setApInvoices(apRes.value.data.data || []);
            } else {
                setApInvoices([]);
            }

            if (matchingRes.status === 'fulfilled' && matchingRes.value.data?.success) {
                setMatchingReport(matchingRes.value.data.data || []);
            } else {
                setMatchingReport([]);
            }

            if (apAgingRes.status === 'fulfilled' && apAgingRes.value.data?.success) {
                setApAging(apAgingRes.value.data || null);
            } else {
                setApAging(null);
            }

            if (taxRes.status === 'fulfilled' && taxRes.value.data?.success) {
                setTaxSummary(taxRes.value.data.data?.summary || []);
            } else {
                setTaxSummary([]);
            }

            if (gstRes.status === 'fulfilled' && gstRes.value.data?.success) {
                const payload = gstRes.value.data.data;
                setGstSummary(payload?.gstSummary || {});
                setNetPayable(Number(payload?.netPayable || 0));
            } else {
                setGstSummary({});
                setNetPayable(0);
            }

            if (intercompanyRes.status === 'fulfilled' && intercompanyRes.value.data?.success) {
                setIntercompanyEntries(intercompanyRes.value.data.data || []);
            } else {
                setIntercompanyEntries([]);
            }

            if (revRecRes.status === 'fulfilled' && revRecRes.value.data?.success) {
                setRevenueSchedules(revRecRes.value.data.data || []);
            } else {
                setRevenueSchedules([]);
            }

            if (closeCockpitRes.status === 'fulfilled' && closeCockpitRes.value.data?.success) {
                setCloseCockpit(closeCockpitRes.value.data.data || null);
            } else {
                setCloseCockpit(null);
            }

            const allFailed =
                apRes.status === 'rejected' &&
                matchingRes.status === 'rejected' &&
                apAgingRes.status === 'rejected' &&
                taxRes.status === 'rejected' &&
                gstRes.status === 'rejected' &&
                intercompanyRes.status === 'rejected' &&
                revRecRes.status === 'rejected' &&
                closeCockpitRes.status === 'rejected';

            if (allFailed) {
                setPageError('Unable to load financial workspace data right now.');
            }
        } catch (error: any) {
            setPageError(error?.response?.data?.message || 'Failed to load workspace.');
        } finally {
            setLoading(false);
        }
    }, [taxFrom, taxTo]);

    useEffect(() => {
        void fetchWorkspace();
    }, [fetchWorkspace]);

    const invoiceStats = useMemo(() => {
        const total = apInvoices.length;
        const approved = apInvoices.filter((item) => item.status === 'APPROVED').length;
        const posted = apInvoices.filter((item) => item.status === 'MATCHED' || item.status === 'PAID').length;
        const pendingMatch = apInvoices.filter((item) => item.matchStatus === 'UNMATCHED' || item.matchStatus === 'PARTIALLY_MATCHED').length;
        const totalAmount = apInvoices.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
        return { total, approved, posted, pendingMatch, totalAmount };
    }, [apInvoices]);

    const matchStats = useMemo(() => {
        const totalVariance = matchingReport.reduce((sum, row) => sum + Number(row.variances || 0), 0);
        const critical = matchingReport.reduce((sum, row) => sum + Number(row.criticalVariances || 0), 0);
        return { totalVariance, critical };
    }, [matchingReport]);

    const runTaxCalculator = async () => {
        try {
            const res = await api.post('/finance-ext/tax/calculate-line', {
                lineAmount: taxCalcAmount,
                taxCode: taxCalcCode,
            });
            if (res.data?.success) {
                setTaxCalcResult(Number(res.data.data?.taxAmount || 0));
            }
        } catch {
            setTaxCalcResult(null);
        }
    };

    const approveInvoice = async (id: string) => {
        await api.put(`/ap-invoices/${id}/approve`, { notes: 'Approved from finance workspace' });
        await fetchWorkspace();
    };

    const postInvoice = async (id: string) => {
        await api.post(`/ap-invoices/${id}/post-gl`);
        await fetchWorkspace();
    };

    const matchInvoice = async (invoice: APInvoice) => {
        await api.post(`/ap-invoices/${invoice.id}/match`, {
            poId: invoice.poId || undefined,
            grnId: invoice.grnId || undefined,
            tolerance: 0.005,
        });
        await fetchWorkspace();
    };

    const createIntercompanyEntry = async () => {
        if (!icForm.fromOfficeId || !icForm.toOfficeId || Number(icForm.amount) <= 0) {
            setPageError('Intercompany requires fromOfficeId, toOfficeId, and amount.');
            return;
        }
        setPhase1Busy(true);
        try {
            await api.post('/finance-ext/intercompany/entries', icForm, {
                headers: { 'x-idempotency-key': makeIdempotencyKey('ic-create') },
            });
            await fetchWorkspace();
        } catch (error: any) {
            setPageError(error?.response?.data?.message || 'Failed to create intercompany entry.');
        } finally {
            setPhase1Busy(false);
        }
    };

    const runConsolidation = async () => {
        setPhase1Busy(true);
        try {
            const now = new Date();
            await api.post('/finance-ext/consolidation/run', {
                month: now.getMonth() + 1,
                year: now.getFullYear(),
            }, {
                headers: { 'x-idempotency-key': makeIdempotencyKey('consolidation-run') },
            });
            await fetchWorkspace();
        } catch (error: any) {
            setPageError(error?.response?.data?.message || 'Failed to run consolidation.');
        } finally {
            setPhase1Busy(false);
        }
    };

    const createRevenueSchedule = async () => {
        if (!revRecForm.officeId || Number(revRecForm.totalAmount) <= 0) {
            setPageError('Revenue schedule requires officeId and positive totalAmount.');
            return;
        }
        setPhase1Busy(true);
        try {
            await api.post('/finance-ext/revenue-recognition/schedules', revRecForm, {
                headers: { 'x-idempotency-key': makeIdempotencyKey('revrec-create') },
            });
            await fetchWorkspace();
        } catch (error: any) {
            setPageError(error?.response?.data?.message || 'Failed to create revenue schedule.');
        } finally {
            setPhase1Busy(false);
        }
    };

    const recognizeRevenueMilestone = async (scheduleId: string) => {
        setPhase1Busy(true);
        try {
            await api.post(`/finance-ext/revenue-recognition/schedules/${scheduleId}/recognize`, {}, {
                headers: { 'x-idempotency-key': makeIdempotencyKey(`revrec-recognize-${scheduleId}`) },
            });
            await fetchWorkspace();
        } catch (error: any) {
            setPageError(error?.response?.data?.message || 'Failed to recognize milestone.');
        } finally {
            setPhase1Busy(false);
        }
    };

    const approveCloseTask = async (taskKey: string) => {
        setPhase1Busy(true);
        try {
            const now = new Date();
            await api.post(`/finance-ext/close-cockpit/tasks/${taskKey}/approve`, {
                month: now.getMonth() + 1,
                year: now.getFullYear(),
            }, {
                headers: { 'x-idempotency-key': makeIdempotencyKey(`close-task-${taskKey}`) },
            });
            await fetchWorkspace();
        } catch (error: any) {
            setPageError(error?.response?.data?.message || 'Failed to update close task.');
        } finally {
            setPhase1Busy(false);
        }
    };

    const finalizeClose = async () => {
        setPhase1Busy(true);
        try {
            const now = new Date();
            await api.post('/finance-ext/close-cockpit/finalize', {
                month: now.getMonth() + 1,
                year: now.getFullYear(),
            }, {
                headers: { 'x-idempotency-key': makeIdempotencyKey('close-finalize') },
            });
            await fetchWorkspace();
        } catch (error: any) {
            setPageError(error?.response?.data?.message || 'Failed to finalize period close.');
        } finally {
            setPhase1Busy(false);
        }
    };

    const tabs: Array<{ key: WorkspaceView; label: string; path: string; icon: any }> = [
        { key: 'overview', label: 'Overview', path: '/financial', icon: Landmark },
        { key: 'ap', label: 'AP Invoices', path: '/financial/ap-invoices', icon: Receipt },
        { key: 'matching', label: '3-Way Matching', path: '/financial/matching', icon: GitCompare },
        { key: 'tax', label: 'Tax Reconciliation', path: '/financial/tax', icon: FileSpreadsheet },
        { key: 'capital', label: 'Working Capital', path: '/financial/working-capital', icon: ShieldCheck },
        { key: 'enterprise', label: 'Enterprise Close', path: '/financial/enterprise-close', icon: Calculator },
    ];

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Finance Operations Workspace</h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            Unified AP posting, 3-way matching, tax compliance, working capital, and enterprise close controls.
                        </p>
                    </div>
                    <button
                        onClick={() => void fetchWorkspace()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-sm hover:bg-[var(--bg-card-hover)]"
                    >
                        <RefreshCw className="w-4 h-4" /> Refresh Workspace
                    </button>
                </div>
            </section>

            <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">AP Invoices</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{invoiceStats.total}</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Approved</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{invoiceStats.approved}</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Pending Match</p>
                    <p className="text-2xl font-bold text-amber-400 mt-1">{invoiceStats.pendingMatch}</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Critical Variances</p>
                    <p className="text-2xl font-bold text-orange-400 mt-1">{matchStats.critical}</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Net GST Payable</p>
                    <p className={`text-2xl font-bold mt-1 ${netPayable >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(netPayable)}</p>
                </div>
            </section>

            <section className="flex flex-wrap gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => navigate(tab.path)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                            activeView === tab.key
                                ? 'bg-[var(--primary)] text-black font-semibold'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </section>

            {pageError && (
                <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">
                    {pageError}
                </section>
            )}

            {loading ? (
                <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center text-[var(--text-secondary)]">
                    Loading financial workspace...
                </section>
            ) : null}

            {!loading && activeView === 'overview' && (
                <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Operational Guidance</h2>
                        <div className="space-y-2 text-sm">
                            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3">
                                Prioritize AP invoices with APPROVED status for GL posting to keep liability balances current.
                            </div>
                            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3">
                                Clear all critical 3-way mismatches before payment runs to reduce vendor disputes.
                            </div>
                            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3">
                                Run tax reconciliation weekly and before period close to avoid compliance surprises.
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">AP Exposure</h2>
                        <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                            <div className="flex items-center justify-between rounded-lg bg-[var(--bg-overlay)] p-3">
                                <span>Current (0-30)</span>
                                <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(apAging?.buckets.current.amount || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-[var(--bg-overlay)] p-3">
                                <span>30-60</span>
                                <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(apAging?.buckets.thirtyDays.amount || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-[var(--bg-overlay)] p-3">
                                <span>60-90</span>
                                <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(apAging?.buckets.sixtyDays.amount || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-[var(--bg-overlay)] p-3">
                                <span>90+</span>
                                <span className="font-semibold text-red-400">{formatCurrency(apAging?.buckets.ninetyDays.amount || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/10 p-3">
                                <span>Total Outstanding</span>
                                <span className="font-semibold text-[var(--primary)]">{formatCurrency(apAging?.totalOutstanding || 0)}</span>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {!loading && activeView === 'ap' && (
                <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">AP Invoice Operations</h2>
                        <span className="text-xs text-[var(--text-secondary)]">Total {invoiceStats.total} invoices</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--bg-overlay)] text-[var(--text-secondary)]">
                                <tr>
                                    <th className="text-left p-3">Invoice</th>
                                    <th className="text-left p-3">Vendor</th>
                                    <th className="text-left p-3">Status</th>
                                    <th className="text-left p-3">Match</th>
                                    <th className="text-right p-3">Amount</th>
                                    <th className="text-right p-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {apInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">No AP invoices found yet.</td>
                                    </tr>
                                ) : (
                                    apInvoices.map((invoice) => (
                                        <tr key={invoice.id} className="border-t border-[var(--border-color)]">
                                            <td className="p-3 font-medium text-[var(--text-primary)]">{invoice.invoiceNumber}</td>
                                            <td className="p-3 text-[var(--text-secondary)]">{invoice.vendor?.name || invoice.vendorId}</td>
                                            <td className="p-3 text-[var(--text-secondary)]">{invoice.status}</td>
                                            <td className="p-3 text-[var(--text-secondary)]">{invoice.matchStatus}</td>
                                            <td className="p-3 text-right text-[var(--text-primary)]">{formatCurrency(invoice.totalAmount || 0)}</td>
                                            <td className="p-3">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => void matchInvoice(invoice)}
                                                        className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] text-xs hover:bg-[var(--bg-overlay)]"
                                                    >
                                                        Match
                                                    </button>
                                                    <button
                                                        onClick={() => void approveInvoice(invoice.id)}
                                                        disabled={invoice.status !== 'DRAFT' && invoice.status !== 'SUBMITTED'}
                                                        className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] text-xs disabled:opacity-40 hover:bg-[var(--bg-overlay)]"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => void postInvoice(invoice.id)}
                                                        disabled={invoice.status !== 'APPROVED'}
                                                        className="px-2.5 py-1.5 rounded-lg text-xs bg-[var(--primary)] text-black disabled:opacity-40"
                                                    >
                                                        Post GL
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {!loading && activeView === 'matching' && (
                <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--border-color)]">
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">3-Way Matching Control Board</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--bg-overlay)] text-[var(--text-secondary)]">
                                <tr>
                                    <th className="text-left p-3">Invoice</th>
                                    <th className="text-left p-3">Vendor</th>
                                    <th className="text-left p-3">Status</th>
                                    <th className="text-right p-3">Variances</th>
                                    <th className="text-right p-3">Critical</th>
                                    <th className="text-right p-3">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matchingReport.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">No matching report rows available.</td>
                                    </tr>
                                ) : (
                                    matchingReport.map((row) => (
                                        <tr key={`${row.invoiceNumber}-${row.vendor}`} className="border-t border-[var(--border-color)]">
                                            <td className="p-3 font-medium text-[var(--text-primary)]">{row.invoiceNumber}</td>
                                            <td className="p-3 text-[var(--text-secondary)]">{row.vendor}</td>
                                            <td className="p-3 text-[var(--text-secondary)]">{row.matchStatus}</td>
                                            <td className="p-3 text-right text-[var(--text-primary)]">{row.variances}</td>
                                            <td className={`p-3 text-right font-semibold ${row.criticalVariances > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {row.criticalVariances}
                                            </td>
                                            <td className="p-3 text-right text-[var(--text-primary)]">{formatCurrency(row.totalAmount || 0)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {!loading && activeView === 'tax' && (
                <div className="space-y-4">
                    <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                        <div className="flex flex-wrap items-end gap-3">
                            <div>
                                <label className="block text-xs text-[var(--text-secondary)] mb-1">From</label>
                                <input
                                    type="date"
                                    value={taxFrom}
                                    onChange={(e) => setTaxFrom(e.target.value)}
                                    className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-[var(--text-secondary)] mb-1">To</label>
                                <input
                                    type="date"
                                    value={taxTo}
                                    onChange={(e) => setTaxTo(e.target.value)}
                                    className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-sm"
                                />
                            </div>
                            <button
                                onClick={() => void fetchWorkspace()}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-black text-sm font-medium"
                            >
                                <RefreshCw className="w-4 h-4" /> Reload Tax Data
                            </button>
                        </div>
                    </section>

                    <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
                            <div className="p-4 border-b border-[var(--border-color)]">
                                <h2 className="text-base font-semibold text-[var(--text-primary)]">Tax Reconciliation</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-[var(--bg-overlay)] text-[var(--text-secondary)]">
                                        <tr>
                                            <th className="text-left p-3">Code</th>
                                            <th className="text-right p-3">Input Tax</th>
                                            <th className="text-right p-3">Output Tax</th>
                                            <th className="text-right p-3">Net</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {taxSummary.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="p-6 text-center text-[var(--text-muted)]">No rows in selected date range.</td>
                                            </tr>
                                        ) : (
                                            taxSummary.map((row) => (
                                                <tr key={row.code} className="border-t border-[var(--border-color)]">
                                                    <td className="p-3 text-[var(--text-primary)] font-medium">{row.code}</td>
                                                    <td className="p-3 text-right text-[var(--text-secondary)]">{formatCurrency(row.inputTax || 0)}</td>
                                                    <td className="p-3 text-right text-[var(--text-secondary)]">{formatCurrency(row.outputTax || 0)}</td>
                                                    <td className={`p-3 text-right font-semibold ${(row.netTax || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                        {formatCurrency(row.netTax || 0)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">GST Snapshot</h2>
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                    {['igst', 'sgst', 'cgst'].map((k) => {
                                        const row = gstSummary[k] || { credit: 0, liability: 0, net: 0 };
                                        return (
                                            <div key={k} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="uppercase text-xs text-[var(--text-secondary)]">{k}</span>
                                                    <span className={`font-semibold ${row.net > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(row.net)}</span>
                                                </div>
                                                <p className="text-xs text-[var(--text-secondary)] mt-1">
                                                    Credit {formatCurrency(row.credit)} | Liability {formatCurrency(row.liability)}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Line Tax Calculator</h2>
                                <div className="flex flex-wrap gap-2">
                                    <input
                                        type="number"
                                        value={taxCalcAmount}
                                        onChange={(e) => setTaxCalcAmount(Number(e.target.value || 0))}
                                        className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-sm"
                                        placeholder="Line amount"
                                    />
                                    <select
                                        value={taxCalcCode}
                                        onChange={(e) => setTaxCalcCode(e.target.value)}
                                        className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-sm"
                                    >
                                        <option value="GST_18">GST_18</option>
                                        <option value="GST_12">GST_12</option>
                                        <option value="GST_5">GST_5</option>
                                        <option value="SGST_9">SGST_9</option>
                                        <option value="VAT_5">VAT_5</option>
                                    </select>
                                    <button
                                        onClick={() => void runTaxCalculator()}
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--primary)] text-black text-sm font-medium"
                                    >
                                        <Calculator className="w-4 h-4" /> Calculate
                                    </button>
                                </div>
                                <div className="mt-3 text-sm">
                                    {taxCalcResult == null ? (
                                        <span className="text-[var(--text-secondary)]">Run calculation to view tax amount.</span>
                                    ) : (
                                        <span className="font-semibold text-[var(--text-primary)]">Tax Amount: {formatCurrency(taxCalcResult)}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {!loading && activeView === 'capital' && (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">Payables Health</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Current: {formatCurrency(apAging?.buckets.current.amount || 0)}
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Overdue (60+): {formatCurrency((apAging?.buckets.sixtyDays.amount || 0) + (apAging?.buckets.ninetyDays.amount || 0))}
                        </p>
                    </div>
                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">Governance Status</h2>
                        <div className="space-y-2 text-sm">
                            <div className="inline-flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-4 h-4" /> Tax reconciliation endpoints connected</div>
                            <div className="inline-flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-4 h-4" /> AP matching workflow connected</div>
                            <div className="inline-flex items-center gap-2 text-amber-400"><AlertTriangle className="w-4 h-4" /> Populate AP invoices for richer variance analytics</div>
                        </div>
                    </div>
                </section>
            )}

            {!loading && activeView === 'enterprise' && (
                <div className="space-y-4">
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Intercompany Entries</p>
                            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{intercompanyEntries.length}</p>
                        </div>
                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Revenue Schedules</p>
                            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{revenueSchedules.length}</p>
                        </div>
                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Close Status</p>
                            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{closeCockpit?.status || 'N/A'}</p>
                        </div>
                    </section>

                    <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-3">
                            <h2 className="text-base font-semibold text-[var(--text-primary)]">Intercompany Posting</h2>
                            <div className="grid grid-cols-2 gap-2">
                                <input value={icForm.fromOfficeId} onChange={(e) => setIcForm((p) => ({ ...p, fromOfficeId: e.target.value }))} placeholder="From Office ID" className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-sm" />
                                <input value={icForm.toOfficeId} onChange={(e) => setIcForm((p) => ({ ...p, toOfficeId: e.target.value }))} placeholder="To Office ID" className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-sm" />
                                <input type="number" value={icForm.amount} onChange={(e) => setIcForm((p) => ({ ...p, amount: Number(e.target.value || 0) }))} placeholder="Amount" className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-sm" />
                                <input value={icForm.profitCenter} onChange={(e) => setIcForm((p) => ({ ...p, profitCenter: e.target.value }))} placeholder="Profit Center" className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-sm" />
                            </div>
                            <input value={icForm.costCenter} onChange={(e) => setIcForm((p) => ({ ...p, costCenter: e.target.value }))} placeholder="Cost Center" className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-sm w-full" />
                            <button onClick={() => void createIntercompanyEntry()} disabled={phase1Busy} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-black text-sm font-medium disabled:opacity-50">Create Intercompany Entry</button>
                        </div>

                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-3">
                            <h2 className="text-base font-semibold text-[var(--text-primary)]">Consolidation & Close</h2>
                            <button onClick={() => void runConsolidation()} disabled={phase1Busy} className="px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-sm font-medium disabled:opacity-50">Run Consolidation</button>
                            <div className="space-y-2">
                                {(closeCockpit?.tasks || []).map((task) => (
                                    <div key={task.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-[var(--text-primary)]">{task.label || task.key}</p>
                                            <p className="text-xs text-[var(--text-secondary)]">{task.status}</p>
                                        </div>
                                        <button onClick={() => void approveCloseTask(task.key)} disabled={phase1Busy || task.status === 'COMPLETED'} className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-xs disabled:opacity-50">Approve</button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => void finalizeClose()} disabled={phase1Busy || !closeCockpit?.isReadyToClose} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-black text-sm font-medium disabled:opacity-50">Finalize Period Close</button>
                        </div>
                    </section>

                    <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-3">
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">Revenue Recognition</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            <input value={revRecForm.officeId} onChange={(e) => setRevRecForm((p) => ({ ...p, officeId: e.target.value }))} placeholder="Office ID" className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-sm" />
                            <input value={revRecForm.contractRef} onChange={(e) => setRevRecForm((p) => ({ ...p, contractRef: e.target.value }))} placeholder="Contract Ref" className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-sm" />
                            <input value={revRecForm.customerRef} onChange={(e) => setRevRecForm((p) => ({ ...p, customerRef: e.target.value }))} placeholder="Customer Ref" className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-sm" />
                            <input type="number" value={revRecForm.totalAmount} onChange={(e) => setRevRecForm((p) => ({ ...p, totalAmount: Number(e.target.value || 0) }))} placeholder="Total Amount" className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-sm" />
                            <input type="number" value={revRecForm.periods} onChange={(e) => setRevRecForm((p) => ({ ...p, periods: Number(e.target.value || 1) }))} placeholder="Periods" className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-sm" />
                            <select value={revRecForm.frequency} onChange={(e) => setRevRecForm((p) => ({ ...p, frequency: e.target.value }))} className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-sm">
                                <option value="MONTHLY">MONTHLY</option>
                                <option value="QUARTERLY">QUARTERLY</option>
                                <option value="WEEKLY">WEEKLY</option>
                            </select>
                        </div>
                        <button onClick={() => void createRevenueSchedule()} disabled={phase1Busy} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-black text-sm font-medium disabled:opacity-50">Create Revenue Schedule</button>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--bg-overlay)] text-[var(--text-secondary)]">
                                    <tr>
                                        <th className="text-left p-3">Schedule</th>
                                        <th className="text-left p-3">Contract</th>
                                        <th className="text-left p-3">Status</th>
                                        <th className="text-right p-3">Total</th>
                                        <th className="text-right p-3">Recognized</th>
                                        <th className="text-right p-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {revenueSchedules.length === 0 ? (
                                        <tr><td colSpan={6} className="p-6 text-center text-[var(--text-muted)]">No revenue schedules available.</td></tr>
                                    ) : (
                                        revenueSchedules.map((schedule) => (
                                            <tr key={schedule.id} className="border-t border-[var(--border-color)]">
                                                <td className="p-3 text-[var(--text-primary)] font-medium">{schedule.scheduleNumber || schedule.id}</td>
                                                <td className="p-3 text-[var(--text-secondary)]">{schedule.contractRef || '-'}</td>
                                                <td className="p-3 text-[var(--text-secondary)]">{schedule.status}</td>
                                                <td className="p-3 text-right text-[var(--text-primary)]">{formatCurrency(schedule.totalAmount || 0)}</td>
                                                <td className="p-3 text-right text-[var(--text-primary)]">{formatCurrency(schedule.recognizedAmount || 0)}</td>
                                                <td className="p-3 text-right">
                                                    <button onClick={() => void recognizeRevenueMilestone(schedule.id)} disabled={phase1Busy} className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-xs disabled:opacity-50">Recognize Next</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

export default Financial;

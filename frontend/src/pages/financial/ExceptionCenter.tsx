import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Loader2, RefreshCcw, ShieldAlert } from 'lucide-react';
import api from '../../lib/api';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

type ExceptionItem = {
    id: string;
    module: 'PROCUREMENT' | 'FINANCE' | 'MAINTENANCE' | 'INVENTORY' | string;
    type: string;
    severity: Severity;
    ageDays: number;
    slaTargetDays: number;
    status: 'OPEN' | 'SLA_BREACHED' | string;
    title: string;
    summary: string;
    reference: Record<string, unknown>;
    createdAt: string;
};

type ExceptionResponse = {
    summary: {
        total: number;
        bySeverity: Record<Severity, number>;
        byModule: Record<string, number>;
        slaBreached: number;
        generatedAt: string;
    };
    exceptions: ExceptionItem[];
};

type CockpitResponse = {
    kpis: {
        assetsInScope: number;
        activeMaintenanceTickets: number;
        openPayables: number;
        payableExposure: number;
        pendingExpenseClaims: number;
    };
    generatedAt: string;
};

const SEVERITY_STYLES: Record<Severity, string> = {
    CRITICAL: 'bg-red-500/20 text-red-300 border-red-400/40',
    HIGH: 'bg-orange-500/20 text-orange-300 border-orange-400/40',
    MEDIUM: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
    LOW: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
};

function formatCurrency(value: number, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
    }).format(Number(value || 0));
}

export function ExceptionCenter() {
    const [searchParams] = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [report, setReport] = useState<ExceptionResponse | null>(null);
    const [cockpit, setCockpit] = useState<CockpitResponse | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setWarning(null);
        try {
            const [exceptionRes, cockpitRes] = await Promise.allSettled([
                api.get('/finance-ext/exception-center'),
                api.get('/finance-ext/cockpit'),
            ]);

            const nextReport = exceptionRes.status === 'fulfilled' && exceptionRes.value.data?.success
                ? (exceptionRes.value.data.data as ExceptionResponse)
                : null;
            const nextCockpit = cockpitRes.status === 'fulfilled' && cockpitRes.value.data?.success
                ? (cockpitRes.value.data.data as CockpitResponse)
                : null;

            setReport(nextReport);
            setCockpit(nextCockpit);

            if (!nextReport && !nextCockpit) {
                setError('Failed to load exception center data.');
            } else if (!nextReport) {
                setWarning('Exception queue is temporarily unavailable. KPI cockpit is shown with available data.');
            } else if (!nextCockpit) {
                setWarning('KPI cockpit is temporarily unavailable. Exception queue is shown with available data.');
            }
        } catch (err: any) {
            console.error('Failed to load exception center data', err);
            setError(err?.response?.data?.message || 'Failed to load exception center data');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const sortedExceptions = useMemo(() => {
        if (!report?.exceptions) return [];
        const moduleFilter = String(searchParams.get('module') || '').trim().toUpperCase();
        const refFilter = String(searchParams.get('ref') || '').trim();

        const filtered = report.exceptions.filter((e) => {
            const moduleOk = !moduleFilter || String(e.module || '').toUpperCase() === moduleFilter;
            if (!moduleOk) return false;
            if (!refFilter) return true;

            const ref = e.reference || {};
            const refs = [
                String(ref.inventoryId || ''),
                String(ref.purchaseOrderId || ''),
                String(ref.invoiceId || ''),
                String(ref.ticketId || ''),
            ];
            return refs.includes(refFilter);
        });

        const weight: Record<Severity, number> = {
            CRITICAL: 4,
            HIGH: 3,
            MEDIUM: 2,
            LOW: 1,
        };

        return [...filtered].sort((a, b) => {
            const sw = (weight[a.severity as Severity] || 0) - (weight[b.severity as Severity] || 0);
            if (sw !== 0) return -sw;
            return b.ageDays - a.ageDays;
        });
    }, [report, searchParams]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <ShieldAlert className="w-6 h-6 text-red-400" />
                        Exception Center
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Unified operational risk queue for 3-way match, AP delays, SLA breaches, and spare stock failures.
                    </p>
                    {(searchParams.get('module') || searchParams.get('ref')) && (
                        <p className="text-xs text-[var(--text-muted)] mt-2">
                            Filtered view: module={searchParams.get('module') || 'ALL'} ref={searchParams.get('ref') || 'ALL'}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => void fetchData()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
                >
                    <RefreshCcw className="w-4 h-4" />
                    Refresh
                </button>
            </section>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                </div>
            ) : error ? (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
                    {error}
                </div>
            ) : (
                <>
                    {warning && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
                            {warning}
                        </div>
                    )}
                    <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Total Exceptions</div>
                            <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">{report?.summary.total ?? 0}</div>
                        </div>
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">SLA Breached</div>
                            <div className="text-2xl font-bold text-red-400 mt-1">{report?.summary.slaBreached ?? 0}</div>
                        </div>
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Open Payables</div>
                            <div className="text-lg font-semibold text-[var(--text-primary)] mt-1">{cockpit?.kpis.openPayables ?? 0}</div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">{formatCurrency(cockpit?.kpis.payableExposure || 0)}</div>
                        </div>
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Active Tickets</div>
                            <div className="text-2xl font-bold text-amber-300 mt-1">{cockpit?.kpis.activeMaintenanceTickets ?? 0}</div>
                        </div>
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Pending Claims</div>
                            <div className="text-2xl font-bold text-sky-300 mt-1">{cockpit?.kpis.pendingExpenseClaims ?? 0}</div>
                        </div>
                    </section>

                    <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Priority Queue</h2>
                            <span className="text-xs text-[var(--text-muted)]">
                                Last refreshed: {report?.summary.generatedAt ? new Date(report.summary.generatedAt).toLocaleString() : '-'}
                            </span>
                        </div>

                        {sortedExceptions.length === 0 ? (
                            <div className="p-8 text-center text-[var(--text-muted)]">No exceptions detected right now.</div>
                        ) : (
                            <div className="divide-y divide-[var(--border-color)]">
                                {sortedExceptions.map((item) => (
                                    <article key={item.id} className="p-4 hover:bg-[var(--bg-overlay)] transition-colors">
                                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                                            <div className="space-y-2">
                                                <div className="flex items-center flex-wrap gap-2">
                                                    <span className="px-2 py-1 rounded-md text-xs border border-[var(--border-color)] text-[var(--text-secondary)]">
                                                        {item.module}
                                                    </span>
                                                    <span className={`px-2 py-1 rounded-md text-xs border ${SEVERITY_STYLES[item.severity as Severity]}`}>
                                                        {item.severity}
                                                    </span>
                                                    {item.status === 'SLA_BREACHED' && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-red-400/40 bg-red-500/10 text-red-200">
                                                            <AlertTriangle className="w-3 h-3" /> SLA BREACHED
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-[var(--text-primary)] font-semibold">{item.title}</h3>
                                                <p className="text-sm text-[var(--text-secondary)]">{item.summary}</p>
                                                <div className="text-xs text-[var(--text-muted)]">
                                                    Type: {item.type} | Age: {item.ageDays}d | Target: {item.slaTargetDays}d
                                                </div>
                                            </div>

                                            <div className="lg:text-right text-sm text-[var(--text-secondary)]">
                                                <div>Created: {new Date(item.createdAt).toLocaleDateString()}</div>
                                                <div className="text-xs text-[var(--text-muted)] mt-1">
                                                    Ref: {item.reference.purchaseOrderNumber as string || item.reference.invoiceNumber as string || item.reference.ticketNumber as string || item.reference.partNumber as string || '-'}
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

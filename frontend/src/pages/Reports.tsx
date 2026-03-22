import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { toast } from 'sonner';
import {
    Sparkles,
    Wand2,
    Calendar,
    FileDown,
    Loader2,
    AlertTriangle,
    Activity,
    LineChart,
    Sigma,
    SlidersHorizontal,
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';

type ReportTemplate = {
    id: string;
    label: string;
    endpoint: string;
    description: string;
    category: 'OPERATIONS' | 'FINANCE' | 'PROCUREMENT' | 'EXECUTIVE';
};

type Office = {
    id: string;
    name: string;
};

const REPORT_TEMPLATES: ReportTemplate[] = [
    {
        id: 'executive-pulse',
        label: 'Executive Pulse',
        endpoint: '/analytics/dashboard',
        description: 'Unified operational health snapshot across assets, maintenance, and spend.',
        category: 'EXECUTIVE',
    },
    {
        id: 'asset-portfolio',
        label: 'Asset Portfolio Mix',
        endpoint: '/analytics/assets/by-category',
        description: 'Category-level distribution of asset footprint and concentration risk.',
        category: 'OPERATIONS',
    },
    {
        id: 'maintenance-trend',
        label: 'Maintenance Trendline',
        endpoint: '/analytics/maintenance/trends',
        description: 'Trend of maintenance workload and reliability behavior over time.',
        category: 'OPERATIONS',
    },
    {
        id: 'inventory-valuation',
        label: 'Inventory Valuation',
        endpoint: '/inventory/reports/valuation',
        description: 'Current stock valuation with cost exposure.',
        category: 'OPERATIONS',
    },
    {
        id: 'vendor-performance',
        label: 'Vendor Performance Radar',
        endpoint: '/analytics/vendors/performance',
        description: 'Supplier delivery and quality signals.',
        category: 'PROCUREMENT',
    },
    {
        id: 'ap-aging',
        label: 'AP Aging',
        endpoint: '/finance-ext/ap-aging',
        description: 'Payables aging and overdue risk.',
        category: 'FINANCE',
    },
    {
        id: 'ar-aging',
        label: 'AR Aging',
        endpoint: '/finance-ext/ar-aging',
        description: 'Receivables aging and collection pressure.',
        category: 'FINANCE',
    },
    {
        id: 'profit-loss',
        label: 'Profit & Loss',
        endpoint: '/gl/profit-loss',
        description: 'Revenue vs expense signal and earnings quality pulse.',
        category: 'FINANCE',
    },
    {
        id: 'cash-flow',
        label: 'Cash Flow Statement',
        endpoint: '/gl/cash-flow',
        description: 'Operating, investing, and financing cash dynamics.',
        category: 'FINANCE',
    },
    {
        id: 'ap-matching',
        label: 'AP Matching Report',
        endpoint: '/ap-invoices/matching/report',
        description: '3-way matching variances across AP invoices.',
        category: 'FINANCE',
    },
    {
        id: 'tax-reconciliation',
        label: 'Tax Reconciliation',
        endpoint: '/finance-ext/tax-reconciliation',
        description: 'Input vs output tax balance by tax code.',
        category: 'FINANCE',
    },
    {
        id: 'gst-reconciliation',
        label: 'GST Reconciliation',
        endpoint: '/finance-ext/gst-reconciliation',
        description: 'IGST, SGST, CGST liability and credit netting.',
        category: 'FINANCE',
    },
    {
        id: 'exception-center',
        label: 'Exception Center',
        endpoint: '/finance-ext/exception-center',
        description: 'High-priority anomalies and unresolved exceptions.',
        category: 'EXECUTIVE',
    },
];

const MAX_TABLE_ROWS = 50;

function collectRows(value: unknown): Record<string, unknown>[] {
    if (Array.isArray(value)) {
        return value.filter((v) => v && typeof v === 'object') as Record<string, unknown>[];
    }

    if (!value || typeof value !== 'object') return [];

    const obj = value as Record<string, unknown>;
    const candidates = ['items', 'rows', 'records', 'results', 'data', 'summary'];

    for (const key of candidates) {
        const child = obj[key];
        if (Array.isArray(child)) {
            return child.filter((v) => v && typeof v === 'object') as Record<string, unknown>[];
        }
    }

    const nestedArrays = Object.values(obj).find((v) => Array.isArray(v));
    if (Array.isArray(nestedArrays)) {
        return nestedArrays.filter((v) => v && typeof v === 'object') as Record<string, unknown>[];
    }

    return [obj];
}

function flattenNumericValues(input: unknown): number[] {
    const values: number[] = [];
    const walk = (value: unknown) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            values.push(value);
            return;
        }
        if (Array.isArray(value)) {
            value.forEach(walk);
            return;
        }
        if (value && typeof value === 'object') {
            Object.values(value as Record<string, unknown>).forEach(walk);
        }
    };
    walk(input);
    return values;
}

function safeText(value: unknown) {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString() : '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return JSON.stringify(value);
}

export default function Reports() {
    const [offices, setOffices] = useState<Office[]>([]);
    const [selectedOffice, setSelectedOffice] = useState('ALL');
    const [selectedTemplateId, setSelectedTemplateId] = useState(REPORT_TEMPLATES[0].id);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month' | 'quarter'>('month');
    const [enableCompare, setEnableCompare] = useState(false);
    const [scenarioChangePct, setScenarioChangePct] = useState(0);

    const [isRunning, setIsRunning] = useState(false);
    const [reportData, setReportData] = useState<unknown>(null);
    const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
    const [reportError, setReportError] = useState<string | null>(null);

    const selectedTemplate = useMemo(
        () => REPORT_TEMPLATES.find((t) => t.id === selectedTemplateId) || REPORT_TEMPLATES[0],
        [selectedTemplateId]
    );

    useEffect(() => {
        const loadOffices = async () => {
            try {
                const res = await api.get('/offices?limit=200');
                const officeList = Array.isArray(res.data?.data) ? res.data.data : [];
                setOffices(officeList);
            } catch {
                setOffices([]);
            }
        };

        loadOffices();
    }, []);

    const runReport = async () => {
        setIsRunning(true);
        setReportError(null);

        try {
            const usesTaxDateRange = selectedTemplate.id === 'tax-reconciliation' || selectedTemplate.id === 'gst-reconciliation';
            const params: Record<string, string> = {
                ...(dateFrom && { from: dateFrom }),
                ...(dateTo && { to: dateTo }),
                ...(usesTaxDateRange && dateFrom && { startDate: new Date(dateFrom).toISOString() }),
                ...(usesTaxDateRange && dateTo && { endDate: new Date(dateTo).toISOString() }),
                ...(groupBy && { groupBy }),
                ...(selectedOffice !== 'ALL' && { officeId: selectedOffice }),
                ...(enableCompare && { compare: 'true' }),
            };

            const res = await api.get(selectedTemplate.endpoint, { params });
            const payload = res.data?.data ?? res.data;
            setReportData(payload);
            setLastGeneratedAt(new Date().toISOString());
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Report generation failed';
            setReportError(message);
            toast.error(message);
        } finally {
            setIsRunning(false);
        }
    };

    useEffect(() => {
        runReport();
    }, [selectedTemplateId]);

    const rows = useMemo(() => collectRows(reportData).slice(0, MAX_TABLE_ROWS), [reportData]);
    const columns = useMemo(() => {
        if (!rows.length) return [];
        return Object.keys(rows[0]).slice(0, 10);
    }, [rows]);

    const numericSeries = useMemo(() => flattenNumericValues(reportData), [reportData]);
    const totalSignal = useMemo(() => numericSeries.reduce((sum, value) => sum + value, 0), [numericSeries]);
    const avgSignal = useMemo(
        () => (numericSeries.length ? totalSignal / numericSeries.length : 0),
        [numericSeries, totalSignal]
    );

    const anomalyCount = useMemo(() => {
        if (!numericSeries.length) return 0;
        const mean = avgSignal;
        const threshold = Math.abs(mean) * 0.8;
        return numericSeries.filter((value) => Math.abs(value - mean) > threshold).length;
    }, [numericSeries, avgSignal]);

    const projectedSignal = useMemo(() => {
        const factor = 1 + scenarioChangePct / 100;
        return totalSignal * factor;
    }, [scenarioChangePct, totalSignal]);

    const aiInsights = useMemo(() => {
        const findings: string[] = [];
        if (!reportData) return findings;

        if (anomalyCount > 0) {
            findings.push(`Anomaly radar detected ${anomalyCount} outlier signals. Prioritize exception drill-down.`);
        } else {
            findings.push('Signal variance is stable. No major outliers in current slice.');
        }

        if (numericSeries.length) {
            findings.push(`Current total signal is ${formatCurrency(totalSignal || 0)} with an average of ${formatCurrency(avgSignal || 0)}.`);
            findings.push(`Scenario simulator at ${scenarioChangePct >= 0 ? '+' : ''}${scenarioChangePct}% projects ${formatCurrency(projectedSignal || 0)}.`);
        } else {
            findings.push('This report is primarily categorical; numeric forecast is limited for this template.');
        }

        findings.push(`Template focus: ${selectedTemplate.label}. Grouping: ${groupBy.toUpperCase()}.`);
        return findings;
    }, [anomalyCount, numericSeries.length, totalSignal, avgSignal, scenarioChangePct, projectedSignal, selectedTemplate.label, groupBy, reportData]);

    const exportCsv = () => {
        if (!rows.length || !columns.length) {
            toast.error('No tabular rows to export');
            return;
        }

        const header = columns.join(',');
        const body = rows
            .map((row) =>
                columns
                    .map((col) => {
                        const value = row[col];
                        const text = safeText(value).replaceAll('"', '""');
                        return `"${text}"`;
                    })
                    .join(',')
            )
            .join('\n');

        const csv = `${header}\n${body}`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedTemplate.id}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-cyan-500/10 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Sparkles className="text-cyan-400" size={24} />
                            Insen Report Generator
                        </h1>
                        <p className="text-sm text-[var(--muted-foreground)] mt-2 max-w-2xl">
                            Multi-domain report composer with anomaly radar, scenario simulation, and deep ERP report templates.
                        </p>
                    </div>
                    <div className="text-sm text-[var(--muted-foreground)]">
                        {lastGeneratedAt ? `Last generated: ${new Date(lastGeneratedAt).toLocaleString()}` : 'Generate a report to start'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <section className="xl:col-span-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-5 h-fit">
                    <h2 className="font-semibold text-lg flex items-center gap-2"><Wand2 size={18} /> Report Builder</h2>

                    <div className="space-y-2">
                        <label className="text-sm text-[var(--muted-foreground)]">Template</label>
                        <select
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md"
                        >
                            {REPORT_TEMPLATES.map((template) => (
                                <option key={template.id} value={template.id}>
                                    {template.label} ({template.category})
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-[var(--muted-foreground)]">{selectedTemplate.description}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-sm text-[var(--muted-foreground)] flex items-center gap-2"><Calendar size={13} /> From</label>
                            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-[var(--muted-foreground)]">To</label>
                            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-[var(--muted-foreground)]">Office Scope</label>
                        <select
                            value={selectedOffice}
                            onChange={(e) => setSelectedOffice(e.target.value)}
                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md"
                        >
                            <option value="ALL">All Offices</option>
                            {offices.map((office) => (
                                <option key={office.id} value={office.id}>{office.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-[var(--muted-foreground)]">Group By</label>
                        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month' | 'quarter')} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md">
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                            <option value="quarter">Quarter</option>
                        </select>
                    </div>

                    <label className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 cursor-pointer">
                        <span className="text-sm">Compare with prior period</span>
                        <input type="checkbox" checked={enableCompare} onChange={(e) => setEnableCompare(e.target.checked)} className="h-4 w-4" />
                    </label>

                    <button
                        onClick={runReport}
                        disabled={isRunning}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-black font-semibold rounded-md disabled:opacity-60"
                    >
                        {isRunning ? <Loader2 className="animate-spin" size={16} /> : <Activity size={16} />}
                        Generate Report
                    </button>
                </section>

                <section className="xl:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                            <p className="text-xs text-[var(--muted-foreground)]">Total Signal</p>
                            <p className="text-2xl font-semibold mt-1">{formatCurrency(totalSignal || 0)}</p>
                        </div>
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                            <p className="text-xs text-[var(--muted-foreground)]">Avg Signal</p>
                            <p className="text-2xl font-semibold mt-1">{formatCurrency(avgSignal || 0)}</p>
                        </div>
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                            <p className="text-xs text-[var(--muted-foreground)]">Anomaly Count</p>
                            <p className="text-2xl font-semibold mt-1">{anomalyCount}</p>
                        </div>
                    </div>

                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="font-semibold text-lg flex items-center gap-2"><SlidersHorizontal size={18} /> Insen Scenario Simulator</h2>
                            <span className="text-sm text-[var(--muted-foreground)]">Projected: {formatCurrency(projectedSignal || 0)}</span>
                        </div>
                        <input
                            type="range"
                            min={-40}
                            max={60}
                            step={5}
                            value={scenarioChangePct}
                            onChange={(e) => setScenarioChangePct(Number(e.target.value))}
                            className="w-full"
                        />
                        <p className="text-sm text-[var(--muted-foreground)]">Scenario shift: {scenarioChangePct >= 0 ? '+' : ''}{scenarioChangePct}%</p>
                    </div>

                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="font-semibold text-lg flex items-center gap-2"><Sigma size={18} /> Report Output</h2>
                            <button
                                onClick={exportCsv}
                                disabled={!rows.length}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--border)] text-sm disabled:opacity-50"
                            >
                                <FileDown size={14} /> Export CSV
                            </button>
                        </div>

                        {reportError && (
                            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400 flex items-center gap-2">
                                <AlertTriangle size={16} /> {reportError}
                            </div>
                        )}

                        {!rows.length ? (
                            <div className="text-sm text-[var(--muted-foreground)] py-8 text-center border border-dashed border-[var(--border)] rounded-xl">
                                No tabular records found for this template and filter set.
                            </div>
                        ) : (
                            <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
                                <table className="w-full text-sm">
                                    <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]">
                                        <tr>
                                            {columns.map((column) => (
                                                <th key={column} className="text-left px-3 py-2 font-medium whitespace-nowrap">{column}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, index) => (
                                            <tr key={index} className="border-t border-[var(--border)] hover:bg-[var(--muted)]/20">
                                                {columns.map((column) => (
                                                    <td key={`${index}-${column}`} className="px-3 py-2 align-top whitespace-nowrap">{safeText(row[column])}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                        <h2 className="font-semibold text-lg flex items-center gap-2 mb-3"><LineChart size={18} /> Insen Insight Engine</h2>
                        <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
                            {aiInsights.map((insight, index) => (
                                <li key={index} className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2">{insight}</li>
                            ))}
                        </ul>
                    </div>
                </section>
            </div>
        </div>
    );
}

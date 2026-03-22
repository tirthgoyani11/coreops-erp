import { useEffect, useMemo, useState } from 'react';
import {
    Activity,
    ArrowUpRight,
    Bot,
    Brain,
    FileScan,
    Landmark,
    Loader2,
    RefreshCw,
    ShieldAlert,
    Sparkles,
    Wallet,
} from 'lucide-react';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../lib/utils';

type FeedSummary = {
    recentTransactionCount: number;
    autoRecordedCount: number;
    manualRecordedCount: number;
    autoCoveragePct: number;
};

type FlowRow = {
    category: string;
    amount: number;
};

type FeedTransaction = {
    id: string;
    type: 'INCOME' | 'EXPENSE' | string;
    category: string;
    amount: number;
    status?: string;
    description?: string;
    referenceType?: string;
    date: string;
    recordedBy?: { name?: string };
};

type FinanceFeed = {
    summary: FeedSummary;
    topCategoryFlow: FlowRow[];
    exceptions: FeedTransaction[];
    recentTransactions: FeedTransaction[];
};

type AgingSummary = Record<string, number>;

type GstData = {
    sales?: { totalGST?: number };
    purchases?: { totalGST?: number };
    netLiability?: { total?: number };
};

function getErrorMessage(error: any, fallback: string): string {
    return error?.response?.data?.message || error?.message || fallback;
}

export function Financial() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [feed, setFeed] = useState<FinanceFeed | null>(null);
    const [apAging, setApAging] = useState<AgingSummary>({});
    const [arAging, setArAging] = useState<AgingSummary>({});
    const [gst, setGst] = useState<GstData>({});

    const [signalText, setSignalText] = useState('');
    const [signalAmount, setSignalAmount] = useState('');
    const [signalCategory, setSignalCategory] = useState('AUTOMATION');
    const [signalType, setSignalType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
    const [signalImageBase64, setSignalImageBase64] = useState('');
    const [intakeLoading, setIntakeLoading] = useState(false);

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true);
        setRefreshing(true);
        try {
            const [feedRes, apRes, arRes, gstRes] = await Promise.all([
                api.get('/finance/automation-feed'),
                api.get('/finance/ap-aging'),
                api.get('/finance/ar-aging'),
                api.get('/finance/gst-summary'),
            ]);

            setFeed(feedRes.data?.data || null);
            setApAging(apRes.data?.data?.summary || {});
            setArAging(arRes.data?.data?.summary || {});
            setGst(gstRes.data?.data || {});
        } catch (error: any) {
            toast.error(getErrorMessage(error, 'Failed to load finance control tower data'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const kpis = useMemo(() => {
        const summary = feed?.summary || {
            recentTransactionCount: 0,
            autoRecordedCount: 0,
            manualRecordedCount: 0,
            autoCoveragePct: 0,
        };

        const apTotal = Number(apAging.total || 0);
        const arTotal = Number(arAging.total || 0);
        const gstLiability = Number(gst.netLiability?.total || 0);

        return {
            ...summary,
            apTotal,
            arTotal,
            gstLiability,
        };
    }, [feed, apAging, arAging, gst]);

    const onImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Upload an image file for OCR/vision intake');
            return;
        }

        const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const value = String(reader.result || '');
                resolve(value.includes(',') ? value.split(',')[1] : value);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        setSignalImageBase64(base64);
        toast.success('Image attached for AI + OCR extraction');
    };

    const submitAISignal = async () => {
        const numericAmount = Number(signalAmount || 0);
        if (!signalText && !signalImageBase64 && numericAmount <= 0) {
            toast.error('Provide text, image, or amount for AI automation intake');
            return;
        }

        setIntakeLoading(true);
        try {
            await api.post('/finance/automation/intake', {
                text: signalText,
                image: signalImageBase64 || null,
                sourceModule: 'FINANCE_CONTROL_TOWER',
                eventType: signalType === 'INCOME' ? 'income_signal' : 'expense_signal',
                signal: {
                    type: signalType,
                    category: signalCategory,
                    amount: numericAmount > 0 ? numericAmount : undefined,
                    description: signalText || undefined,
                },
            });

            toast.success('Auto-recorded finance transaction from AI/OCR signal');
            setSignalText('');
            setSignalAmount('');
            setSignalImageBase64('');
            await loadData(true);
        } catch (error: any) {
            toast.error(getErrorMessage(error, 'Failed to auto-record financial signal'));
        } finally {
            setIntakeLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-900/50 via-cyan-900/40 to-slate-900 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 px-3 py-1 text-xs text-emerald-300 mb-3">
                            <Sparkles className="w-3.5 h-3.5" />
                            Finance Control Tower
                        </div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-white">Unified ERP Finance Automation</h1>
                        <p className="text-sm text-emerald-100/80 mt-2 max-w-2xl">
                            Auto-records financial impact from inventory, procurement, maintenance, and operations with AI and OCR-assisted intake.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => loadData(true)} disabled={refreshing}>
                            {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            Refresh
                        </Button>
                        <Button onClick={() => window.location.assign('/finance/exception-center')}>
                            <ShieldAlert className="w-4 h-4 mr-2" />
                            Exceptions
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card className="p-4 border border-[var(--border-color)] bg-[var(--bg-card)]">
                    <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                        <span>Auto Coverage</span>
                        <Bot className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-semibold text-[var(--text-primary)] mt-2">{kpis.autoCoveragePct}%</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">{kpis.autoRecordedCount} automated / {kpis.recentTransactionCount} recent</div>
                </Card>

                <Card className="p-4 border border-[var(--border-color)] bg-[var(--bg-card)]">
                    <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                        <span>AP Outstanding</span>
                        <Wallet className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-semibold text-[var(--text-primary)] mt-2">{formatCurrency(kpis.apTotal)}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">Live payable pressure</div>
                </Card>

                <Card className="p-4 border border-[var(--border-color)] bg-[var(--bg-card)]">
                    <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                        <span>AR Receivable</span>
                        <Landmark className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-semibold text-[var(--text-primary)] mt-2">{formatCurrency(kpis.arTotal)}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">Cash-in pipeline</div>
                </Card>

                <Card className="p-4 border border-[var(--border-color)] bg-[var(--bg-card)]">
                    <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                        <span>Net GST Liability</span>
                        <Activity className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-semibold text-[var(--text-primary)] mt-2">{formatCurrency(kpis.gstLiability)}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">Tax exposure snapshot</div>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Card className="p-4 xl:col-span-2 border border-[var(--border-color)] bg-[var(--bg-card)]">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">Top Money Flow Categories</h2>
                        <Button variant="ghost" size="sm" onClick={() => window.location.assign('/reports')}>
                            Open Reports
                            <ArrowUpRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {(feed?.topCategoryFlow || []).length === 0 && (
                            <div className="text-sm text-[var(--text-secondary)]">No category flow data yet.</div>
                        )}
                        {(feed?.topCategoryFlow || []).map((row) => (
                            <div key={row.category} className="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] px-3 py-2">
                                <div className="text-sm text-[var(--text-primary)]">{row.category}</div>
                                <div className="text-sm font-medium text-[var(--text-primary)]">{formatCurrency(Number(row.amount || 0))}</div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="p-4 border border-[var(--border-color)] bg-[var(--bg-card)]">
                    <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-4 h-4 text-[var(--primary)]" />
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">AI + OCR Intake</h2>
                    </div>
                    <div className="space-y-3">
                        <select
                            value={signalType}
                            onChange={(e) => setSignalType(e.target.value as 'EXPENSE' | 'INCOME')}
                            className="w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-overlay)] px-2 py-2 text-sm"
                        >
                            <option value="EXPENSE">Expense</option>
                            <option value="INCOME">Income</option>
                        </select>
                        <Input
                            placeholder="Category (e.g. PROCUREMENT, MAINTENANCE)"
                            value={signalCategory}
                            onChange={(e) => setSignalCategory(e.target.value)}
                        />
                        <Input
                            placeholder="Amount (optional if AI can detect)"
                            value={signalAmount}
                            onChange={(e) => setSignalAmount(e.target.value)}
                        />
                        <textarea
                            value={signalText}
                            onChange={(e) => setSignalText(e.target.value)}
                            className="w-full min-h-[90px] rounded-md border border-[var(--border-color)] bg-[var(--bg-overlay)] px-2 py-2 text-sm"
                            placeholder="Paste transaction text, invoice note, payment memo, or operational instruction"
                        />
                        <label className="flex items-center justify-between rounded-md border border-dashed border-[var(--border-color)] px-3 py-2 text-sm cursor-pointer">
                            <span className="inline-flex items-center gap-2">
                                <FileScan className="w-4 h-4" />
                                Attach invoice/image for OCR
                            </span>
                            <input type="file" accept="image/*" className="hidden" onChange={onImageChange} />
                        </label>
                        {signalImageBase64 && (
                            <div className="text-xs text-emerald-400">Image attached and ready for AI extraction</div>
                        )}
                        <Button onClick={submitAISignal} disabled={intakeLoading} className="w-full">
                            {intakeLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            Auto Record Financial Entry
                        </Button>
                    </div>
                </Card>
            </div>

            <Card className="p-4 border border-[var(--border-color)] bg-[var(--bg-card)]">
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Live Financial Transaction Stream</h2>
                {loading ? (
                    <div className="h-40 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                    </div>
                ) : (
                    <div className="overflow-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left border-b border-[var(--border-color)] text-[var(--text-muted)]">
                                    <th className="py-2 pr-3">Date</th>
                                    <th className="py-2 pr-3">Type</th>
                                    <th className="py-2 pr-3">Category</th>
                                    <th className="py-2 pr-3">Description</th>
                                    <th className="py-2 pr-3">Ref Type</th>
                                    <th className="py-2 pr-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(feed?.recentTransactions || []).slice(0, 20).map((row) => (
                                    <tr key={row.id} className="border-b border-[var(--border-color)]/50">
                                        <td className="py-2 pr-3 text-[var(--text-secondary)]">{new Date(row.date).toLocaleString()}</td>
                                        <td className="py-2 pr-3">
                                            <span className={row.type === 'INCOME' ? 'text-emerald-400' : 'text-amber-400'}>{row.type}</span>
                                        </td>
                                        <td className="py-2 pr-3 text-[var(--text-primary)]">{row.category}</td>
                                        <td className="py-2 pr-3 text-[var(--text-secondary)]">{row.description || '-'}</td>
                                        <td className="py-2 pr-3 text-[var(--text-secondary)]">{row.referenceType || '-'}</td>
                                        <td className="py-2 pr-3 text-right text-[var(--text-primary)]">{formatCurrency(Number(row.amount || 0))}</td>
                                    </tr>
                                ))}
                                {(feed?.recentTransactions || []).length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-[var(--text-secondary)]">No transactions captured yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}

export default Financial;

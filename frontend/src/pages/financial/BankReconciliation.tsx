import { useState, useEffect } from 'react';
import { ShieldCheck, Upload, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

export function BankReconciliation() {
    const [statements, setStatements] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
    const [reconData, setReconData] = useState<any>(null);

    useEffect(() => {
        fetchStatements();
    }, []);

    const fetchStatements = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/finance-ext/bank-statements');
            if (res.data.success) {
                setStatements(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch Bank Statements:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchReconData = async (id: string) => {
        try {
            const res = await api.get(`/finance-ext/bank-statements/${id}/reconcile`);
            if (res.data.success) {
                setReconData(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch reconciliation details:', error);
        }
    };

    const handleUploadTestStatement = async () => {
        // Mocking an upload of a parsed bank statement
        try {
            setIsUploading(true);

            // Fetch an actual account to attach it to
            const accountsRes = await api.get('/gl/accounts');
            const accounts = accountsRes.data.data || [];
            const bankAccount = accounts.find((a: any) => a.name.toLowerCase().includes('bank') || a.type === 'ASSET');

            if (!bankAccount) {
                alert("No Bank GL Account found to attach the statement to.");
                return;
            }

            const payload = {
                accountId: bankAccount.id,
                statementDate: new Date(),
                endingBalance: 25000,
                entries: [
                    { date: new Date(), description: 'AWS Services', amount: -500, reference: 'ACH-123' },
                    { date: new Date(), description: 'Client Payment', amount: 12000, reference: 'DEP-456' },
                    { date: new Date(), description: 'Office Supplies', amount: -150, reference: 'POS-789' }
                ]
            };

            const res = await api.post('/finance-ext/bank-statements', payload);
            if (res.data.success) {
                fetchStatements();
            }
        } catch (error) {
            console.error('Upload failed', error);
        } finally {
            setIsUploading(false);
        }
    };

    const confirmMatches = async () => {
        if (!reconData || !reconData.suggestedMatches.length) return;

        try {
            const matches = reconData.suggestedMatches.map((m: any) => ({
                bankEntryId: m.bankEntry.id,
                systemTxnId: m.systemTxn.id
            }));
            const res = await api.post(`/finance-ext/bank-statements/${selectedStatementId}/reconcile`, { matches });
            if (res.data.success) {
                alert('Matches confirmed successfully!');
                fetchReconData(selectedStatementId!);
            }
        } catch (error) {
            console.error('Match confirmation failed:', error);
        }
    };



    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center pb-4 border-b border-[var(--border-color)]">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <ShieldCheck className="w-6 h-6 text-purple-400" />
                        Bank Reconciliation
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Match bank statement entries against system ledger transactions.
                    </p>
                </div>
                <button
                    onClick={handleUploadTestStatement}
                    disabled={isUploading}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-black rounded-lg hover:shadow-[0_0_15px_rgba(185,255,102,0.4)] transition-all font-medium disabled:opacity-50"
                >
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    Upload Statement
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center flex-col items-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                    <p className="mt-4 text-[var(--text-muted)]">Loading bank statements...</p>
                </div>
            ) : statements.length === 0 ? (
                <div className="text-center py-10 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
                    <FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-[var(--text-primary)]">No Bank Statements Found</h3>
                    <p className="text-[var(--text-secondary)] mt-2">Upload a bank statement (CSV/OFX) to begin reconciliation.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Statements List Sidebar */}
                    <div className="col-span-1 space-y-4">
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">Statements</h2>
                        <div className="space-y-3">
                            {statements.map(stmt => (
                                <div
                                    key={stmt.id}
                                    onClick={() => {
                                        setSelectedStatementId(stmt.id);
                                        fetchReconData(stmt.id);
                                    }}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedStatementId === stmt.id
                                        ? 'bg-[var(--primary)]/10 border-[var(--primary)] shadow-[0_0_10px_rgba(185,255,102,0.1)]'
                                        : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--primary)]/50'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-medium text-[var(--text-primary)]">{stmt.account?.name || 'Bank Account'}</div>
                                        <div className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(stmt.endingBalance)}</div>
                                    </div>
                                    <div className="text-xs text-[var(--text-muted)] flex justify-between">
                                        <span>Date: {new Date(stmt.statementDate).toLocaleDateString()}</span>
                                        <span>{stmt._count.entries} entries</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Reconciliation Details Workspace */}
                    <div className="col-span-1 lg:col-span-2 space-y-4">
                        {!selectedStatementId ? (
                            <div className="h-full min-h-[400px] flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
                                <p className="text-[var(--text-muted)]">Select a statement to view reconciliation details.</p>
                            </div>
                        ) : !reconData ? (
                            <div className="h-full min-h-[400px] flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
                                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Summary stats */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] text-center">
                                        <div className="text-2xl font-black text-[var(--primary)]">{reconData.suggestedMatches.length}</div>
                                        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide mt-1">Suggested Matches</div>
                                    </div>
                                    <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] text-center">
                                        <div className="text-2xl font-black text-red-400">{reconData.unmatchedBankEntries.length}</div>
                                        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide mt-1">Unmatched Bank Entries</div>
                                    </div>
                                    <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] text-center">
                                        <div className="text-2xl font-black text-orange-400">{reconData.unmatchedSystemTxns.length}</div>
                                        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide mt-1">Unmatched System Txns</div>
                                    </div>
                                </div>

                                {/* Matches Action Area */}
                                {reconData.suggestedMatches.length > 0 && (
                                    <div className="bg-[var(--bg-card)] border border-[var(--primary)]/30 rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                                        <div className="bg-[var(--primary)]/10 px-5 py-4 flex justify-between items-center border-b border-[var(--primary)]/20">
                                            <div className="flex items-center gap-2 text-[var(--primary)] font-medium">
                                                <CheckCircle2 className="w-5 h-5" />
                                                Review Suggested Matches
                                            </div>
                                            <button
                                                onClick={confirmMatches}
                                                className="px-4 py-2 bg-[var(--primary)] text-black font-semibold text-sm rounded-lg hover:shadow-[0_0_15px_rgba(185,255,102,0.4)] transition-all"
                                            >
                                                Confirm All Matches ({reconData.suggestedMatches.length})
                                            </button>
                                        </div>
                                        <div className="divide-y divide-[var(--border-color)]">
                                            {reconData.suggestedMatches.map((match: any, idx: number) => (
                                                <div key={idx} className="p-4 flex items-center justify-between hover:bg-[var(--bg-overlay)] transition-colors">
                                                    <div className="flex-1">
                                                        <div className="text-xs text-[var(--text-muted)] mb-1">Bank Statement Entry</div>
                                                        <div className="text-[var(--text-primary)] font-medium">{match.bankEntry.description}</div>
                                                        <div className="text-sm font-bold text-emerald-400">{formatCurrency(match.bankEntry.amount)}</div>
                                                    </div>
                                                    <div className="px-4">
                                                        <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30 font-medium">
                                                            {match.confidence} MATCH
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 text-right">
                                                        <div className="text-xs text-[var(--text-muted)] mb-1">System Transaction</div>
                                                        <div className="text-[var(--text-primary)] font-medium">{match.systemTxn.description}</div>
                                                        <div className="text-sm font-bold text-emerald-400">{formatCurrency(match.systemTxn.amount)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Unmatched Entries */}
                                {(reconData.unmatchedBankEntries.length > 0 || reconData.unmatchedSystemTxns.length > 0) && (
                                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
                                        <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-overlay)] flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-orange-400" />
                                            <h3 className="font-bold text-[var(--text-primary)]">Items Need Manual Review</h3>
                                        </div>
                                        <div className="grid grid-cols-2 divide-x divide-[var(--border-color)]">
                                            <div className="p-4 space-y-3">
                                                <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 border-b border-[var(--border-color)] pb-2">Unmatched Bank Entries</h4>
                                                {reconData.unmatchedBankEntries.length === 0 ? (
                                                    <div className="text-sm text-[var(--text-muted)] italic">No unmatched bank entries.</div>
                                                ) : (
                                                    reconData.unmatchedBankEntries.map((e: any) => (
                                                        <div key={e.id} className="p-3 bg-red-500/5 rounded border border-red-500/20">
                                                            <div className="text-[var(--text-primary)] text-sm mb-1">{e.description}</div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-[var(--text-muted)]">{new Date(e.date).toLocaleDateString()}</span>
                                                                <span className="font-bold text-red-400">{formatCurrency(e.amount)}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            <div className="p-4 space-y-3">
                                                <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 border-b border-[var(--border-color)] pb-2">Unmatched System Txns</h4>
                                                {reconData.unmatchedSystemTxns.length === 0 ? (
                                                    <div className="text-sm text-[var(--text-muted)] italic">No unmatched system txns.</div>
                                                ) : (
                                                    reconData.unmatchedSystemTxns.map((t: any) => (
                                                        <div key={t.id} className="p-3 bg-orange-500/5 rounded border border-orange-500/20">
                                                            <div className="text-[var(--text-primary)] text-sm mb-1">{t.description}</div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-[var(--text-muted)]">{new Date(t.date).toLocaleDateString()}</span>
                                                                <span className="font-bold text-orange-400">{formatCurrency(t.amount)}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

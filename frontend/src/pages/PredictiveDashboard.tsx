import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, AlertTriangle, Shield, Activity, TrendingUp, Wrench, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

interface AssetRisk {
    id: string;
    name: string;
    category: string;
    ticketCount: number;
    mtbfDays: number | null;
    riskScore: number;
    riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface FleetData {
    summary: { critical: number; high: number; medium: number; low: number };
    assets: AssetRisk[];
}

const RISK_COLORS = {
    CRITICAL: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]' },
    HIGH: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', glow: '' },
    MEDIUM: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30', glow: '' },
    LOW: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: '' },
};

export function PredictiveDashboard() {
    const [data, setData] = useState<FleetData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
    const [assetPrediction, setAssetPrediction] = useState<any>(null);
    const [predLoading, setPredLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => { fetchFleetRisk(); }, []);

    const fetchFleetRisk = async () => {
        setLoading(true);
        try {
            const res = await api.get('/maintenance/fleet-risk');
            if (res.data.success) setData(res.data.data);
        } catch (err) { console.error('Fleet risk fetch failed:', err); }
        finally { setLoading(false); }
    };

    const fetchAssetPrediction = async (assetId: string) => {
        setSelectedAsset(assetId);
        setPredLoading(true);
        try {
            const res = await api.get(`/maintenance/predictions/${assetId}`);
            if (res.data.success) setAssetPrediction(res.data.data);
        } catch (err) { console.error(err); }
        finally { setPredLoading(false); }
    };

    const totalAssets = data ? data.summary.critical + data.summary.high + data.summary.medium + data.summary.low : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <Brain className="w-7 h-7 text-purple-400" />
                        Predictive Maintenance
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        AI-powered failure predictions • MTBF analysis • Risk scoring
                    </p>
                </div>
                <button onClick={fetchFleetRisk} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-overlay)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-card)] transition-colors text-sm">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Risk Summary Cards */}
            {data && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 col-span-1"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-5 h-5 text-[var(--primary)]" />
                            <span className="text-sm text-[var(--text-secondary)]">Total Fleet</span>
                        </div>
                        <div className="text-3xl font-black text-[var(--text-primary)]">{totalAssets}</div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">Active assets monitored</div>
                    </motion.div>

                    {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((level, i) => {
                        const colors = RISK_COLORS[level];
                        const count = data.summary[level.toLowerCase() as keyof typeof data.summary];
                        return (
                            <motion.div key={level} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 1) * 0.1 }}
                                className={`${colors.bg} border ${colors.border} rounded-2xl p-5 ${colors.glow}`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    {level === 'CRITICAL' ? <AlertTriangle className={`w-5 h-5 ${colors.text}`} /> :
                                     level === 'HIGH' ? <TrendingUp className={`w-5 h-5 ${colors.text}`} /> :
                                     <Shield className={`w-5 h-5 ${colors.text}`} />}
                                    <span className={`text-sm font-semibold ${colors.text}`}>{level}</span>
                                </div>
                                <div className={`text-3xl font-black ${colors.text}`}>{count}</div>
                                <div className="text-xs text-[var(--text-muted)] mt-1">
                                    {count === 0 ? 'No assets' : count === 1 ? '1 asset' : `${count} assets`}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Fleet Risk Table */}
                <div className="lg:col-span-2">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
                        <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
                            <h2 className="font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
                                <div className="w-1.5 h-6 bg-purple-500 rounded-full" />
                                Fleet Risk Assessment
                            </h2>
                            <span className="text-xs text-[var(--text-muted)]">{totalAssets} assets</span>
                        </div>
                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10 bg-[var(--bg-card)]">
                                    <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)]">
                                        <th className="text-left p-4 font-medium">Asset</th>
                                        <th className="text-left p-4 font-medium">Category</th>
                                        <th className="text-center p-4 font-medium">Tickets</th>
                                        <th className="text-center p-4 font-medium">MTBF</th>
                                        <th className="text-center p-4 font-medium">Risk</th>
                                        <th className="text-center p-4 font-medium">Score</th>
                                        <th className="p-4 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.assets.map(asset => {
                                        const colors = RISK_COLORS[asset.riskLevel];
                                        const isSelected = selectedAsset === asset.id;
                                        return (
                                            <tr key={asset.id}
                                                onClick={() => fetchAssetPrediction(asset.id)}
                                                className={`border-b border-[var(--border-color)]/50 cursor-pointer transition-all ${isSelected ? 'bg-purple-500/10' : 'hover:bg-[var(--bg-card-hover)]'}`}
                                            >
                                                <td className="p-4">
                                                    <span className="font-medium text-[var(--text-primary)]">{asset.name}</span>
                                                </td>
                                                <td className="p-4 text-[var(--text-secondary)]">{asset.category}</td>
                                                <td className="p-4 text-center text-[var(--text-primary)] font-semibold">{asset.ticketCount}</td>
                                                <td className="p-4 text-center text-[var(--text-secondary)]">
                                                    {asset.mtbfDays ? `${asset.mtbfDays}d` : '—'}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                                                        {asset.riskLevel}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-16 h-2 bg-[var(--bg-overlay)] rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${asset.riskScore > 70 ? 'bg-red-500' : asset.riskScore > 50 ? 'bg-orange-500' : asset.riskScore > 30 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                                                                style={{ width: `${Math.min(100, asset.riskScore)}%` }} />
                                                        </div>
                                                        <span className="text-xs text-[var(--text-muted)] w-8">{asset.riskScore}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <ChevronRight className={`w-4 h-4 transition-colors ${isSelected ? 'text-purple-400' : 'text-[var(--text-muted)]'}`} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {(!data?.assets || data.assets.length === 0) && (
                                        <tr>
                                            <td colSpan={7} className="p-12 text-center text-[var(--text-muted)]">
                                                No active assets with maintenance history found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Prediction Detail Panel */}
                <div className="lg:col-span-1">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 sticky top-4 min-h-[400px]">
                        {!selectedAsset ? (
                            <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-center">
                                <Brain className="w-12 h-12 text-[var(--text-muted)] mb-4 opacity-30" />
                                <p className="text-[var(--text-secondary)] font-medium">Select an asset</p>
                                <p className="text-sm text-[var(--text-muted)] mt-1">Click any row to see AI predictions</p>
                            </div>
                        ) : predLoading ? (
                            <div className="flex items-center justify-center h-full min-h-[350px]">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                            </div>
                        ) : assetPrediction ? (
                            <div className="space-y-5">
                                <div>
                                    <h3 className="font-bold text-lg text-[var(--text-primary)]">{assetPrediction.asset?.name}</h3>
                                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">{assetPrediction.asset?.category}</p>
                                </div>

                                {/* Statistics */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[var(--bg-overlay)] rounded-xl p-3 border border-[var(--border-color)]">
                                        <div className="text-xs text-[var(--text-muted)] mb-1">Total Tickets</div>
                                        <div className="text-xl font-bold text-[var(--text-primary)]">{assetPrediction.statistics?.totalTickets || 0}</div>
                                    </div>
                                    <div className="bg-[var(--bg-overlay)] rounded-xl p-3 border border-[var(--border-color)]">
                                        <div className="text-xs text-[var(--text-muted)] mb-1">MTBF</div>
                                        <div className="text-xl font-bold text-[var(--text-primary)]">
                                            {assetPrediction.statistics?.mtbfDays ? `${assetPrediction.statistics.mtbfDays}d` : 'N/A'}
                                        </div>
                                    </div>
                                    <div className="bg-[var(--bg-overlay)] rounded-xl p-3 border border-[var(--border-color)]">
                                        <div className="text-xs text-[var(--text-muted)] mb-1">Total Cost</div>
                                        <div className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(assetPrediction.statistics?.totalCost || 0)}</div>
                                    </div>
                                    <div className="bg-[var(--bg-overlay)] rounded-xl p-3 border border-[var(--border-color)]">
                                        <div className="text-xs text-[var(--text-muted)] mb-1">Avg Cost/Ticket</div>
                                        <div className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(assetPrediction.statistics?.avgCostPerTicket || 0)}</div>
                                    </div>
                                </div>

                                {/* Prediction */}
                                {assetPrediction.prediction && (
                                    <div className={`rounded-xl p-4 border ${assetPrediction.prediction.overdue ? 'bg-red-500/10 border-red-500/30' : 'bg-purple-500/10 border-purple-500/30'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Brain className={`w-5 h-5 ${assetPrediction.prediction.overdue ? 'text-red-400' : 'text-purple-400'}`} />
                                            <span className="text-sm font-bold text-[var(--text-primary)]">Next Failure Prediction</span>
                                        </div>
                                        <div className={`text-2xl font-black ${assetPrediction.prediction.overdue ? 'text-red-400' : 'text-purple-400'}`}>
                                            {assetPrediction.prediction.overdue ? 'OVERDUE' : new Date(assetPrediction.prediction.nextFailureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${assetPrediction.prediction.confidence === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400' : assetPrediction.prediction.confidence === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                                {assetPrediction.prediction.confidence} Confidence
                                            </span>
                                            {assetPrediction.prediction.rSquared !== undefined && (
                                                <span className="text-xs text-[var(--text-muted)]">R² = {assetPrediction.prediction.rSquared}</span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Risk */}
                                {assetPrediction.risk && (
                                    <div className={`rounded-xl p-4 border ${RISK_COLORS[assetPrediction.risk.level as keyof typeof RISK_COLORS]?.bg} ${RISK_COLORS[assetPrediction.risk.level as keyof typeof RISK_COLORS]?.border}`}>
                                        <div className="text-xs text-[var(--text-muted)] mb-1">Risk Assessment</div>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-xl font-black ${RISK_COLORS[assetPrediction.risk.level as keyof typeof RISK_COLORS]?.text}`}>
                                                {assetPrediction.risk.level}
                                            </span>
                                            <span className="text-sm text-[var(--text-secondary)]">Score: {assetPrediction.risk.score}/100</span>
                                        </div>
                                    </div>
                                )}

                                {/* Recommended Actions */}
                                {assetPrediction.recommendedActions?.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                                            <Wrench className="w-4 h-4 text-[var(--primary)]" /> Recommended Actions
                                        </h4>
                                        <ul className="space-y-2">
                                            {assetPrediction.recommendedActions.map((action: string, i: number) => (
                                                <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] mt-1.5 shrink-0" />
                                                    {action}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <button onClick={() => navigate(`/assets/${selectedAsset}`)}
                                    className="w-full py-2.5 rounded-xl bg-purple-500/20 text-purple-400 font-semibold text-sm hover:bg-purple-500/30 transition-colors border border-purple-500/30">
                                    View Asset Details →
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

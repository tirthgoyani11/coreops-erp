import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Upload, Columns, X, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { AssetStats } from '../components/assets/AssetStats';
import { AssetFilters } from '../components/assets/AssetFilters';
import { AssetTable } from '../components/assets/AssetTable';
import { AssetOverview } from '../components/assets/detail/AssetOverview';

interface Asset {
    id: string;
    guai: string;
    name: string;
    category: string;
    status: string;
    serialNumber: string;
    location: {
        building: string;
        floor: string;
        room: string;
        officeId: {
            id: string;
            name: string;
            code: string;
        };
    };
    qrCode?: string;
    officeId: {
        id: string;
        name: string;
    };
}

export function AssetList() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'card' | 'map' | 'calendar'>('table');
    const [isSplitView, setIsSplitView] = useState(false);
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
    const [selectedAssetDetail, setSelectedAssetDetail] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Import state
    const [importModal, setImportModal] = useState(false);
    const [importResult, setImportResult] = useState<any>(null);
    const [importLoading, setImportLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const canEdit = ['SUPER_ADMIN', 'MANAGER'].includes(user?.role || '');

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const res = await api.get('/assets');
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
            setAssets(data);
        } catch (error) {
            console.error("Failed to fetch assets", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    // Fetch detail when selectedAssetId changes
    useEffect(() => {
        if (!selectedAssetId) {
            setSelectedAssetDetail(null);
            return;
        }

        const fetchDetail = async () => {
            try {
                setLoadingDetail(true);
                const res = await api.get(`/assets/${selectedAssetId}`);
                const assetData = res.data.data || res.data;
                setSelectedAssetDetail(assetData);
            } catch (error) {
                console.error("Failed to fetch asset detail", error);
            } finally {
                setLoadingDetail(false);
            }
        };

        fetchDetail();
    }, [selectedAssetId]);

    const filteredAssets = assets.filter(asset => {
        const matchesSearch =
            asset.name.toLowerCase().includes(search.toLowerCase()) ||
            asset.guai.toLowerCase().includes(search.toLowerCase()) ||
            asset.serialNumber?.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter ? asset.status === statusFilter : true;

        return matchesSearch && matchesStatus;
    });

    const handleBulkDelete = async (ids: string[]) => {
        if (!confirm(`Are you sure you want to delete ${ids.length} assets? This action cannot be undone.`)) return;

        try {
            await api.post('/assets/bulk-delete', { ids });
            fetchAssets();
        } catch (error) {
            console.error("Failed to delete assets", error);
            alert("Failed to delete some assets. Please try again.");
        }
    };

    // CSV Export
    const handleExport = async () => {
        try {
            const res = await api.get('/assets/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `assets-export-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export", error);
            alert("Export failed. Please try again.");
        }
    };

    // CSV Import
    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportLoading(true);
        setImportResult(null);

        try {
            const text = await file.text();
            const res = await api.post('/assets/import', { csvData: text });
            setImportResult(res.data.data || res.data);
            fetchAssets(); // Refresh list
        } catch (error: any) {
            setImportResult({ created: 0, errors: [{ row: 0, error: error.response?.data?.message || 'Import failed' }] });
        } finally {
            setImportLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 h-[calc(100vh-100px)] flex flex-col"
        >
            {/* 1. Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-10 bg-gradient-to-b from-[var(--primary)] to-transparent rounded-full shadow-[0_0_15px_var(--primary)]" />
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Asset Management</h1>
                        <p className="text-[var(--text-secondary)]">Track, audit, and manage organization assets.</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    {/* Split View Toggle */}
                    <button
                        onClick={() => {
                            setIsSplitView(!isSplitView);
                            if (isSplitView) setSelectedAssetId(null);
                        }}
                        className={`flex items-center gap-2 px-3 py-2.5 bg-[var(--bg-card)] border ${isSplitView ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-[var(--border-color)] text-[var(--text-secondary)]'} rounded-xl hover:text-[var(--text-primary)] transition-all font-medium`}
                        title="Toggle Split View"
                    >
                        <Columns size={18} />
                    </button>

                    {/* Import Button */}
                    {canEdit && (
                        <button
                            onClick={() => setImportModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl hover:text-[var(--text-primary)] hover:border-[var(--primary)]/50 transition-all font-medium"
                        >
                            <Upload size={18} />
                            <span className="hidden sm:inline">Import</span>
                        </button>
                    )}

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl hover:text-[var(--text-primary)] hover:border-[var(--primary)]/50 transition-all font-medium"
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline">Export</span>
                    </button>

                    {/* Create Button */}
                    {canEdit && (
                        <button
                            onClick={() => navigate('/assets/new')}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-black font-bold rounded-xl hover:opacity-90 transition-all active:scale-95 hover:shadow-[0_0_20px_rgba(185,255,102,0.4)]"
                        >
                            <Plus size={20} />
                            <span>Create Asset</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Stats Section */}
            {!isSplitView && (
                <div className="shrink-0">
                    <AssetStats assets={assets} loading={loading} />
                </div>
            )}

            {/* 3. Filters */}
            <div className="shrink-0">
                <AssetFilters
                    search={search}
                    setSearch={setSearch}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                />
            </div>

            {/* 4. Split View Layout */}
            <div className={`flex flex-1 gap-6 min-h-0 ${isSplitView ? 'overflow-hidden' : ''}`}>

                {/* Left Side (Table) */}
                <div className={`transition-all duration-300 ${isSplitView && selectedAssetId ? 'w-[60%]' : 'w-full'}`}>
                    <div className="flex-1 overflow-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                        {viewMode === 'table' ? (
                            <AssetTable
                                data={filteredAssets}
                                loading={loading}
                                onAssetClick={isSplitView ? setSelectedAssetId : undefined}
                                onBulkDelete={handleBulkDelete}
                                onRefresh={fetchAssets}
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto p-1">
                                <p className="text-gray-500">Card view coming soon...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side (Detail Pane) */}
                <AnimatePresence>
                    {isSplitView && selectedAssetId && (
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            className="w-1/2 flex flex-col bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-card-hover)]/50">
                                <h3 className="font-semibold text-lg text-[var(--text-primary)]">Quick Preview</h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => navigate(`/assets/${selectedAssetId}`)}
                                        className="text-xs text-[var(--primary)] hover:underline"
                                    >
                                        Open Full Page
                                    </button>
                                    <button
                                        onClick={() => setSelectedAssetId(null)}
                                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {loadingDetail ? (
                                    <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
                                        Loading details...
                                    </div>
                                ) : selectedAssetDetail ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card-hover)] flex items-center justify-center text-[var(--text-secondary)] border border-[var(--border-color)] text-2xl">
                                                {selectedAssetDetail.name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-[var(--text-primary)]">{selectedAssetDetail.name || 'Unknown Asset'}</h2>
                                                <p className="font-mono text-sm text-[var(--primary)]">{selectedAssetDetail.guai || 'No GUAI'}</p>
                                            </div>
                                        </div>

                                        <AssetOverview asset={selectedAssetDetail} />
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
                                        Asset not found.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Empty State for Right Pane */}
                    {isSplitView && !selectedAssetId && (
                        <div className="w-1/2 flex items-center justify-center border border-[var(--border-color)] border-dashed rounded-2xl bg-[var(--bg-card)]/50 text-[var(--text-secondary)]">
                            <p>Select an asset to view details</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Import Modal */}
            <AnimatePresence>
                {importModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
                        onClick={() => { setImportModal(false); setImportResult(null); }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-lg shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    <FileSpreadsheet size={20} className="text-[var(--primary)]" />
                                    Import Assets from CSV
                                </h3>
                                <button onClick={() => { setImportModal(false); setImportResult(null); }} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                                    <X size={20} />
                                </button>
                            </div>

                            {!importResult ? (
                                <div className="space-y-4">
                                    <div className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 text-center hover:border-[var(--primary)]/50 transition-colors">
                                        <FileSpreadsheet size={40} className="mx-auto text-[var(--text-secondary)] mb-3" />
                                        <p className="text-sm text-[var(--text-secondary)] mb-4">
                                            Upload a CSV file with columns:<br />
                                            <span className="font-mono text-xs">Name, Category, Status, Serial Number, Manufacturer, Model, Building, Floor, Room, Purchase Price, Currency</span>
                                        </p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv"
                                            onChange={handleImportFile}
                                            className="hidden"
                                            id="csv-import"
                                        />
                                        <label
                                            htmlFor="csv-import"
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-black font-bold rounded-xl cursor-pointer hover:opacity-90 transition-all"
                                        >
                                            {importLoading ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    Importing...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={18} />
                                                    Choose CSV File
                                                </>
                                            )}
                                        </label>
                                    </div>

                                    <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-card-hover)] p-3 rounded-lg">
                                        <strong>Tip:</strong> Export your current assets first to see the expected CSV format.
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Success summary */}
                                    <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                        <CheckCircle size={24} className="text-green-400" />
                                        <div>
                                            <p className="text-sm font-semibold text-green-400">{importResult.created} asset(s) imported successfully</p>
                                        </div>
                                    </div>

                                    {/* Errors */}
                                    {importResult.errors?.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-red-400 flex items-center gap-2">
                                                <AlertTriangle size={16} />
                                                {importResult.errors.length} error(s)
                                            </p>
                                            <div className="max-h-40 overflow-y-auto space-y-1 bg-[var(--bg-card-hover)] p-3 rounded-lg">
                                                {importResult.errors.map((err: any, i: number) => (
                                                    <p key={i} className="text-xs text-[var(--text-secondary)]">
                                                        <span className="font-mono text-red-400">Row {err.row}:</span> {err.error}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => { setImportModal(false); setImportResult(null); }}
                                        className="w-full py-3 bg-[var(--primary)] text-black font-bold rounded-xl hover:opacity-90 transition-all"
                                    >
                                        Done
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default AssetList;

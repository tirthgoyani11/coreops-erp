import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, CreditCard, Edit, QrCode,
    History, LayoutDashboard, FileText, Loader2,
    Calendar, MapPin, Tag, LogIn, LogOut, X,
    Upload, Download, Trash2
} from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/authStore';

// Tabs
import { AssetOverview } from '../components/assets/detail/AssetOverview';
import { AssetFinancials } from '../components/assets/detail/AssetFinancials';
import { AssetHistory } from '../components/assets/detail/AssetHistory';

export function AssetDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [asset, setAsset] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Check-out modal
    const [checkoutModal, setCheckoutModal] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // QR modal
    const [qrModal, setQrModal] = useState(false);

    // Document upload
    const [documents, setDocuments] = useState<{ name: string; url: string; uploadedAt: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const canEdit = ['SUPER_ADMIN', 'MANAGER'].includes(user?.role || '');

    const fetchAsset = async () => {
        try {
            const res = await api.get(`/assets/${id}`);
            const data = res.data.data || res.data;
            setAsset(data);
            // Load images as documents
            if (data.images && data.images.length > 0) {
                setDocuments(data.images.map((img: any) => ({
                    name: img.caption || 'Document',
                    url: img.url,
                    uploadedAt: img.uploadedAt || data.createdAt
                })));
            }
        } catch (error) {
            console.error("Failed to fetch asset", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchAsset();
    }, [id]);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/assets/users');
            setUsers(res.data.data || []);
        } catch (e) {
            console.error("Failed to fetch users", e);
        }
    };

    const handleCheckout = async () => {
        if (!selectedUserId) return;
        setActionLoading(true);
        try {
            await api.post(`/assets/${id}/checkout`, { userId: selectedUserId });
            setCheckoutModal(false);
            setSelectedUserId('');
            fetchAsset();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Check-out failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckin = async () => {
        if (!confirm('Check in this asset? It will be unassigned from the current user.')) return;
        setActionLoading(true);
        try {
            await api.post(`/assets/${id}/checkin`);
            fetchAsset();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Check-in failed');
        } finally {
            setActionLoading(false);
        }
    };

    // Document upload handler
    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        for (const file of Array.from(files)) {
            // Convert to base64 data URL for inline storage
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const dataUrl = ev.target?.result as string;
                const newDoc = {
                    name: file.name,
                    url: dataUrl,
                    uploadedAt: new Date().toISOString()
                };

                // Save to backend as image attachment
                try {
                    await api.patch(`/assets/${id}`, {
                        images: [...(asset.images || []), { url: dataUrl, caption: file.name, uploadedAt: new Date() }]
                    });
                    setDocuments(prev => [...prev, newDoc]);
                    fetchAsset();
                } catch (err) {
                    console.error("Upload failed", err);
                    alert("Failed to upload document. File might be too large.");
                }
            };
            reader.readAsDataURL(file);
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDocDelete = async (index: number) => {
        if (!confirm('Remove this document?')) return;
        try {
            const updatedImages = [...(asset.images || [])];
            updatedImages.splice(index, 1);
            await api.patch(`/assets/${id}`, { images: updatedImages });
            setDocuments(prev => prev.filter((_, i) => i !== index));
            fetchAsset();
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    // QR Code download
    const downloadQR = () => {
        if (!asset?.qrCode) return;
        const link = document.createElement('a');
        link.href = asset.qrCode;
        link.download = `${asset.guai || asset.name}-qr.png`;
        link.click();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-[var(--primary)]" size={40} />
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="text-center py-20 text-[var(--text-secondary)]">
                Asset not found.
            </div>
        );
    }

    const isCheckedOut = !!asset.location?.assignedTo;

    const TABS = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'financial', label: 'Financials', icon: CreditCard },
        { id: 'history', label: 'History & Audit', icon: History },
        { id: 'docs', label: 'Documents', icon: FileText },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8 pb-20"
        >
            {/* 1. Header Navigation */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/assets')}
                    className="p-2 rounded-full hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="flex-1">
                    <p className="text-sm text-[var(--text-secondary)] mb-1">Asset Detail View</p>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        {asset.name}
                        <span className={`text-xs px-2 py-0.5 rounded border ${asset.status === 'ACTIVE' ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30' :
                            'bg-gray-500/10 text-gray-400 border-gray-500/30'
                            }`}>
                            {asset.status}
                        </span>
                    </h1>
                </div>
                <div className="flex gap-2">
                    {canEdit && (
                        <>
                            {/* Check-In / Check-Out Buttons */}
                            {isCheckedOut ? (
                                <button
                                    onClick={handleCheckin}
                                    disabled={actionLoading}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors font-medium"
                                >
                                    <LogIn size={18} />
                                    <span className="hidden sm:inline">Check In</span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        fetchUsers();
                                        setCheckoutModal(true);
                                    }}
                                    disabled={actionLoading}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors font-medium"
                                >
                                    <LogOut size={18} />
                                    <span className="hidden sm:inline">Check Out</span>
                                </button>
                            )}

                            <button
                                onClick={() => setQrModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:text-[var(--text-primary)] hover:border-[var(--primary)]/50 transition-colors"
                            >
                                <QrCode size={18} /> <span className="hidden sm:inline">QR Code</span>
                            </button>
                            <button
                                onClick={() => navigate(`/assets/${id}/edit`)}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-black font-bold rounded-lg hover:opacity-90 transition-colors"
                            >
                                <Edit size={18} /> <span className="hidden sm:inline">Edit</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* 2. Holographic Stats Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-card-hover)] border border-[var(--border-color)] p-6 md:p-8">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <QrCode size={200} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
                    <div className="md:col-span-1">
                        <p className="text-sm text-[var(--text-secondary)] font-medium mb-1">GUAI (Unique ID)</p>
                        <p className="text-2xl font-mono text-[var(--primary)] tracking-wider font-bold">{asset.guai}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                            <Tag size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Category</p>
                            <p className="text-lg font-semibold text-[var(--text-primary)]">{asset.category}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Location</p>
                            <p className="text-lg font-semibold text-[var(--text-primary)]">{asset.officeId?.name || 'Unassigned'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Purchase Date</p>
                            <p className="text-lg font-semibold text-[var(--text-primary)]">
                                {new Date(asset.purchaseInfo?.purchaseDate || asset.purchaseDate || asset.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Tabs Navigation */}
            <div className="border-b border-[var(--border-color)] flex gap-6 overflow-x-auto">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 pb-4 px-2 text-sm font-medium transition-all relative whitespace-nowrap",
                                isActive ? "text-[var(--primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            )}
                        >
                            <Icon size={18} />
                            {tab.label}
                            {tab.id === 'docs' && documents.length > 0 && (
                                <span className="bg-[var(--primary)]/20 text-[var(--primary)] text-xs px-1.5 py-0.5 rounded-full font-bold">{documents.length}</span>
                            )}
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] shadow-[0_0_10px_var(--primary)]"
                                />
                            )}
                        </button>
                    )
                })}
            </div>

            {/* 4. Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && <AssetOverview asset={asset} />}
                {activeTab === 'financial' && <AssetFinancials asset={asset} />}
                {activeTab === 'history' && <AssetHistory asset={asset} />}
                {activeTab === 'docs' && (
                    <div className="space-y-6">
                        {/* Upload Area */}
                        {canEdit && (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center justify-center py-12 text-[var(--text-secondary)] bg-[var(--bg-card)] rounded-3xl border-2 border-dashed border-[var(--border-color)] hover:border-[var(--primary)]/50 cursor-pointer transition-colors group"
                            >
                                <Upload size={40} className="mb-3 opacity-50 group-hover:opacity-100 group-hover:text-[var(--primary)] transition-all" />
                                <p className="text-sm font-medium group-hover:text-[var(--text-primary)]">Click to upload documents, manuals, or invoices</p>
                                <p className="text-xs mt-1">PDF, images, or any file up to 5MB</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                    onChange={handleDocUpload}
                                    className="hidden"
                                />
                            </div>
                        )}

                        {/* Document List */}
                        {documents.length > 0 ? (
                            <div className="space-y-3">
                                {documents.map((doc, i) => (
                                    <div key={i} className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 hover:border-[var(--primary)]/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-primary)]">{doc.name}</p>
                                                <p className="text-xs text-[var(--text-secondary)]">Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {doc.url && (
                                                <a
                                                    href={doc.url}
                                                    download={doc.name}
                                                    className="p-2 text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                                                    title="Download"
                                                >
                                                    <Download size={16} />
                                                </a>
                                            )}
                                            {canEdit && (
                                                <button
                                                    onClick={() => handleDocDelete(i)}
                                                    className="p-2 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : !canEdit ? (
                            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)] bg-[var(--bg-card)] rounded-3xl border border-dashed border-[var(--border-color)]">
                                <FileText size={48} className="mb-4 opacity-50" />
                                <p className="text-lg font-medium">No documents attached</p>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            {/* Check-Out Modal */}
            <AnimatePresence>
                {checkoutModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
                        onClick={() => setCheckoutModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-md shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    <LogOut size={20} className="text-blue-400" />
                                    Check Out Asset
                                </h3>
                                <button onClick={() => setCheckoutModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                                    <X size={20} />
                                </button>
                            </div>

                            <p className="text-sm text-[var(--text-secondary)] mb-4">Assign <strong className="text-[var(--text-primary)]">{asset.name}</strong> to a user:</p>

                            <select
                                value={selectedUserId}
                                onChange={e => setSelectedUserId(e.target.value)}
                                className="w-full px-4 py-3 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--text-primary)] appearance-none cursor-pointer mb-4"
                            >
                                <option value="">Select a user...</option>
                                {users.map(u => (
                                    <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                                ))}
                            </select>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setCheckoutModal(false)}
                                    className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCheckout}
                                    disabled={!selectedUserId || actionLoading}
                                    className="px-6 py-2 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {actionLoading ? 'Checking out...' : 'Check Out'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* QR Code Modal */}
            <AnimatePresence>
                {qrModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
                        onClick={() => setQrModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    <QrCode size={20} className="text-[var(--primary)]" />
                                    Asset QR Code
                                </h3>
                                <button onClick={() => setQrModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                                    <X size={20} />
                                </button>
                            </div>

                            {asset.qrCode ? (
                                <>
                                    <div className="bg-white rounded-2xl p-6 inline-block mb-4">
                                        <img src={asset.qrCode} alt="Asset QR Code" className="w-48 h-48" />
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)] mb-1 font-mono">{asset.guai}</p>
                                    <p className="text-xs text-[var(--text-secondary)] mb-6">{asset.name}</p>
                                    <button
                                        onClick={downloadQR}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-black font-bold rounded-xl hover:opacity-90 transition-all mx-auto"
                                    >
                                        <Download size={18} />
                                        Download QR
                                    </button>
                                </>
                            ) : (
                                <div className="py-8">
                                    <QrCode size={64} className="mx-auto text-[var(--text-secondary)] opacity-30 mb-4" />
                                    <p className="text-sm text-[var(--text-secondary)]">QR code not yet generated.</p>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">This may occur for assets created before QR auto-generation was enabled.</p>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default AssetDetail;

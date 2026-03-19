import { useState, useEffect, useMemo } from 'react';
import api from '../lib/api';
import { toast } from 'sonner';
import {
    FileText, Search, Upload, Download,
    Trash2, File, FileCode, FileSpreadsheet, FileImage,
    Filter, Grid3X3, List, ChevronLeft, ChevronRight, Eye
} from 'lucide-react';
import { formatFileSize } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ['ALL', 'GENERAL', 'ASSET', 'MAINTENANCE', 'INVOICE', 'CONTRACT', 'POLICY', 'OTHER'];

type DocumentItem = {
    id: string;
    name: string;
    category: string;
    size: number;
    mimeType: string;
    createdAt: string;
    url: string;
    uploadedBy?: { name?: string };
};

type ViewMode = 'grid' | 'list';

const FileIcon = ({ mimeType }: { mimeType: string }) => {
    if (mimeType.includes('image')) return <FileImage className="text-purple-500" />;
    if (mimeType.includes('pdf')) return <FileText className="text-red-500" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return <FileSpreadsheet className="text-green-500" />;
    if (mimeType.includes('code') || mimeType.includes('json')) return <FileCode className="text-slate-500" />;
    return <File className="text-[var(--muted-foreground)]" />;
};

export default function Documents() {
    const navigate = useNavigate();
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [category, setCategory] = useState('ALL');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 20;

    useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
        }, 250);
        return () => clearTimeout(timeout);
    }, [search]);

    useEffect(() => {
        loadDocuments();
    }, [page, category, debouncedSearch]);

    const loadDocuments = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(category !== 'ALL' && { category }),
                ...(debouncedSearch && { search: debouncedSearch })
            });
            const res = await api.get(`/documents?${params}`);
            setDocuments(Array.isArray(res.data?.data) ? res.data.data : []);
            const pagination = res.data?.pagination;
            setTotal(Number(pagination?.total) || 0);
            setTotalPages(Number(pagination?.pages) || 1);
        } catch (error) {
            toast.error('Failed to load documents');
            setDocuments([]);
            setTotal(0);
            setTotalPages(1);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        try {
            await api.delete(`/documents/${id}`);
            toast.success('Document deleted');
            loadDocuments();
        } catch (error) {
            toast.error('Failed to delete document');
        }
    };

    const fetchDocumentBlob = async (docId: string) => {
        const res = await api.get(`/documents/${docId}/download`, {
            responseType: 'blob',
        });
        return res.data as Blob;
    };

    const handlePreview = async (doc: DocumentItem) => {
        const previewWindow = window.open('', '_blank', 'noopener,noreferrer');
        try {
            const blob = await fetchDocumentBlob(doc.id);
            const objectUrl = URL.createObjectURL(blob);

            if (previewWindow) {
                previewWindow.location.href = objectUrl;
            } else {
                window.open(objectUrl, '_blank', 'noopener,noreferrer');
            }

            setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
        } catch (error) {
            if (previewWindow) previewWindow.close();
            toast.error('Failed to preview document');
        }
    };

    const handleDownload = async (doc: DocumentItem) => {
        try {
            const blob = await fetchDocumentBlob(doc.id);
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = doc.name;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            toast.error('Failed to download document');
        }
    };

    const pageTotalSize = useMemo(
        () => documents.reduce((sum, doc) => sum + (Number(doc.size) || 0), 0),
        [documents]
    );

    const activeFilters = useMemo(() => {
        let count = 0;
        if (category !== 'ALL') count += 1;
        if (debouncedSearch) count += 1;
        return count;
    }, [category, debouncedSearch]);

    const clearFilters = () => {
        setCategory('ALL');
        setSearch('');
        setDebouncedSearch('');
        setPage(1);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Documents</h1>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">Track files, categories, and ownership across your office.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md border ${viewMode === 'grid' ? 'bg-[var(--primary)] text-black border-[var(--primary)]' : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                        title="Grid view"
                    >
                        <Grid3X3 size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md border ${viewMode === 'list' ? 'bg-[var(--primary)] text-black border-[var(--primary)]' : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                        title="List view"
                    >
                        <List size={16} />
                    </button>
                    <button
                        onClick={() => navigate('/documents/upload')}
                        className="ml-auto sm:ml-0 flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-black font-semibold rounded-md shadow-[0_0_10px_var(--primary-glow)] hover:bg-[var(--primary)]/90"
                    >
                        <Upload size={16} /> Upload Files
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                    <p className="text-xs text-[var(--muted-foreground)]">Total Documents</p>
                    <p className="text-2xl font-semibold mt-1">{total}</p>
                </div>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                    <p className="text-xs text-[var(--muted-foreground)]">Current Page</p>
                    <p className="text-2xl font-semibold mt-1">{documents.length}</p>
                </div>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                    <p className="text-xs text-[var(--muted-foreground)]">Page Storage</p>
                    <p className="text-2xl font-semibold mt-1">{formatFileSize(pageTotalSize)}</p>
                </div>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                    <p className="text-xs text-[var(--muted-foreground)]">Active Category</p>
                    <p className="text-2xl font-semibold mt-1">{category}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={18} />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        className="w-full pl-10 pr-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-md"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => { setCategory(cat); setPage(1); }}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${category === cat
                                ? 'bg-[var(--primary)] text-black border-[var(--primary)] shadow-[0_0_10px_var(--primary-glow)]'
                                : 'bg-[var(--muted)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--border)]'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <button
                    onClick={clearFilters}
                    disabled={activeFilters === 0}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Filter size={14} /> Clear
                </button>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="text-center py-20 text-[var(--muted-foreground)]">Loading documents...</div>
            ) : documents.length === 0 ? (
                <div className="text-center py-20 text-[var(--muted-foreground)] border-2 border-dashed border-[var(--border)] rounded-xl">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No documents found</p>
                    <p className="text-sm">Upload a file to get started</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {documents.map(doc => (
                        <div key={doc.id} className="group bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:shadow-md transition-shadow relative">
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-3 bg-[var(--muted)] rounded-lg">
                                    <FileIcon mimeType={doc.mimeType} />
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePreview(doc); }}
                                        className="p-1.5 hover:bg-[var(--muted)] rounded-md text-blue-500"
                                        title="Preview"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                                        className="p-1.5 hover:bg-[var(--muted)] rounded-md text-emerald-500"
                                        title="Download"
                                    >
                                        <Download size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                                        className="p-1.5 hover:bg-[var(--muted)] rounded-md text-red-500"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="font-medium truncate pr-6 cursor-pointer hover:text-[var(--primary)]" onClick={() => navigate(`/documents/${doc.id}`)}>
                                {doc.name}
                            </h3>

                            <div className="mt-2 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                                <span className="bg-[var(--muted)] px-1.5 py-0.5 rounded">{doc.category}</span>
                                <span>•</span>
                                <span>{formatFileSize(doc.size)}</span>
                            </div>

                            <div className="mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)] flex justify-between">
                                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                <span>by {doc.uploadedBy?.name?.split(' ')[0]}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--muted)]/50 text-[var(--muted-foreground)]">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium">Name</th>
                                    <th className="text-left px-4 py-3 font-medium">Category</th>
                                    <th className="text-left px-4 py-3 font-medium">Size</th>
                                    <th className="text-left px-4 py-3 font-medium">Uploaded</th>
                                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.map((doc) => (
                                    <tr key={doc.id} className="border-t border-[var(--border)] hover:bg-[var(--muted)]/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => navigate(`/documents/${doc.id}`)}
                                                className="font-medium hover:text-[var(--primary)] text-left"
                                            >
                                                {doc.name}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs px-2 py-1 rounded bg-[var(--muted)]">{doc.category}</span>
                                        </td>
                                        <td className="px-4 py-3 text-[var(--muted-foreground)]">{formatFileSize(doc.size)}</td>
                                        <td className="px-4 py-3 text-[var(--muted-foreground)]">{new Date(doc.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handlePreview(doc)}
                                                    className="p-1.5 hover:bg-[var(--muted)] rounded-md text-blue-500"
                                                    title="Preview"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(doc)}
                                                    className="p-1.5 hover:bg-[var(--muted)] rounded-md text-emerald-500"
                                                    title="Download"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(doc.id)}
                                                    className="p-1.5 hover:bg-[var(--muted)] rounded-md text-red-500"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3">
                <p className="text-sm text-[var(--muted-foreground)]">
                    Showing {documents.length === 0 ? 0 : (page - 1) * limit + 1}-{(page - 1) * limit + documents.length} of {total}
                </p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                        disabled={page <= 1 || isLoading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[var(--border)] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={14} /> Prev
                    </button>
                    <span className="text-sm text-[var(--muted-foreground)]">Page {page} of {totalPages}</span>
                    <button
                        onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={page >= totalPages || isLoading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[var(--border)] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'sonner';
import {
    FileText, Search, Upload, Download,
    Trash2, File, FileCode, FileSpreadsheet, FileImage
} from 'lucide-react';
import { formatFileSize } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ['ALL', 'GENERAL', 'ASSET', 'MAINTENANCE', 'INVOICE', 'CONTRACT', 'POLICY', 'OTHER'];

const FileIcon = ({ mimeType }: { mimeType: string }) => {
    if (mimeType.includes('image')) return <FileImage className="text-purple-500" />;
    if (mimeType.includes('pdf')) return <FileText className="text-red-500" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return <FileSpreadsheet className="text-green-500" />;
    if (mimeType.includes('code') || mimeType.includes('json')) return <FileCode className="text-slate-500" />;
    return <File className="text-[var(--muted-foreground)]" />;
};

export default function Documents() {
    const navigate = useNavigate();
    const [documents, setDocuments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('ALL');
    const [page, setPage] = useState(1);


    useEffect(() => {
        loadDocuments();
    }, [page, category, search]);

    const loadDocuments = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                ...(category !== 'ALL' && { category }),
                ...(search && { search })
            });
            const res = await api.get(`/documents?${params}`);
            setDocuments(res.data.data);
        } catch (error) {
            toast.error('Failed to load documents');
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

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold">Documents</h1>
                <button
                    onClick={() => navigate('/documents/upload')}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-black font-semibold rounded-md shadow-[0_0_10px_var(--primary-glow)] hover:bg-[var(--primary)]/90"
                >
                    <Upload size={16} /> Upload Files
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
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
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {documents.map(doc => (
                        <div key={doc.id} className="group bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:shadow-md transition-shadow relative">
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-3 bg-[var(--muted)] rounded-lg">
                                    <FileIcon mimeType={doc.mimeType} />
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <a
                                        href={`/api/documents/${doc.id}/download`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 hover:bg-[var(--muted)] rounded-md text-blue-500"
                                        title="Download"
                                    >
                                        <Download size={16} />
                                    </a>
                                    <button
                                        onClick={() => handleDelete(doc.id)}
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
            )}

            {/* Pagination would go here */}
        </div>
    );
}

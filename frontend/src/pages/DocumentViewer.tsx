import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Download, ExternalLink, Calendar, User, Tag, FileText, Loader2 } from 'lucide-react';

export default function DocumentViewer() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [doc, setDoc] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDocument();
    }, [id]);

    const loadDocument = async () => {
        try {
            const res = await api.get(`/documents/${id}`);
            setDoc(res.data.data);
        } catch (error) {
            toast.error('Failed to load document');
            navigate('/documents');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    if (!doc) return null;

    const downloadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/documents/${id}/download`;

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row">
            {/* Sidebar Metadata */}
            <div className="w-full md:w-80 border-r border-[var(--border)] bg-[var(--card)] p-6 overflow-y-auto">
                <button
                    onClick={() => navigate('/documents')}
                    className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6"
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <div className="mb-6">
                    <h1 className="text-xl font-bold break-words">{doc.name}</h1>
                    <span className="inline-block mt-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                        {doc.category}
                    </span>
                </div>

                <div className="space-y-6">
                    <div className="space-y-4 text-sm">
                        <div className="flex items-center gap-3 text-[var(--muted-foreground)]">
                            <Calendar size={16} />
                            <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[var(--muted-foreground)]">
                            <User size={16} />
                            <span>{doc.uploadedBy?.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[var(--muted-foreground)]">
                            <FileText size={16} />
                            <span>{(doc.size / 1024).toFixed(1)} KB</span>
                        </div>
                    </div>

                    {doc.description && (
                        <div>
                            <h3 className="text-sm font-medium mb-2">Description</h3>
                            <p className="text-sm text-[var(--muted-foreground)]">{doc.description}</p>
                        </div>
                    )}

                    {doc.tags && doc.tags.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Tag size={14} /> Tags</h3>
                            <div className="flex flex-wrap gap-2">
                                {doc.tags.map((tag: string) => (
                                    <span key={tag} className="px-2 py-1 bg-[var(--muted)] rounded-md text-xs">#{tag}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-6 border-t border-[var(--border)]">
                        <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary)]/90"
                        >
                            <Download size={16} /> Download File
                        </a>
                    </div>
                </div>
            </div>

            {/* Main Content - Preview */}
            <div className="flex-1 bg-[var(--muted)]/30 flex items-center justify-center p-4">
                {doc.mimeType === 'application/pdf' ? (
                    <iframe src={downloadUrl} className="w-full h-full rounded-lg shadow-sm border border-[var(--border)]" title="PDF Preview" />
                ) : doc.mimeType.startsWith('image/') ? (
                    <img src={downloadUrl} alt={doc.name} className="max-w-full max-h-full rounded-lg shadow-sm object-contain" />
                ) : (
                    <div className="text-center p-12 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm">
                        <FileText size={64} className="mx-auto text-[var(--muted-foreground)] mb-4" />
                        <h3 className="text-lg font-semibold">Preview not available</h3>
                        <p className="text-[var(--muted-foreground)] mb-6">This file type cannot be previewed directly.</p>
                        <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-[var(--primary)] hover:underline"
                        >
                            <ExternalLink size={16} /> Download to view
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

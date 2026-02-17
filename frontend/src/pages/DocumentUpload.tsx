import { useState, useRef } from 'react';
import api from '../lib/api';
import { toast } from 'sonner';
import { Upload, X, FileText, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ['GENERAL', 'ASSET', 'MAINTENANCE', 'INVOICE', 'CONTRACT', 'POLICY', 'OTHER'];

export default function DocumentUpload() {
    const navigate = useNavigate();
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [metadata, setMetadata] = useState({
        category: 'GENERAL',
        description: '',
        tags: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setIsUploading(true);
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));

        formData.append('category', metadata.category);
        formData.append('description', metadata.description);
        formData.append('tags', metadata.tags);

        try {
            await api.post('/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success(`${files.length} files uploaded successfully`);
            navigate('/documents');
        } catch (error) {
            toast.error('Failed to upload files');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <button
                onClick={() => navigate('/documents')}
                className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6"
            >
                <ArrowLeft size={16} /> Back to Documents
            </button>

            <h1 className="text-2xl font-bold mb-6">Upload Documents</h1>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-sm space-y-6">

                {/* File Drop Zone */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[var(--border)] rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--muted)]/50 transition-colors"
                >
                    <Upload size={48} className="text-[var(--muted-foreground)] mb-4" />
                    <p className="font-medium text-lg">Click to select files</p>
                    <p className="text-sm text-[var(--muted-foreground)] mt-2">
                        Supported: PDF, Doc, Excel, Images, CSV (Max 25MB)
                    </p>
                    <input
                        type="file"
                        multiple
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>

                {/* File List */}
                {files.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-[var(--muted-foreground)]">Selected Files ({files.length})</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {files.map((file, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-md text-sm">
                                    <div className="flex items-center gap-3 truncate">
                                        <FileText size={16} className="text-blue-500" />
                                        <span className="truncate max-w-[200px]">{file.name}</span>
                                        <span className="text-[var(--muted-foreground)] text-xs">{(file.size / 1024).toFixed(1)} KB</span>
                                    </div>
                                    <button onClick={() => removeFile(i)} className="text-[var(--muted-foreground)] hover:text-red-500">
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Metadata Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[var(--border)]">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <select
                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md"
                            value={metadata.category}
                            onChange={e => setMetadata(prev => ({ ...prev, category: e.target.value }))}
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Tags (comma separated)</label>
                        <input
                            type="text"
                            placeholder="e.g. urgent, legal, q1-2025"
                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md"
                            value={metadata.tags}
                            onChange={e => setMetadata(prev => ({ ...prev, tags: e.target.value }))}
                        />
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                            rows={3}
                            placeholder="Optional description..."
                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input)] rounded-md resize-none"
                            value={metadata.description}
                            onChange={e => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleUpload}
                        disabled={isUploading || files.length === 0}
                        className="flex items-center gap-2 px-6 py-2 bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? <Loader2 className="animate-spin" size={16} /> : 'Upload Files'}
                    </button>
                </div>
            </div>
        </div>
    );
}

import { useState, useRef } from 'react';
import { Upload, Send, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';

interface InventoryMultimodalAIProps {
    onTaskComplete?: () => void;
}

export function InventoryMultimodalAI({ onTaskComplete }: InventoryMultimodalAIProps) {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [textInput, setTextInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            toast.error('Please select an image or PDF file');
            return;
        }

        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (event) => {
            setImagePreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!imageFile && !textInput.trim()) {
            toast.error('Please provide either an image or text description');
            return;
        }

        setLoading(true);
        setError(null);
        setResponse(null);

        try {
            let imageBase64 = '';
            
            if (imageFile) {
                const reader = new FileReader();
                imageBase64 = await new Promise((resolve) => {
                    reader.onload = (event) => {
                        const base64 = (event.target?.result as string)?.split(',')[1] || '';
                        resolve(base64);
                    };
                    reader.readAsDataURL(imageFile);
                });
            }

            const result = await api.post('/inventory/ai-multimodal', {
                image: imageBase64,
                text: textInput,
            });

            if (result.data?.success) {
                setResponse(result.data.data);
                toast.success('AI analysis completed');
                
                // Reset form after successful submission
                setImageFile(null);
                setImagePreview(null);
                setTextInput('');
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to process request';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleClearImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
                    <Upload className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="font-semibold text-[var(--text-primary)]">AI Inventory Assistant</h3>
                <p className="text-xs text-[var(--text-muted)] ml-auto">Image + Text Processing</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Image Upload */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-primary)]">Upload Image/Invoice</label>
                    {imagePreview ? (
                        <div className="relative inline-block">
                            <img
                                src={imagePreview}
                                alt="Preview"
                                className="max-h-40 rounded border border-[var(--border-color)]"
                            />
                            <button
                                type="button"
                                onClick={handleClearImage}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full text-xs"
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-[var(--border-color)] rounded-lg p-4 text-center cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-50/10 transition"
                        >
                            <Upload className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2" />
                            <p className="text-sm text-[var(--text-muted)]">Click to upload image or PDF</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">PNG, JPG, PDF (Max 10MB)</p>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleImageSelect}
                        className="hidden"
                    />
                </div>

                {/* Text Input */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-primary)]">Description/Task</label>
                    <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="E.g., 'Extract invoice details and create inventory items' or 'Analyze this spare part image and update stock'"
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-overlay)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-20 resize-none"
                    />
                </div>

                {/* Error Display */}
                {error && (
                    <div className="flex gap-2 p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-500/30">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                )}

                {/* Submit Button */}
                <Button
                    type="submit"
                    disabled={loading || (!imageFile && !textInput.trim())}
                    className="w-full"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4 mr-2" />
                            Analyze with AI
                        </>
                    )}
                </Button>
            </form>

            {/* Response Display */}
            {response && (
                <div className="space-y-3 p-4 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-500/30">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <h4 className="font-semibold text-green-800 dark:text-green-200">AI Analysis Results</h4>
                    </div>

                    {/* Extracted Data */}
                    {response.extractedData && (
                        <div className="bg-white dark:bg-[var(--bg-overlay)] rounded p-3 space-y-2">
                            <p className="text-sm font-medium text-[var(--text-primary)]">Extracted Information:</p>
                            {typeof response.extractedData === 'object' ? (
                                <pre className="text-xs overflow-auto max-h-40 text-[var(--text-secondary)]">
                                    {JSON.stringify(response.extractedData, null, 2)}
                                </pre>
                            ) : (
                                <p className="text-sm text-[var(--text-secondary)]">{response.extractedData}</p>
                            )}
                        </div>
                    )}

                    {/* AI Suggestion */}
                    {response.suggestion && (
                        <div className="bg-white dark:bg-[var(--bg-overlay)] rounded p-3 space-y-2">
                            <p className="text-sm font-medium text-[var(--text-primary)]">AI Recommendation:</p>
                            <p className="text-sm text-[var(--text-secondary)]">{response.suggestion}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {response.suggestedAction && (
                        <div className="flex gap-2 pt-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setResponse(null);
                                    onTaskComplete?.();
                                }}
                            >
                                Done
                            </Button>
                        </div>
                    )}

                    {/* Confidence Score */}
                    {response.confidenceScore !== undefined && (
                        <p className="text-xs text-[var(--text-muted)]">
                            Confidence Score: {Math.round((response.confidenceScore || 0) * 100)}%
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

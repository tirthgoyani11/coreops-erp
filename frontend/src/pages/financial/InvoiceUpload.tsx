import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Upload, X, FileText, Check } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

export function InvoiceUpload({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
    const toast = useToast();
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { register, handleSubmit, reset, setValue } = useForm();

    const handleDrag = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: any) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = async (file: File) => {
        if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
            toast.error("Only PDF and Image files are allowed");
            return;
        }
        setFile(file);

        // Auto-analyze
        setAnalyzing(true);
        const formData = new FormData();
        formData.append('invoice', file);

        try {
            const res = await api.post('/ocr/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const data = res.data.data.extractedData;
            setPreviewData(data);

            // Pre-fill form
            setValue('vendorName', data.vendorName);
            setValue('invoiceNumber', data.invoiceNumber);
            setValue('date', data.date ? data.date.split('T')[0] : '');
            setValue('totalAmount', data.totalAmount);
            setValue('category', 'OPERATIONAL'); // Default

            toast.success("Invoice analyzed successfully!");
        } catch (error) {
            console.error('Analysis failed:', error);
            toast.error("Failed to analyze invoice. Please enter details manually.");
        } finally {
            setAnalyzing(false);
        }
    };

    const onSubmit = async (data: any) => {
        setUploading(true);
        try {
            // Create Transaction
            await api.post('/finance/transactions', {
                type: 'EXPENSE',
                category: data.category,
                amount: Number(data.totalAmount),
                description: `Invoice ${data.invoiceNumber} from ${data.vendorName}`,
                date: data.date,
                referenceType: 'INVOICE',
                referenceId: data.invoiceNumber // Ideally link to Invoice ID
            });

            toast.success("Transaction created successfully!");
            setFile(null);
            setPreviewData(null);
            reset();
            if (onUploadSuccess) onUploadSuccess();
        } catch (error) {
            console.error('Failed to save:', error);
            toast.error("Failed to save transaction.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Area */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Upload Invoice</h3>

                {!file ? (
                    <div
                        className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors
                            ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Drag & Drop or Click to Upload</p>
                        <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG up to 5MB</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*,application/pdf"
                            onChange={handleChange}
                        />
                    </div>
                ) : (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-600">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{file.name}</p>
                                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { setFile(null); setPreviewData(null); reset(); }}>
                            <X className="w-4 h-4 text-gray-500" />
                        </Button>
                    </div>
                )}

                {analyzing && (
                    <div className="mt-6 flex items-center justify-center gap-3 text-blue-600">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium">AI Analyzing Invoice...</span>
                    </div>
                )}
            </Card>

            {/* Review Form */}
            <Card className={`p-6 ${!previewData && !analyzing ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Review Details</h3>
                    {previewData?.confidenceScore && (
                        <span className={`text-xs px-2 py-1 rounded font-medium 
                            ${previewData.confidenceScore > 0.8 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {Math.round(previewData.confidenceScore * 100)}% Confidence
                        </span>
                    )}
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Vendor Name</label>
                        <input {...register('vendorName', { required: true })} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Invoice #</label>
                            <input {...register('invoiceNumber', { required: true })} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Date</label>
                            <input type="date" {...register('date', { required: true })} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Total Amount</label>
                            <input type="number" step="0.01" {...register('totalAmount', { required: true })} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Category</label>
                            <select {...register('category')} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                                <option value="OPERATIONAL">Operational</option>
                                <option value="MAINTENANCE">Maintenance</option>
                                <option value="SALARY">Salary</option>
                                <option value="UTILITIES">Utilities</option>
                                <option value="MARKETING">Marketing</option>
                            </select>
                        </div>
                    </div>

                    {previewData?.lineItems && previewData.lineItems.length > 0 && (
                        <div className="mt-4 pt-4 border-t dark:border-gray-700">
                            <p className="text-xs font-semibold text-gray-500 mb-2">Detected Line Items (For Reference)</p>
                            <div className="space-y-1 max-h-32 overflow-y-auto text-xs text-gray-600 dark:text-gray-400">
                                {previewData.lineItems.map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between">
                                        <span>{item.description} (x{item.quantity})</span>
                                        <span>{item.total}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={uploading} className="bg-green-600 hover:bg-green-700 w-full md:w-auto">
                            {uploading ? 'Processing...' : (
                                <>
                                    <Check className="w-4 h-4 mr-2" /> Approve & Create Transaction
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}

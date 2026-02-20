import { Upload, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useRef, useState } from 'react';

interface StepBasicInfoProps {
    data: any;
    updateData: (data: any) => void;
    errors: any;
}

export function StepBasicInfo({ data, updateData, errors }: StepBasicInfoProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(data.imagePreview || null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        updateData({ [e.target.name]: e.target.value });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be under 5MB');
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            setImagePreview(dataUrl);
            updateData({ imagePreview: dataUrl, imageFile: file.name });
        };
        reader.readAsDataURL(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const clearImage = () => {
        setImagePreview(null);
        updateData({ imagePreview: null, imageFile: null });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Asset Name */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Asset Name *</label>
                    <input
                        type="text"
                        name="name"
                        value={data.name}
                        onChange={handleChange}
                        className={cn(
                            "w-full px-4 py-3 bg-[var(--bg-background)] border rounded-xl focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--text-primary)] placeholder-[var(--text-secondary)]",
                            errors.name ? "border-red-500/50" : "border-[var(--border-color)]"
                        )}
                        placeholder="e.g. Dell XPS 15 Workstation"
                    />
                    {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
                </div>

                {/* Category — matches backend Asset model enum */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Category *</label>
                    <select
                        name="category"
                        value={data.category}
                        onChange={handleChange}
                        className={cn(
                            "w-full px-4 py-3 bg-[var(--bg-background)] border rounded-xl focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--text-primary)] appearance-none cursor-pointer",
                            errors.category ? "border-red-500/50" : "border-[var(--border-color)]"
                        )}
                    >
                        <option value="">Select Category</option>
                        <option value="LAPTOP">Laptop</option>
                        <option value="COMPUTER">Computer / Desktop</option>
                        <option value="FURNITURE">Furniture</option>
                        <option value="VEHICLE">Vehicle</option>
                        <option value="EQUIPMENT">Equipment</option>
                        <option value="PHONE">Phone</option>
                        <option value="PRINTER">Printer</option>
                        <option value="SERVER">Server</option>
                        <option value="NETWORK">Network Equipment</option>
                        <option value="MACHINERY">Heavy Machinery</option>
                        <option value="OTHER">Other</option>
                    </select>
                    {errors.category && <p className="text-xs text-red-400">{errors.category}</p>}
                </div>

                {/* Manufacturer */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Manufacturer</label>
                    <input
                        type="text"
                        name="manufacturer"
                        value={data.manufacturer}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                        placeholder="e.g. Dell, Herman Miller"
                    />
                </div>

                {/* Model */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Model</label>
                    <input
                        type="text"
                        name="model"
                        value={data.model}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                        placeholder="e.g. XPS 9520"
                    />
                </div>

                {/* Serial Number */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Serial Number</label>
                    <input
                        type="text"
                        name="serialNumber"
                        value={data.serialNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--primary)] font-mono transition-colors text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                        placeholder="SN-12345678"
                    />
                </div>

                {/* Assigned To */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Assigned To (User)</label>
                    <input
                        type="text"
                        name="assignedTo"
                        value={data.assignedTo || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                        placeholder="User Name or ID"
                    />
                </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Description</label>
                <textarea
                    name="description"
                    value={data.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--text-primary)] placeholder-[var(--text-secondary)] resize-none"
                    placeholder="Brief description or notes about the asset..."
                />
            </div>

            {/* Image Upload — Functional */}
            {imagePreview ? (
                <div className="relative inline-block">
                    <img src={imagePreview} alt="Preview" className="w-40 h-40 object-cover rounded-2xl border border-[var(--border-color)]" />
                    <button
                        onClick={clearImage}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[var(--border-color)] rounded-2xl p-8 flex flex-col items-center justify-center text-[var(--text-secondary)] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5 transition-all cursor-pointer group"
                >
                    <div className="w-12 h-12 rounded-full bg-[var(--bg-card-hover)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-[var(--primary)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Click to upload image</p>
                    <p className="text-xs mt-1">PNG, JPG or GIF (max. 5MB)</p>
                </div>
            )}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
            />
        </div>
    );
}


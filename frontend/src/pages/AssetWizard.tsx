import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, X, Loader2 } from 'lucide-react';
import { StepBasicInfo } from '../components/assets/wizard/StepBasicInfo';
import { StepLocation } from '../components/assets/wizard/StepLocation';
import { StepFinancial } from '../components/assets/wizard/StepFinancial';
import { StepReview } from '../components/assets/wizard/StepReview';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/authStore';

// Wizard Steps Config
const STEPS = [
    { id: 1, title: 'Basic Info', subtitle: 'Identification' },
    { id: 2, title: 'Location', subtitle: 'Where is it?' },
    { id: 3, title: 'Financial', subtitle: 'Cost & Warranty' },
    { id: 4, title: 'Review', subtitle: 'Confirm Details' },
];

export function AssetWizard() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isEditMode = !!id;

    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(isEditMode);
    const [errors, setErrors] = useState<any>({});

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        manufacturer: '',
        model: '',
        serialNumber: '',
        description: '',
        officeId: (user?.officeId as any)?._id || user?.officeId || '',
        building: '',
        floor: '',
        room: '',
        purchasePrice: '',
        purchaseDate: new Date().toISOString().split('T')[0], // Default today
        vendorName: '',
        warrantyExpiryDate: '',
        status: 'ACTIVE'
    });

    // Fetch Data for Edit Mode
    useEffect(() => {
        if (isEditMode) {
            const fetchAsset = async () => {
                try {
                    setIsLoading(true);
                    const res = await api.get(`/assets/${id}`);
                    const asset = res.data.data || res.data;

                    setFormData({
                        name: asset.name || '',
                        category: asset.category || '',
                        manufacturer: asset.manufacturer || '',
                        model: asset.model || '',
                        serialNumber: asset.serialNumber || '',
                        description: asset.description || '',
                        officeId: asset.officeId?._id || asset.officeId || '',
                        building: asset.location?.building || '',
                        floor: asset.location?.floor || '',
                        room: asset.location?.room || '',
                        purchasePrice: (asset.purchaseInfo?.purchasePrice || asset.purchaseCost)?.toString() || '',
                        purchaseDate: asset.purchaseInfo?.purchaseDate ? new Date(asset.purchaseInfo.purchaseDate).toISOString().split('T')[0] : '',
                        vendorName: '', // Cannot securely recover string vendor name from description easily without regex, leaving empty for now
                        warrantyExpiryDate: asset.purchaseInfo?.warranty?.endDate ? new Date(asset.purchaseInfo.warranty.endDate).toISOString().split('T')[0] : '',
                        status: asset.status || 'ACTIVE'
                    });
                } catch (error) {
                    console.error("Failed to load asset for editing", error);
                    alert("Failed to load asset details.");
                    navigate('/assets');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchAsset();
        }
    }, [id, isEditMode, navigate]);

    const updateFormData = (newData: any) => {
        setFormData(prev => ({ ...prev, ...newData }));
        // Clear errors for fields being updated
        const newErrors = { ...errors };
        Object.keys(newData).forEach(key => delete newErrors[key]);
        setErrors(newErrors);
    };

    const validateStep = (step: number) => {
        const newErrors: any = {};
        let isValid = true;

        if (step === 1) {
            if (!formData.name.trim()) newErrors.name = 'Asset Name is required';
            if (!formData.category) newErrors.category = 'Category is required';
        }
        if (step === 2) {
            if (!formData.officeId) newErrors.officeId = 'Office is required';
        }
        if (step === 3) {
            if (!formData.purchasePrice) newErrors.purchasePrice = 'Purchase Price is required';
            if (!formData.purchaseDate) newErrors.purchaseDate = 'Purchase Date is required';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            isValid = false;
        }
        return isValid;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = async () => {
        if (!validateStep(currentStep)) return;

        setIsSubmitting(true);
        try {
            // Transform data for backend Structure
            // Transform data for backend Structure
            const payload: any = {
                name: formData.name,
                category: formData.category,
                manufacturer: formData.manufacturer,
                model: formData.model,
                serialNumber: formData.serialNumber,
                description: formData.description, // User might input vendor here if needed, or we append it
                officeId: formData.officeId,

                // Location (Flat fields expected by controller)
                locationBuilding: formData.building,
                locationFloor: formData.floor,
                locationRoom: formData.room,

                // Purchase Info
                purchaseCost: parseFloat(formData.purchasePrice),
                purchaseDate: formData.purchaseDate,
                // vendor: ... (Backend expects ObjectId, we have string. Skipping to avoid 400),
                warrantyEndDate: formData.warrantyExpiryDate || null,

                status: formData.status
            };

            // Include assignedTo if selected
            if (formData.assignedTo) {
                payload.assignedTo = formData.assignedTo;
            }

            // Temporary: Append vendor to description if present, since backend lacks vendorName string field
            if (formData.vendorName) {
                payload.description = `${payload.description || ''}\n[Vendor: ${formData.vendorName}]`.trim();
            }

            if (isEditMode) {
                await api.patch(`/assets/${id}`, payload);
            } else {
                await api.post('/assets', payload);
            }

            // Success! Redirect to list
            navigate('/assets');
        } catch (error: any) {
            console.error('Failed to save asset:', error);
            alert(`Failed to save asset: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-[var(--primary)]" size={40} />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] py-8 px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-4xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[600px]"
            >
                {/* Left: Sidebar / Progress */}
                <div className="w-full md:w-1/3 bg-[var(--bg-card-hover)] p-8 border-b md:border-b-0 md:border-r border-[var(--border-color)] flex flex-col justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                            {isEditMode ? 'Edit Asset' : 'New Asset'}
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-8">
                            {isEditMode ? 'Update asset details and configuration.' : 'Register a new asset into the organization inventory.'}
                        </p>

                        <div className="space-y-6">
                            {STEPS.map((step, index) => {
                                const isActive = step.id === currentStep;
                                const isCompleted = step.id < currentStep;

                                return (
                                    <div key={step.id} className="flex items-center gap-4 relative">
                                        {/* Connecting Line */}
                                        {index < STEPS.length - 1 && (
                                            <div className={cn(
                                                "absolute left-[15px] top-[30px] w-0.5 h-[34px]",
                                                isCompleted ? "bg-[var(--primary)]" : "bg-[var(--border-color)]"
                                            )} />
                                        )}

                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all z-10",
                                            isActive ? "border-[var(--primary)] bg-[var(--primary)] text-black" :
                                                isCompleted ? "border-[var(--primary)] bg-[var(--primary)]/20 text-[var(--primary)]" :
                                                    "border-[var(--text-disabled)] text-[var(--text-disabled)]"
                                        )}>
                                            {isCompleted ? <Check size={16} /> : step.id}
                                        </div>
                                        <div>
                                            <p className={cn(
                                                "font-semibold text-sm",
                                                isActive ? "text-[var(--text-primary)]" :
                                                    isCompleted ? "text-[var(--text-primary)]" :
                                                        "text-[var(--text-disabled)]"
                                            )}>{step.title}</p>
                                            <p className="text-xs text-[var(--text-secondary)]">{step.subtitle}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-8 text-xs text-[var(--text-secondary)]">
                        <p>Press <span className="font-mono bg-[var(--bg-background)] px-1 rounded border border-[var(--border-color)]">Enter</span> to continue</p>
                    </div>
                </div>

                {/* Right: Content Area */}
                <div className="flex-1 p-8 flex flex-col relative">
                    {/* Close Button */}
                    <button
                        onClick={() => navigate('/assets')}
                        className="absolute top-6 right-6 p-2 rounded-full hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">{STEPS[currentStep - 1].title}</h3>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                {currentStep === 1 && <StepBasicInfo data={formData} updateData={updateFormData} errors={errors} />}
                                {currentStep === 2 && <StepLocation data={formData} updateData={updateFormData} errors={errors} />}
                                {currentStep === 3 && <StepFinancial data={formData} updateData={updateFormData} errors={errors} />}
                                {currentStep === 4 && <StepReview data={formData} isSubmitting={isSubmitting} />}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center mt-8 pt-6 border-t border-[var(--border-color)]">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 1 || isSubmitting}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors",
                                currentStep === 1 ? "opacity-0 cursor-default" : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                            )}
                        >
                            <ChevronLeft size={18} /> Back
                        </button>

                        {currentStep < 4 ? (
                            <button
                                onClick={handleNext}
                                className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-black font-bold rounded-xl hover:opacity-90 transition-all hover:shadow-[0_0_20px_rgba(185,255,102,0.3)] active:scale-95"
                            >
                                Continue <ChevronRight size={18} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className={cn(
                                    "flex items-center gap-2 px-8 py-2.5 bg-[var(--primary)] text-black font-bold rounded-xl transition-all hover:shadow-[0_0_20px_rgba(185,255,102,0.3)] active:scale-95",
                                    isSubmitting && "opacity-70 cursor-wait"
                                )}
                            >
                                {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Asset' : 'Confirm Creation')}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default AssetWizard;

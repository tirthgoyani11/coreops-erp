import { useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, DollarSign, MapPin, UserCircle, Check, ArrowLeft, ArrowRight, Loader2, CheckCircle2, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

// Currency options
const CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
];

interface SetupData {
    // Step 1: Organization
    companyName: string;
    companyLogo: File | null;
    address: string;
    // Step 2: Currency
    baseCurrency: string;
    // Step 3: First Branch
    branchName: string;
    branchAddress: string;
    branchCity: string;
    branchCountry: string;
}

const STEPS = [
    { id: 1, title: 'Organization', icon: Building2 },
    { id: 2, title: 'Currency', icon: DollarSign },
    { id: 3, title: 'First Branch', icon: MapPin },
    { id: 4, title: 'Confirm', icon: UserCircle },
];

/**
 * First-Time Setup Wizard (Super Admin Only)
 * 
 * Multi-step wizard for initial system configuration.
 * Steps:
 * 1. Organization Info (name, logo, address)
 * 2. Base Currency selection
 * 3. First Branch/Headquarters creation
 * 4. Confirmation and completion
 */
export const SetupWizard = memo(function SetupWizard() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState('');

    const [data, setData] = useState<SetupData>({
        companyName: '',
        companyLogo: null,
        address: '',
        baseCurrency: 'USD',
        branchName: 'Headquarters',
        branchAddress: '',
        branchCity: '',
        branchCountry: '',
    });

    // Update field helper
    const updateField = useCallback(<K extends keyof SetupData>(field: K, value: SetupData[K]) => {
        setData(prev => ({ ...prev, [field]: value }));
    }, []);

    // Step validation
    const isStepValid = useCallback((step: number) => {
        switch (step) {
            case 1:
                return data.companyName.trim() !== '';
            case 2:
                return data.baseCurrency !== '';
            case 3:
                return data.branchName.trim() !== '' && data.branchCity.trim() !== '';
            case 4:
                return true;
            default:
                return false;
        }
    }, [data]);

    // Navigation
    const nextStep = useCallback(() => {
        if (currentStep < 4 && isStepValid(currentStep)) {
            setCurrentStep(prev => prev + 1);
        }
    }, [currentStep, isStepValid]);

    const prevStep = useCallback(() => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    // Submit setup
    const handleSubmit = useCallback(async () => {
        setIsSubmitting(true);
        setError('');

        try {
            // Create form data for file upload
            const formData = new FormData();
            formData.append('companyName', data.companyName);
            formData.append('address', data.address);
            formData.append('baseCurrency', data.baseCurrency);
            formData.append('branchName', data.branchName);
            formData.append('branchAddress', data.branchAddress);
            formData.append('branchCity', data.branchCity);
            formData.append('branchCountry', data.branchCountry);
            if (data.companyLogo) {
                formData.append('logo', data.companyLogo);
            }

            await api.post('/setup/complete', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setIsComplete(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Setup failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [data]);

    // Complete state
    if (isComplete) {
        return (
            <div className="min-h-screen bg-[#030304] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full text-center"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: 'spring', damping: 10 }}
                        className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center"
                    >
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </motion.div>

                    <h1 className="text-2xl font-bold text-white mb-2">Setup Complete!</h1>
                    <p className="text-[var(--text-muted)] mb-8">
                        Your organization is ready. Welcome to CoreOps ERP!
                    </p>

                    <button
                        onClick={() => navigate('/')}
                        className="w-full h-12 bg-[var(--primary)] text-black rounded-xl font-bold hover:shadow-[0_0_30px_rgba(185,255,102,0.4)] transition-all"
                    >
                        Go to Dashboard
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#030304] flex items-center justify-center p-4 py-12">
            <div className="absolute inset-0 bg-gradient-to-br from-[#B9FF66]/5 via-transparent to-transparent" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-2xl"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome to CoreOps ERP</h1>
                    <p className="text-[var(--text-muted)]">Let's set up your organization</p>
                </div>

                {/* Progress Steps */}
                <div className="flex justify-center mb-8">
                    {STEPS.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentStep > step.id
                                        ? 'bg-[var(--primary)] text-black'
                                        : currentStep === step.id
                                            ? 'bg-[var(--primary)]/20 border-2 border-[var(--primary)] text-[var(--primary)]'
                                            : 'bg-white/5 border border-white/10 text-[var(--text-muted)]'
                                        }`}
                                >
                                    {currentStep > step.id ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        <step.icon className="w-5 h-5" />
                                    )}
                                </div>
                                <span className={`text-xs mt-2 ${currentStep >= step.id ? 'text-white' : 'text-[var(--text-muted)]'
                                    }`}>
                                    {step.title}
                                </span>
                            </div>
                            {index < STEPS.length - 1 && (
                                <div className={`w-16 h-0.5 mx-2 mt-[-16px] ${currentStep > step.id ? 'bg-[var(--primary)]' : 'bg-white/10'
                                    }`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Card */}
                <div className="bg-[#0a0a0b] border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {error && (
                        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {currentStep === 1 && (
                            <Step1Organization data={data} updateField={updateField} />
                        )}
                        {currentStep === 2 && (
                            <Step2Currency data={data} updateField={updateField} />
                        )}
                        {currentStep === 3 && (
                            <Step3Branch data={data} updateField={updateField} />
                        )}
                        {currentStep === 4 && (
                            <Step4Confirm data={data} />
                        )}
                    </AnimatePresence>

                    {/* Navigation Buttons */}
                    <div className="flex gap-4 mt-8">
                        {currentStep > 1 && (
                            <button
                                onClick={prevStep}
                                className="flex-1 h-12 bg-white/5 border border-white/10 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                        )}
                        {currentStep < 4 ? (
                            <button
                                onClick={nextStep}
                                disabled={!isStepValid(currentStep)}
                                className="flex-1 h-12 bg-[var(--primary)] text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(185,255,102,0.4)] transition-all disabled:opacity-50"
                            >
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 h-12 bg-[var(--primary)] text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(185,255,102,0.4)] transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Setting up...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Complete Setup
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
});

// Step 1: Organization Info
const Step1Organization = memo(function Step1Organization({
    data,
    updateField
}: {
    data: SetupData;
    updateField: <K extends keyof SetupData>(field: K, value: SetupData[K]) => void;
}) {
    return (
        <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
        >
            <h2 className="text-xl font-bold text-white mb-4">Organization Details</h2>

            <div>
                <label className="block text-sm font-medium text-white mb-2">
                    Company Name *
                </label>
                <input
                    type="text"
                    value={data.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    placeholder="Acme Corporation"
                    className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-all"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-white mb-2">
                    Company Logo
                </label>
                <div className="relative border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-[var(--primary)]/50 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--text-muted)]">
                        {data.companyLogo ? data.companyLogo.name : 'Drag & drop or click to upload'}
                    </p>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => updateField('companyLogo', e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-white mb-2">
                    Company Address
                </label>
                <textarea
                    value={data.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="123 Business Ave, Suite 100"
                    rows={3}
                    className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-all resize-none"
                />
            </div>
        </motion.div>
    );
});

// Step 2: Currency Selection
const Step2Currency = memo(function Step2Currency({
    data,
    updateField
}: {
    data: SetupData;
    updateField: <K extends keyof SetupData>(field: K, value: SetupData[K]) => void;
}) {
    return (
        <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
        >
            <h2 className="text-xl font-bold text-white mb-4">Base Currency</h2>
            <p className="text-[var(--text-muted)] mb-6">
                Select the primary currency for your organization. This will be used for all financial calculations.
            </p>

            <div className="grid grid-cols-2 gap-3">
                {CURRENCIES.map((currency) => (
                    <button
                        key={currency.code}
                        onClick={() => updateField('baseCurrency', currency.code)}
                        className={`p-4 rounded-xl border text-left transition-all ${data.baseCurrency === currency.code
                            ? 'bg-[var(--primary)]/10 border-[var(--primary)]'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-white">{currency.symbol}</span>
                            <div>
                                <p className="text-sm font-medium text-white">{currency.code}</p>
                                <p className="text-xs text-[var(--text-muted)]">{currency.name}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </motion.div>
    );
});

// Step 3: First Branch
const Step3Branch = memo(function Step3Branch({
    data,
    updateField
}: {
    data: SetupData;
    updateField: <K extends keyof SetupData>(field: K, value: SetupData[K]) => void;
}) {
    return (
        <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
        >
            <h2 className="text-xl font-bold text-white mb-4">Create First Branch</h2>
            <p className="text-[var(--text-muted)] mb-6">
                Set up your headquarters or main office location.
            </p>

            <div>
                <label className="block text-sm font-medium text-white mb-2">
                    Branch Name *
                </label>
                <input
                    type="text"
                    value={data.branchName}
                    onChange={(e) => updateField('branchName', e.target.value)}
                    placeholder="Headquarters"
                    className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-all"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-white mb-2">
                    Street Address
                </label>
                <input
                    type="text"
                    value={data.branchAddress}
                    onChange={(e) => updateField('branchAddress', e.target.value)}
                    placeholder="123 Business Ave"
                    className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-all"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-white mb-2">
                        City *
                    </label>
                    <input
                        type="text"
                        value={data.branchCity}
                        onChange={(e) => updateField('branchCity', e.target.value)}
                        placeholder="New York"
                        className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-all"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-white mb-2">
                        Country
                    </label>
                    <input
                        type="text"
                        value={data.branchCountry}
                        onChange={(e) => updateField('branchCountry', e.target.value)}
                        placeholder="United States"
                        className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-all"
                    />
                </div>
            </div>
        </motion.div>
    );
});

// Step 4: Confirmation
const Step4Confirm = memo(function Step4Confirm({ data }: { data: SetupData }) {
    const selectedCurrency = CURRENCIES.find(c => c.code === data.baseCurrency);

    return (
        <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
        >
            <h2 className="text-xl font-bold text-white mb-4">Confirm Setup</h2>
            <p className="text-[var(--text-muted)] mb-6">
                Please review your settings before completing the setup.
            </p>

            <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Organization</h3>
                    <p className="text-lg font-semibold text-white">{data.companyName}</p>
                    {data.address && (
                        <p className="text-sm text-[var(--text-muted)] mt-1">{data.address}</p>
                    )}
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Base Currency</h3>
                    <p className="text-lg font-semibold text-white">
                        {selectedCurrency?.symbol} {selectedCurrency?.name} ({data.baseCurrency})
                    </p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">First Branch</h3>
                    <p className="text-lg font-semibold text-white">{data.branchName}</p>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        {[data.branchAddress, data.branchCity, data.branchCountry].filter(Boolean).join(', ')}
                    </p>
                </div>
            </div>
        </motion.div>
    );
});

export default SetupWizard;

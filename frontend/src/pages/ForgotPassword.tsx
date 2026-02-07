import { useState, useCallback, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

type FormState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Forgot Password Page
 * 
 * Allows users to request a password reset link via email.
 * Features:
 * - Email validation
 * - Loading/success/error states
 * - Animated transitions
 * - Accessible form with ARIA labels
 */
export const ForgotPassword = memo(function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [formState, setFormState] = useState<FormState>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    // Email validation
    const isValidEmail = useCallback((email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }, []);

    const isFormValid = email.trim() !== '' && isValidEmail(email);

    // Handle form submission
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isFormValid) return;

        setFormState('loading');
        setErrorMessage('');

        try {
            await api.post('/auth/forgot-password', { email });
            setFormState('success');
        } catch (error: any) {
            setFormState('error');
            setErrorMessage(
                error.response?.data?.message ||
                'Failed to send reset link. Please try again.'
            );
        }
    }, [email, isFormValid]);

    return (
        <div className="min-h-screen bg-[#030304] flex items-center justify-center p-4">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#B9FF66]/5 via-transparent to-transparent" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-md"
            >
                {/* Back to Login */}
                <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-white mb-8 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Login
                </Link>

                {/* Card */}
                <div className="bg-[#0a0a0b] border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <AnimatePresence mode="wait">
                        {formState === 'success' ? (
                            <SuccessState email={email} />
                        ) : (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                {/* Icon */}
                                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                                    <Mail className="w-8 h-8 text-[var(--primary)]" />
                                </div>

                                {/* Title */}
                                <h1 className="text-2xl font-bold text-white text-center mb-2">
                                    Forgot Password?
                                </h1>
                                <p className="text-[var(--text-muted)] text-center mb-8">
                                    Enter your email and we'll send you a link to reset your password.
                                </p>

                                {/* Error Alert */}
                                {formState === 'error' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3"
                                    >
                                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-400">{errorMessage}</p>
                                    </motion.div>
                                )}

                                {/* Form */}
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-6">
                                        <label
                                            htmlFor="email"
                                            className="block text-sm font-medium text-white mb-2"
                                        >
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                            <input
                                                id="email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="you@company.com"
                                                className="w-full bg-[#18181b] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                                                required
                                                disabled={formState === 'loading'}
                                                aria-describedby="email-hint"
                                            />
                                        </div>
                                        {email && !isValidEmail(email) && (
                                            <p id="email-hint" className="mt-2 text-xs text-red-400">
                                                Please enter a valid email address
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!isFormValid || formState === 'loading'}
                                        className="w-full h-12 bg-[var(--primary)] text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(185,255,102,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                                    >
                                        {formState === 'loading' ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            'Send Reset Link'
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-[var(--text-muted)] mt-6">
                    Remember your password?{' '}
                    <Link to="/login" className="text-[var(--primary)] hover:underline">
                        Sign in
                    </Link>
                </p>
            </motion.div>
        </div>
    );
});

/**
 * Success State Component
 */
const SuccessState = memo(function SuccessState({ email }: { email: string }) {
    const navigate = useNavigate();

    return (
        <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
        >
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', damping: 10 }}
                className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center"
            >
                <CheckCircle className="w-8 h-8 text-emerald-400" />
            </motion.div>

            <h2 className="text-xl font-bold text-white mb-2">
                Check Your Email
            </h2>
            <p className="text-[var(--text-muted)] mb-2">
                We've sent a password reset link to:
            </p>
            <p className="text-white font-medium mb-6">
                {email}
            </p>
            <p className="text-sm text-[var(--text-muted)] mb-6">
                Didn't receive the email? Check your spam folder or try again.
            </p>

            <button
                onClick={() => navigate('/login')}
                className="w-full h-12 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
            >
                Back to Login
            </button>
        </motion.div>
    );
});

export default ForgotPassword;

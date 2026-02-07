import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Lock, ArrowLeft, Loader2, CheckCircle, AlertCircle, Eye, EyeOff, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

type FormState = 'validating' | 'idle' | 'loading' | 'success' | 'error' | 'invalid-token';

interface PasswordRequirement {
    label: string;
    test: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
    { label: 'One number', test: (p) => /\d/.test(p) },
    { label: 'One special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

/**
 * Reset Password Page
 * 
 * Allows users to set a new password using a reset token.
 * Features:
 * - Token validation on load
 * - Password strength indicator
 * - Confirm password matching
 * - Animated transitions
 * - Accessible form
 */
export const ResetPassword = memo(function ResetPassword() {
    const { token } = useParams<{ token: string }>();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formState, setFormState] = useState<FormState>('validating');
    const [errorMessage, setErrorMessage] = useState('');

    // Validate token on mount
    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setFormState('invalid-token');
                return;
            }

            try {
                await api.post('/auth/validate-reset-token', { token });
                setFormState('idle');
            } catch {
                setFormState('invalid-token');
            }
        };

        validateToken();
    }, [token]);

    // Password strength calculation
    const passwordStrength = useMemo(() => {
        const passed = PASSWORD_REQUIREMENTS.filter(req => req.test(password));
        return {
            score: passed.length,
            Requirements: PASSWORD_REQUIREMENTS.map(req => ({
                ...req,
                passed: req.test(password)
            }))
        };
    }, [password]);

    const strengthColor = useMemo(() => {
        if (passwordStrength.score <= 2) return 'bg-red-500';
        if (passwordStrength.score <= 3) return 'bg-amber-500';
        if (passwordStrength.score <= 4) return 'bg-yellow-500';
        return 'bg-emerald-500';
    }, [passwordStrength.score]);

    const passwordsMatch = password === confirmPassword && confirmPassword !== '';
    const isFormValid = passwordStrength.score >= 4 && passwordsMatch;

    // Handle form submission
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isFormValid || !token) return;

        setFormState('loading');
        setErrorMessage('');

        try {
            await api.post('/auth/reset-password', { token, password });
            setFormState('success');
        } catch (error: any) {
            setFormState('error');
            setErrorMessage(
                error.response?.data?.message ||
                'Failed to reset password. Please try again.'
            );
        }
    }, [password, token, isFormValid]);

    // Loading state while validating token
    if (formState === 'validating') {
        return (
            <div className="min-h-screen bg-[#030304] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
            </div>
        );
    }

    // Invalid token state
    if (formState === 'invalid-token') {
        return (
            <div className="min-h-screen bg-[#030304] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full text-center"
                >
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Invalid or Expired Link</h1>
                    <p className="text-[var(--text-muted)] mb-6">
                        This password reset link is invalid or has expired. Please request a new one.
                    </p>
                    <Link
                        to="/forgot-password"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-black rounded-xl font-bold hover:shadow-[0_0_30px_rgba(185,255,102,0.4)] transition-all"
                    >
                        Request New Link
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#030304] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-[#B9FF66]/5 via-transparent to-transparent" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-md"
            >
                <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-white mb-8 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Login
                </Link>

                <div className="bg-[#0a0a0b] border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <AnimatePresence mode="wait">
                        {formState === 'success' ? (
                            <SuccessState />
                        ) : (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                                    <Lock className="w-8 h-8 text-[var(--primary)]" />
                                </div>

                                <h1 className="text-2xl font-bold text-white text-center mb-2">
                                    Set New Password
                                </h1>
                                <p className="text-[var(--text-muted)] text-center mb-8">
                                    Create a strong password to secure your account.
                                </p>

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

                                <form onSubmit={handleSubmit}>
                                    {/* Password Field */}
                                    <div className="mb-4">
                                        <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                            <input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full bg-[#18181b] border border-white/10 rounded-xl pl-12 pr-12 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                                                required
                                                disabled={formState === 'loading'}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white transition-colors"
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Password Strength */}
                                    {password && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mb-4"
                                        >
                                            <div className="flex gap-1 mb-3">
                                                {[1, 2, 3, 4, 5].map((i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-1.5 flex-1 rounded-full transition-all ${i <= passwordStrength.score ? strengthColor : 'bg-white/10'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <ul className="space-y-1">
                                                {passwordStrength.Requirements.map((req, i) => (
                                                    <li key={i} className="flex items-center gap-2 text-xs">
                                                        {req.passed ? (
                                                            <Check className="w-3 h-3 text-emerald-400" />
                                                        ) : (
                                                            <X className="w-3 h-3 text-[var(--text-muted)]" />
                                                        )}
                                                        <span className={req.passed ? 'text-emerald-400' : 'text-[var(--text-muted)]'}>
                                                            {req.label}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </motion.div>
                                    )}

                                    {/* Confirm Password */}
                                    <div className="mb-6">
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                            <input
                                                id="confirmPassword"
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full bg-[#18181b] border border-white/10 rounded-xl pl-12 pr-12 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                                                required
                                                disabled={formState === 'loading'}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white transition-colors"
                                                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        {confirmPassword && !passwordsMatch && (
                                            <p className="mt-2 text-xs text-red-400">Passwords do not match</p>
                                        )}
                                        {passwordsMatch && (
                                            <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Passwords match
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!isFormValid || formState === 'loading'}
                                        className="w-full h-12 bg-[var(--primary)] text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(185,255,102,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {formState === 'loading' ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Resetting...
                                            </>
                                        ) : (
                                            'Reset Password'
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
});

const SuccessState = memo(function SuccessState() {
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

            <h2 className="text-xl font-bold text-white mb-2">Password Reset!</h2>
            <p className="text-[var(--text-muted)] mb-6">
                Your password has been successfully reset. You can now sign in with your new password.
            </p>

            <button
                onClick={() => navigate('/login')}
                className="w-full h-12 bg-[var(--primary)] text-black rounded-xl font-bold hover:shadow-[0_0_30px_rgba(185,255,102,0.4)] transition-all"
            >
                Sign In
            </button>
        </motion.div>
    );
});

export default ResetPassword;

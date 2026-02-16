import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { User, Mail, Lock, ArrowLeft, Loader2, CheckCircle, AlertCircle, Eye, EyeOff, Check, X, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

type FormState = 'validating' | 'idle' | 'loading' | 'success' | 'error' | 'invalid-token';

interface InviteData {
    email: string;
    role: string;
    invitedBy: string;
    expiresAt: string;
}

interface PasswordRequirement {
    label: string;
    test: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { label: 'One number', test: (p) => /\d/.test(p) },
];

/**
 * Registration Page (Invitation-Based)
 * 
 * Allows invited users to complete their account registration.
 * Features:
 * - Invitation token validation
 * - Pre-filled email from invite
 * - Password strength requirements
 * - Profile fields (name, phone)
 */
export const Register = memo(function Register() {
    const { inviteToken } = useParams<{ inviteToken: string }>();

    const [formState, setFormState] = useState<FormState>('validating');
    const [inviteData, setInviteData] = useState<InviteData | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    // Form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Validate invite token on mount
    useEffect(() => {
        const validateToken = async () => {
            if (!inviteToken) {
                setFormState('invalid-token');
                return;
            }

            try {
                const response = await api.get(`/auth/validate-invite/${inviteToken}`);
                setInviteData(response.data.data);
                setFormState('idle');
            } catch {
                setFormState('invalid-token');
            }
        };

        validateToken();
    }, [inviteToken]);

    // Password validation
    const passwordStrength = useMemo(() => {
        const passed = PASSWORD_REQUIREMENTS.filter(req => req.test(password));
        return {
            score: passed.length,
            requirements: PASSWORD_REQUIREMENTS.map(req => ({
                ...req,
                passed: req.test(password)
            }))
        };
    }, [password]);

    const passwordsMatch = password === confirmPassword && confirmPassword !== '';
    const isFormValid =
        firstName.trim() !== '' &&
        lastName.trim() !== '' &&
        passwordStrength.score >= 3 &&
        passwordsMatch;

    // Handle registration
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isFormValid || !inviteToken) return;

        setFormState('loading');
        setErrorMessage('');

        try {
            await api.post('/auth/register-invite', {
                token: inviteToken,
                firstName,
                lastName,
                phone,
                password
            });
            setFormState('success');
        } catch (error: any) {
            setFormState('error');
            setErrorMessage(
                error.response?.data?.message ||
                'Failed to create account. Please try again.'
            );
        }
    }, [firstName, lastName, phone, password, inviteToken, isFormValid]);

    // Loading state
    if (formState === 'validating') {
        return (
            <div className="min-h-screen bg-[var(--bg-background)] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin mx-auto mb-4" />
                    <p className="text-[var(--text-muted)]">Validating invitation...</p>
                </div>
            </div>
        );
    }

    // Invalid token state
    if (formState === 'invalid-token') {
        return (
            <div className="min-h-screen bg-[var(--bg-background)] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full text-center"
                >
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Invalid Invitation</h1>
                    <p className="text-[var(--text-muted)] mb-6">
                        This invitation link is invalid or has expired. Please contact your administrator for a new invitation.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-black rounded-xl font-bold hover:shadow-[0_0_30px_rgba(185,255,102,0.4)] transition-all"
                    >
                        Go to Login
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-background)] flex items-center justify-center p-4 py-12">
            <div className="absolute inset-0 bg-gradient-to-br from-[#B9FF66]/5 via-transparent to-transparent" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-lg"
            >
                <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-8 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Login
                </Link>

                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 shadow-2xl">
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
                                    <User className="w-8 h-8 text-[var(--primary)]" />
                                </div>

                                <h1 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-2">
                                    Complete Your Profile
                                </h1>
                                <p className="text-[var(--text-muted)] text-center mb-2">
                                    You've been invited to join CoreOps ERP
                                </p>
                                {inviteData && (
                                    <div className="text-center mb-6">
                                        <span className="inline-block px-3 py-1 text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] rounded-full">
                                            Role: {inviteData.role.replace('_', ' ')}
                                        </span>
                                    </div>
                                )}

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

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Name fields */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="firstName" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                                First Name *
                                            </label>
                                            <input
                                                id="firstName"
                                                type="text"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                placeholder="John"
                                                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary)] transition-all"
                                                required
                                                disabled={formState === 'loading'}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="lastName" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                                Last Name *
                                            </label>
                                            <input
                                                id="lastName"
                                                type="text"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                placeholder="Doe"
                                                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary)] transition-all"
                                                required
                                                disabled={formState === 'loading'}
                                            />
                                        </div>
                                    </div>

                                    {/* Email (read-only) */}
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                                            <input
                                                id="email"
                                                type="email"
                                                value={inviteData?.email || ''}
                                                className="w-full bg-[var(--bg-overlay)]/50 border border-[var(--border-color)] rounded-xl pl-12 pr-4 py-3 text-[var(--text-secondary)] cursor-not-allowed"
                                                readOnly
                                                disabled
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                                            Email is set from your invitation
                                        </p>
                                    </div>

                                    {/* Phone (optional) */}
                                    <div>
                                        <label htmlFor="phone" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                            Phone Number <span className="text-[var(--text-secondary)]">(optional)</span>
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                                            <input
                                                id="phone"
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="+1 (555) 123-4567"
                                                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl pl-12 pr-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary)] transition-all"
                                                disabled={formState === 'loading'}
                                            />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                            Password *
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                                            <input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl pl-12 pr-12 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary)] transition-all"
                                                required
                                                disabled={formState === 'loading'}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>

                                        {/* Password requirements */}
                                        {password && (
                                            <ul className="mt-2 space-y-1">
                                                {passwordStrength.requirements.map((req, i) => (
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
                                        )}
                                    </div>

                                    {/* Confirm Password */}
                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                            Confirm Password *
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                                            <input
                                                id="confirmPassword"
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-color)] rounded-xl pl-12 pr-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary)] transition-all"
                                                required
                                                disabled={formState === 'loading'}
                                            />
                                        </div>
                                        {confirmPassword && !passwordsMatch && (
                                            <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!isFormValid || formState === 'loading'}
                                        className="w-full h-12 bg-[var(--primary)] text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(185,255,102,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                                    >
                                        {formState === 'loading' ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Creating Account...
                                            </>
                                        ) : (
                                            'Create Account'
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div >
            </motion.div >
        </div >
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

            <h2 className="text-xl font-bold text-white mb-2">Account Created!</h2>
            <p className="text-[var(--text-muted)] mb-6">
                Your account has been successfully created. You can now sign in to CoreOps ERP.
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

export default Register;

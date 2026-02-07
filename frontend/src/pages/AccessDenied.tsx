import { Link, useLocation } from 'react-router-dom';
import { ShieldOff, ArrowLeft, Home, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { memo, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { getRoleLabel, getRoleColor, getRoleConfig } from '../config/roleConfig';
import type { UserRole } from '../types';

interface LocationState {
    from?: string;
    requiredRoles?: UserRole[];
}

/**
 * Access Denied Page (403)
 * 
 * Shown when a user tries to access a route they don't have permission for.
 * Displays user's current role and provides navigation options.
 * 
 * Features:
 * - Animated entrance with spring physics
 * - Role-colored badge showing current access level
 * - Shows required roles if available from navigation state
 * - Accessible with proper ARIA labels
 * - Keyboard navigable
 */
export const AccessDenied = memo(function AccessDenied() {
    const { user } = useAuthStore();
    const location = useLocation();
    const state = location.state as LocationState | null;

    const userRole = (user?.role || 'VIEWER') as UserRole;
    const roleLabel = getRoleLabel(userRole);
    const roleColor = getRoleColor(userRole);
    const roleConfig = getRoleConfig(userRole);

    // Format required roles for display
    const requiredRolesDisplay = useMemo(() => {
        if (!state?.requiredRoles || state.requiredRoles.length === 0) return null;
        return state.requiredRoles.map(r => getRoleLabel(r)).join(', ');
    }, [state?.requiredRoles]);

    // Handle go back safely
    const handleGoBack = () => {
        // Check if we have history to go back to
        if (window.history.length > 2) {
            window.history.back();
        } else {
            // Fallback to dashboard
            window.location.href = '/';
        }
    };

    return (
        <div
            className="min-h-screen bg-[#030304] flex items-center justify-center p-4"
            role="main"
            aria-labelledby="access-denied-title"
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="max-w-md w-full text-center"
            >
                {/* Icon with pulse effect */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', damping: 12, stiffness: 200 }}
                    className="w-24 h-24 mx-auto mb-8 rounded-full bg-red-500/10 flex items-center justify-center relative"
                    aria-hidden="true"
                >
                    <ShieldOff className="w-12 h-12 text-red-500" />
                    <motion.div
                        className="absolute inset-0 rounded-full border-2 border-red-500/30"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.2, opacity: 0 }}
                        transition={{
                            repeat: Infinity,
                            duration: 2,
                            ease: 'easeOut'
                        }}
                    />
                </motion.div>

                {/* Title */}
                <h1
                    id="access-denied-title"
                    className="text-3xl font-bold text-white mb-2"
                >
                    Access Denied
                </h1>

                {/* Error code */}
                <p className="text-sm text-red-400/60 font-mono mb-4">
                    Error 403 — Forbidden
                </p>

                {/* Message */}
                <p className="text-[var(--text-muted)] mb-6">
                    You don't have permission to access this page.
                    {state?.from && (
                        <span className="block mt-1 text-sm font-mono text-white/40">
                            Attempted: {state.from}
                        </span>
                    )}
                </p>

                {/* Required Roles Alert */}
                {requiredRolesDisplay && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mb-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-left"
                    >
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-medium text-amber-400 mb-1">
                                    Required access level:
                                </p>
                                <p className="text-xs text-amber-400/80">
                                    {requiredRolesDisplay}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Role Badge */}
                <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
                    role="status"
                    aria-label={`Your current role is ${roleLabel}`}
                >
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: roleColor }}
                        aria-hidden="true"
                    />
                    <span className="text-sm text-[var(--text-muted)]">
                        Your role: <span className="text-white font-medium">{roleLabel}</span>
                    </span>
                    <span className="text-xs text-[var(--text-muted)] capitalize px-2 py-0.5 rounded bg-white/5">
                        {roleConfig.scope} scope
                    </span>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-black rounded-xl font-semibold hover:shadow-[0_0_20px_rgba(185,255,102,0.4)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[#030304]"
                        aria-label="Go to Dashboard"
                    >
                        <Home className="w-4 h-4" aria-hidden="true" />
                        Go to Dashboard
                    </Link>
                    <button
                        onClick={handleGoBack}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 text-white rounded-xl font-semibold hover:bg-white/10 transition-all border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[#030304]"
                        aria-label="Go back to previous page"
                    >
                        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                        Go Back
                    </button>
                </div>

                {/* Help text */}
                <p className="text-xs text-[var(--text-muted)] mt-8">
                    If you believe this is an error, please{' '}
                    <a
                        href="mailto:admin@coreops.com"
                        className="text-[var(--primary)] hover:underline focus:outline-none focus:underline"
                    >
                        contact your administrator
                    </a>.
                </p>

                {/* Timestamp for debugging */}
                <p className="text-xs text-white/20 mt-4 font-mono">
                    {new Date().toISOString()}
                </p>
            </motion.div>
        </div>
    );
});

export default AccessDenied;

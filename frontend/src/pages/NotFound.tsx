import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * 404 Not Found Page
 * Displayed for any unmatched routes.
 */
export function NotFound() {
    return (
        <div
            className="min-h-screen bg-[var(--bg-background)] flex items-center justify-center p-4"
            role="main"
            aria-labelledby="not-found-title"
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="max-w-md w-full text-center"
            >
                {/* Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', damping: 12, stiffness: 200 }}
                    className="w-24 h-24 mx-auto mb-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center"
                    aria-hidden="true"
                >
                    <Search className="w-12 h-12 text-[var(--primary)]" />
                </motion.div>

                {/* 404 Display */}
                <h1
                    id="not-found-title"
                    className="text-7xl font-extrabold text-[var(--text-primary)] mb-2 tracking-tight"
                >
                    404
                </h1>
                <p className="text-sm text-[var(--primary)] font-mono mb-4">
                    PAGE_NOT_FOUND
                </p>

                {/* Message */}
                <p className="text-[var(--text-muted)] mb-8">
                    The page you're looking for doesn't exist or has been moved.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-black rounded-xl font-semibold hover:shadow-[0_0_20px_rgba(185,255,102,0.4)] transition-all"
                    >
                        <Home className="w-4 h-4" />
                        Go to Dashboard
                    </Link>
                    <button
                        onClick={() => window.history.length > 2 ? window.history.back() : (window.location.href = '/')}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--bg-overlay)] text-[var(--text-primary)] rounded-xl font-semibold hover:bg-[var(--bg-card-hover)] transition-all border border-[var(--border-color)]"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </button>
                </div>

                {/* Decorative line */}
                <div className="mt-12 flex items-center gap-2 justify-center text-[var(--text-muted)] text-xs font-mono">
                    <div className="w-2 h-2 rounded-full bg-[var(--primary)]/30" />
                    CoreOps ERP v3.0
                </div>
            </motion.div>
        </div>
    );
}

export default NotFound;

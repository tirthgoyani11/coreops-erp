import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function MainLayout() {
    const { isAuthenticated, isInitializing } = useAuthStore();
    const { isSidebarCollapsed } = useUIStore();
    const location = useLocation();

    // Wait for initial auth check (checkAuth via refresh cookie) before redirecting
    if (isInitializing) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[var(--bg-background)]">
                <Loader2 className="w-8 h-8 text-[#10b981] animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const desktopMargin = isSidebarCollapsed ? 80 : 280;

    return (
        <div className="min-h-screen bg-[var(--bg-background)]">
            <Sidebar />
            <main
                className="flex-1 transition-all duration-300 ease-in-out"
            >
                <style>{`
                    @media (min-width: 1024px) {
                        main { margin-left: ${desktopMargin}px !important; }
                    }
                `}</style>

                <Header />

                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 md:p-8 max-w-[1600px] mx-auto"
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}

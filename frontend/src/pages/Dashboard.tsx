import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Loader2 } from 'lucide-react';

/**
 * Dashboard Router
 * Redirects to role-appropriate dashboard
 */
export function Dashboard() {
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading } = useAuthStore();

    useEffect(() => {
        if (isLoading) return;

        if (!isAuthenticated || !user) {
            navigate('/login', { replace: true });
            return;
        }

        // Route based on role
        const getDashboardPath = () => {
            switch (user.role) {
                case 'SUPER_ADMIN':
                    return '/dashboard/admin';
                case 'MANAGER':
                    return '/dashboard/branch';
                case 'TECHNICIAN':
                    return '/dashboard/tech';
                case 'VIEWER':
                    return '/dashboard/viewer';
                case 'STAFF':
                default:
                    return '/dashboard/branch'; // Staff see manager dashboard
            }
        };

        navigate(getDashboardPath(), { replace: true });
    }, [user, isAuthenticated, isLoading, navigate]);

    // Show loading while determining redirect
    return (
        <div className="min-h-screen bg-[#030304] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin" />
                <p className="text-[var(--text-muted)]">Loading dashboard...</p>
            </div>
        </div>
    );
}

export default Dashboard;

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import type { User } from '../../types';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: Array<'SUPER_ADMIN' | 'MANAGER' | 'STAFF'>;
    fallbackPath?: string;
}

/**
 * Role-Based Access Control Guard Component
 * 
 * Protects routes based on user roles. If user doesn't have required role,
 * they are redirected to the fallback path (default: dashboard).
 * 
 * Usage:
 * <RoleGuard allowedRoles={['SUPER_ADMIN', 'MANAGER']}>
 *   <ProtectedComponent />
 * </RoleGuard>
 */
export function RoleGuard({ children, allowedRoles, fallbackPath = '/' }: RoleGuardProps) {
    const { user, isAuthenticated } = useAuthStore();

    // If not authenticated, MainLayout will handle redirect to login
    if (!isAuthenticated || !user) {
        return null;
    }

    // Check if user has required role
    const hasRequiredRole = allowedRoles.includes(user.role as User['role']);

    if (!hasRequiredRole) {
        return <Navigate to={fallbackPath} replace />;
    }

    return <>{children}</>;
}

/**
 * Higher-Order Component version for class-based usage
 */
export function withRoleGuard<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    allowedRoles: Array<'SUPER_ADMIN' | 'MANAGER' | 'STAFF'>,
    fallbackPath?: string
) {
    return function WithRoleGuardWrapper(props: P) {
        return (
            <RoleGuard allowedRoles={allowedRoles} fallbackPath={fallbackPath}>
                <WrappedComponent {...props} />
            </RoleGuard>
        );
    };
}

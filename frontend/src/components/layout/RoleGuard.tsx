import { Navigate, useLocation } from 'react-router-dom';
import { memo, useMemo } from 'react';
import { useAuthStore } from '../../stores/authStore';
import type { UserRole } from '../../types';

// Re-export UserRole for convenience
export type { UserRole };

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
    fallbackPath?: string;
    /** If true, shows nothing while checking (useful for inline guards) */
    silent?: boolean;
}

/**
 * Role-Based Access Control Guard Component
 * 
 * Protects routes based on user roles. If user doesn't have required role,
 * they are redirected to the access denied page.
 * 
 * Supported Roles (Phase 2):
 * - SUPER_ADMIN: Full system access (Level 5)
 * - REGIONAL_MANAGER: Regional scope access (Level 4)
 * - BRANCH_MANAGER: Branch scope access (Level 3)
 * - TECHNICIAN: Assigned tickets only (Level 2)
 * - VIEWER: Read-only access (Level 1)
 * 
 * @example
 * // Route protection
 * <RoleGuard allowedRoles={['SUPER_ADMIN', 'REGIONAL_MANAGER']}>
 *   <ProtectedComponent />
 * </RoleGuard>
 * 
 * @example
 * // Conditional rendering (silent mode)
 * <RoleGuard allowedRoles={['SUPER_ADMIN']} silent>
 *   <AdminOnlyButton />
 * </RoleGuard>
 */
export const RoleGuard = memo(function RoleGuard({
    children,
    allowedRoles,
    fallbackPath = '/access-denied',
    silent = false
}: RoleGuardProps) {
    const { user, isAuthenticated, isLoading } = useAuthStore();
    const location = useLocation();

    // Memoize role check to prevent unnecessary re-renders
    const hasRequiredRole = useMemo(() => {
        if (!user?.role) return false;
        return allowedRoles.includes(user.role as UserRole);
    }, [user?.role, allowedRoles]);

    // Show loading state while auth is being checked
    if (isLoading) {
        return null;
    }

    // If not authenticated, MainLayout will handle redirect to login
    if (!isAuthenticated || !user) {
        return null;
    }

    // Silent mode: just hide content instead of redirecting
    if (!hasRequiredRole && silent) {
        return null;
    }

    // Redirect to access denied page with state for potential back navigation
    if (!hasRequiredRole) {
        return (
            <Navigate
                to={fallbackPath}
                replace
                state={{ from: location.pathname, requiredRoles: allowedRoles }}
            />
        );
    }

    return <>{children}</>;
});

/**
 * Higher-Order Component version for wrapping entire components
 * 
 * @example
 * const ProtectedPage = withRoleGuard(MyPage, ['SUPER_ADMIN']);
 */
export function withRoleGuard<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    allowedRoles: UserRole[],
    fallbackPath?: string
) {
    const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

    function WithRoleGuardWrapper(props: P) {
        return (
            <RoleGuard allowedRoles={allowedRoles} fallbackPath={fallbackPath}>
                <WrappedComponent {...props} />
            </RoleGuard>
        );
    }

    WithRoleGuardWrapper.displayName = `withRoleGuard(${displayName})`;
    return WithRoleGuardWrapper;
}

/**
 * Role hierarchy for permission level checks
 * Higher number = more permissions
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
    SUPER_ADMIN: 5,
    REGIONAL_MANAGER: 4,
    BRANCH_MANAGER: 3,
    TECHNICIAN: 2,
    VIEWER: 1,
} as const;

/**
 * Check if user has at least a certain role level
 * 
 * @example
 * if (hasMinimumRole('BRANCH_MANAGER', 'REGIONAL_MANAGER')) {
 *   // Branch Manager doesn't have Regional Manager level
 * }
 */
export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

/**
 * Get all roles at or above a certain level
 * Useful for building allowedRoles arrays dynamically
 * 
 * @example
 * const managerRoles = getRolesAbove('BRANCH_MANAGER');
 * // ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER']
 */
export function getRolesAbove(minimumRole: UserRole): UserRole[] {
    const minLevel = ROLE_HIERARCHY[minimumRole];
    return (Object.keys(ROLE_HIERARCHY) as UserRole[]).filter(
        role => ROLE_HIERARCHY[role] >= minLevel
    );
}

/**
 * Get all roles below a certain level (exclusive)
 * 
 * @example
 * const staffRoles = getRolesBelow('BRANCH_MANAGER');
 * // ['TECHNICIAN', 'VIEWER']
 */
export function getRolesBelow(maxRole: UserRole): UserRole[] {
    const maxLevel = ROLE_HIERARCHY[maxRole];
    return (Object.keys(ROLE_HIERARCHY) as UserRole[]).filter(
        role => ROLE_HIERARCHY[role] < maxLevel
    );
}

/**
 * Custom hook to check if current user has a specific role
 */
export function useHasRole(allowedRoles: UserRole[]): boolean {
    const { user } = useAuthStore();
    return useMemo(() => {
        if (!user?.role) return false;
        return allowedRoles.includes(user.role as UserRole);
    }, [user?.role, allowedRoles]);
}

/**
 * Custom hook to check if current user has minimum role level
 */
export function useHasMinimumRole(minimumRole: UserRole): boolean {
    const { user } = useAuthStore();
    return useMemo(() => {
        if (!user?.role) return false;
        return hasMinimumRole(user.role as UserRole, minimumRole);
    }, [user?.role, minimumRole]);
}

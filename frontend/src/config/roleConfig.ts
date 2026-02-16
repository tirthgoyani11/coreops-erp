import type { UserRole } from '../types';
import {
    Home,
    LayoutDashboard,
    Package,
    Wrench,
    Truck,
    ShoppingCart,
    BarChart3,
    Building2,
    Users,
    Shield,
    Settings,
    Bell,
    Ticket,
    DollarSign,
    FileText,
    type LucideIcon
} from 'lucide-react';

// ===========================================
// ROLE CONFIGURATION
// ===========================================

export interface NavItem {
    label: string;
    path: string;
    icon: LucideIcon;
    roles: UserRole[];  // Which roles can see this item
    badge?: 'approvals' | 'notifications'; // Dynamic badges
}

export interface RoleConfig {
    label: string;
    description: string;
    approvalLimit: number | null;  // null = unlimited
    scope: 'global' | 'regional' | 'branch' | 'assigned';
    color: string;
    dashboardWidgets: string[];
}

// ===========================================
// ROLE DEFINITIONS
// ===========================================

export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
    SUPER_ADMIN: {
        label: 'Super Admin',
        description: 'Full platform access',
        approvalLimit: null, // Unlimited
        scope: 'global',
        color: '#ef4444', // Red
        dashboardWidgets: [
            'globalAssetValue',
            'systemHealth',
            'allPendingApprovals',
            'userActivityHeatmap',
            'multiRegionComparison',
            'currencyPerformance',
            'recentAuditEvents',
            'topVendorsMTBF',
            'criticalAlerts',
            'quickActions'
        ]
    },
    ADMIN: {
        label: 'Admin',
        description: 'Full operational access',
        approvalLimit: null, // Unlimited
        scope: 'global',
        color: '#dc2626', // Crimson
        dashboardWidgets: [
            'globalAssetValue',
            'allPendingApprovals',
            'userActivityHeatmap',
            'multiRegionComparison',
            'recentAuditEvents',
            'topVendorsMTBF',
            'criticalAlerts',
            'quickActions'
        ]
    },
    MANAGER: {
        label: 'Manager',
        description: 'Branch/Regional management',
        approvalLimit: 5000,
        scope: 'regional',
        color: '#f97316', // Orange
        dashboardWidgets: [
            'regionalAssetCount',
            'branchComparisonChart',
            'pendingApprovalsRegion',
            'regionalBudgetStatus',
            'criticalTicketsAlert',
            'crossBranchTransfers',
            'vendorPerformance',
            'regionalExpensesTrend'
        ]
    },
    STAFF: {
        label: 'Staff',
        description: 'Standard operational access',
        approvalLimit: 500,
        scope: 'branch',
        color: '#eab308', // Yellow
        dashboardWidgets: [
            'branchAssetHealth',
            'todaysTickets',
            'approvalQueueBranch',
            'inventoryStatus',
            'mtdExpensesVsBudget',
            'technicianWorkload'
        ]
    },
    TECHNICIAN: {
        label: 'Technician',
        description: 'Assigned tasks only',
        approvalLimit: 0,
        scope: 'assigned',
        color: '#22c55e', // Green
        dashboardWidgets: [
            'myOpenTickets',
            'todaysSchedule',
            'partsAvailability',
            'completedThisWeek'
        ]
    },
    VIEWER: {
        label: 'Viewer',
        description: 'Read-only access',
        approvalLimit: 0,
        scope: 'assigned',
        color: '#3b82f6', // Blue
        dashboardWidgets: [
            'assetsInScope',
            'recentActivities',
            'transactionSummary',
            'complianceStatus'
        ]
    }
};

// ===========================================
// NAVIGATION ITEMS
// ===========================================

export const NAV_ITEMS: NavItem[] = [
    // Dashboard - everyone
    {
        label: 'Dashboard',
        path: '/',
        icon: Home,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER']
    },

    // Assets - Managers/Staff can CRUD, Tech/Viewer read-only
    {
        label: 'Assets',
        path: '/assets',
        icon: LayoutDashboard,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER']
    },

    // Inventory - Managers/Staff full, Tech consume only, Viewer read
    {
        label: 'Inventory',
        path: '/inventory',
        icon: Package,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER']
    },

    // Maintenance - Everyone except Viewer
    {
        label: 'Maintenance',
        path: '/maintenance',
        icon: Wrench,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER']
    },

    // My Tickets - Technicians only (simplified view)
    {
        label: 'My Tickets',
        path: '/my-tickets',
        icon: Ticket,
        roles: ['TECHNICIAN']
    },

    // Vendors - Managers/Staff and above
    {
        label: 'Vendors',
        path: '/vendors',
        icon: Truck,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']
    },

    // Purchase Orders - Managers/Staff only
    {
        label: 'Purchase Orders',
        path: '/purchase-orders',
        icon: ShoppingCart,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']
    },

    // Financial - Managers/Staff only (or Viewer read)
    {
        label: 'Financial',
        path: '/financial',
        icon: DollarSign,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']
    },

    // Analytics - Not for Technician
    {
        label: 'Analytics',
        path: '/analytics',
        icon: BarChart3,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']
    },

    // Reports - Viewer can export
    {
        label: 'Reports',
        path: '/reports',
        icon: FileText,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']
    },

    // Offices - Admins only
    {
        label: 'Organizations',
        path: '/offices',
        icon: Building2,
        roles: ['SUPER_ADMIN', 'ADMIN']
    },

    // Branches - Managers can view
    {
        label: 'Branches',
        path: '/branches',
        icon: Building2,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER']
    },

    // Users - Varies by role
    {
        label: 'Users',
        path: '/users',
        icon: Users,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']
    },

    // Audit Logs - Admin + read for Viewer
    {
        label: 'Audit Logs',
        path: '/audit-logs',
        icon: Shield,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']
    },

    // Notifications - Everyone
    {
        label: 'Notifications',
        path: '/notifications',
        icon: Bell,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER'],
        badge: 'notifications'
    },

    // Settings - Admin only
    {
        label: 'Settings',
        path: '/settings',
        icon: Settings,
        roles: ['SUPER_ADMIN']
    }
];

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get navigation items for a specific role
 */
export function getNavItemsForRole(role: UserRole): NavItem[] {
    return NAV_ITEMS.filter(item => item.roles.includes(role));
}

/**
 * Get role configuration
 */
export function getRoleConfig(role: UserRole): RoleConfig {
    return ROLE_CONFIG[role];
}

/**
 * Check if user can approve an amount
 */
export function canApproveAmount(role: UserRole, amount: number): boolean {
    const config = ROLE_CONFIG[role];
    if (config.approvalLimit === null) return true; // Unlimited
    return amount <= config.approvalLimit;
}

/**
 * Get approval limit for role
 */
export function getApprovalLimit(role: UserRole): number | null {
    return ROLE_CONFIG[role].approvalLimit;
}

/**
 * Check if role can access a specific feature
 */
export function hasPermission(role: UserRole, feature: string): boolean {
    const permissions: Record<string, UserRole[]> = {
        'assets.create': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'],
        'assets.edit': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'],
        'assets.delete': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
        'assets.transfer': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'],

        'tickets.create': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN'],
        'tickets.approve': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
        'tickets.assign': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],

        'inventory.manage': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'],
        'inventory.consume': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN'],

        'vendors.create': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
        'vendors.edit': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],

        'users.create': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
        'users.manage.all': ['SUPER_ADMIN', 'ADMIN'],
        'users.manage.regional': ['MANAGER'],
        'users.manage.branch': ['STAFF'],

        'settings.access': ['SUPER_ADMIN'],
        'audit.full': ['SUPER_ADMIN', 'ADMIN'],
        'audit.read': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],

        'export.data': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
        'financial.view': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']
    };

    return permissions[feature]?.includes(role) ?? false;
}

/**
 * Get role color for badges/tags
 */
export function getRoleColor(role: UserRole): string {
    return ROLE_CONFIG[role].color;
}

/**
 * Get role label for display
 */
export function getRoleLabel(role: UserRole): string {
    return ROLE_CONFIG[role].label;
}

/**
 * Get dashboard widgets for role
 */
export function getDashboardWidgets(role: UserRole): string[] {
    return ROLE_CONFIG[role].dashboardWidgets;
}

export default {
    ROLE_CONFIG,
    NAV_ITEMS,
    getNavItemsForRole,
    getRoleConfig,
    canApproveAmount,
    getApprovalLimit,
    hasPermission,
    getRoleColor,
    getRoleLabel,
    getDashboardWidgets
};

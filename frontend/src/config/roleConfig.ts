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
        description: 'Full system access',
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
    REGIONAL_MANAGER: {
        label: 'Regional Manager',
        description: 'Multi-branch access',
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
    BRANCH_MANAGER: {
        label: 'Branch Manager',
        description: 'Single branch access',
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
        roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'TECHNICIAN', 'VIEWER']
    },

    // Assets - Managers can CRUD, Tech/Viewer read-only
    {
        label: 'Assets',
        path: '/assets',
        icon: LayoutDashboard,
        roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'TECHNICIAN', 'VIEWER']
    },

    // Inventory - Managers full, Tech consume only, Viewer read
    {
        label: 'Inventory',
        path: '/inventory',
        icon: Package,
        roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'TECHNICIAN', 'VIEWER']
    },

    // Maintenance - Everyone except Viewer
    {
        label: 'Maintenance',
        path: '/maintenance',
        icon: Wrench,
        roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'TECHNICIAN', 'VIEWER']
    },

    // My Tickets - Technicians only (simplified view)
    {
        label: 'My Tickets',
        path: '/my-tickets',
        icon: Ticket,
        roles: ['TECHNICIAN']
    },

    // Vendors - Managers and above
    {
        label: 'Vendors',
        path: '/vendors',
        icon: Truck,
        roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'VIEWER']
    },

    // Purchase Orders - Managers only
    {
        label: 'Purchase Orders',
        path: '/purchase-orders',
        icon: ShoppingCart,
        roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER']
    },

    // Financial - Managers only (or Viewer read)
    {
        label: 'Financial',
        path: '/financial',
        icon: DollarSign,
        roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'VIEWER']
    },

    // Analytics - Not for Technician
    {
        label: 'Analytics',
        path: '/analytics',
        icon: BarChart3,
        roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'VIEWER']
    },

    // Reports - Viewer can export
    {
        label: 'Reports',
        path: '/reports',
        icon: FileText,
        roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'VIEWER']
    },

    // Offices - Admins only
    {
        label: 'Organizations',
        path: '/offices',
        icon: Building2,
        roles: ['SUPER_ADMIN']
    },

    // Branches - Regional+ can view
    {
        label: 'Branches',
        path: '/branches',
        icon: Building2,
        roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER']
    },

    // Users - Varies by role
    {
        label: 'Users',
        path: '/users',
        icon: Users,
        roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER']
    },

    // Audit Logs - Admin + read for Viewer
    {
        label: 'Audit Logs',
        path: '/audit-logs',
        icon: Shield,
        roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'VIEWER']
    },

    // Notifications - Everyone
    {
        label: 'Notifications',
        path: '/notifications',
        icon: Bell,
        roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'TECHNICIAN', 'VIEWER'],
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
        'assets.create': ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER'],
        'assets.edit': ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER'],
        'assets.delete': ['SUPER_ADMIN', 'REGIONAL_MANAGER'],
        'assets.transfer': ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER'],

        'tickets.create': ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'TECHNICIAN'],
        'tickets.approve': ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER'],
        'tickets.assign': ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER'],

        'inventory.manage': ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER'],
        'inventory.consume': ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'TECHNICIAN'],

        'vendors.create': ['SUPER_ADMIN', 'REGIONAL_MANAGER'],
        'vendors.edit': ['SUPER_ADMIN', 'REGIONAL_MANAGER'],

        'users.create': ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER'],
        'users.manage.all': ['SUPER_ADMIN'],
        'users.manage.regional': ['REGIONAL_MANAGER'],
        'users.manage.branch': ['BRANCH_MANAGER'],

        'settings.access': ['SUPER_ADMIN'],
        'audit.full': ['SUPER_ADMIN'],
        'audit.read': ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'VIEWER'],

        'export.data': ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'VIEWER'],
        'financial.view': ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'VIEWER']
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

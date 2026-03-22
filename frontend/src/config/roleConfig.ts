import type { UserRole } from '../types';
import {
    Home,
    LayoutDashboard,
    Package,
    Wrench,
    Truck,
    ShoppingCart,
    BarChart3,
    Shield,
    Bell,
    FileText,
    Ticket,
    DollarSign,
    BookOpen,
    Brain,
    Users,
    type LucideIcon
} from 'lucide-react';

// ===========================================
// ROLE CONFIGURATION
// ===========================================

export interface NavItem {
    label: string;
    path?: string;
    icon: LucideIcon;
    roles: UserRole[];  // Which roles can see this item
    badge?: 'approvals' | 'notifications'; // Dynamic badges
    subItems?: { label: string; path: string; roles: UserRole[] }[];
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

    // Assets
    {
        label: 'Assets',
        path: '/assets',
        icon: LayoutDashboard,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER']
    },

    // Inventory Group
    {
        label: 'Inventory',
        icon: Package,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER'],
        subItems: [
            { label: 'Overview', path: '/inventory', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER'] },
            { label: 'Batch Tracking', path: '/inventory/batches', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER'] },
            { label: 'Stocktake', path: '/inventory/stocktake', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER'] },
            { label: 'Transfers', path: '/inventory/transfer', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'] },
            { label: 'Returns', path: '/inventory/returns', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'] },
            { label: 'Valuations', path: '/inventory/valuation', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'] },
            { label: 'Analytics', path: '/inventory-analytics', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'] }
        ]
    },

    // Maintenance
    {
        label: 'Maintenance',
        path: '/maintenance',
        icon: Wrench,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER']
    },

    // My Tickets
    {
        label: 'My Tickets',
        path: '/my-tickets',
        icon: Ticket,
        roles: ['TECHNICIAN']
    },

    // Vendors
    {
        label: 'Vendors',
        path: '/vendors',
        icon: Truck,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']
    },

    // Procurement Group
    {
        label: 'Procurement',
        icon: ShoppingCart,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'],
        subItems: [
            { label: 'Purchase Orders', path: '/purchase-orders', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'] },
            { label: 'Requisitions', path: '/procurement/requisitions', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'] },
            { label: 'RFQ\'s & Bidding', path: '/procurement/rfq', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'] },
            { label: 'Goods Receipt', path: '/procurement/grn', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'] }
        ]
    },

    // Sales & CRM Group
    {
        label: 'Sales & CRM',
        icon: Users,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'],
        subItems: [
            { label: 'Customers', path: '/sales/customers', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'] },
            { label: 'Quotations', path: '/sales/quotations', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'] },
            { label: 'Sales Orders', path: '/sales/orders', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'] }
        ]
    },

    // Financial Group
    {
        label: 'Financial',
        icon: DollarSign,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER', 'TECHNICIAN'],
        subItems: [
            { label: 'Overview', path: '/financial', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'] },
            { label: 'General Ledger', path: '/gl', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER'] },
            { label: 'Balance Sheet', path: '/balance-sheet', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER'] },
            { label: 'Profit & Loss', path: '/profit-loss', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER'] },
            { label: 'Cash Flow', path: '/cash-flow', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER'] },
            { label: 'Exception Center', path: '/finance/exception-center', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'] },
            { label: 'Bank Reconciliation', path: '/bank-reconciliation', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
            { label: 'Year End Close', path: '/year-end-close', roles: ['SUPER_ADMIN'] },
            { label: 'Expense Claims', path: '/expense-claims', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN'] }
        ]
    },

    // Analytics
    {
        label: 'Analytics',
        path: '/analytics',
        icon: BarChart3,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']
    },

    // Reports
    {
        label: 'Reports',
        path: '/reports',
        icon: FileText,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']
    },

    // AI & Intelligence
    {
        label: 'AI & Intelligence',
        icon: Brain,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'],
        subItems: [
            { label: 'Predictive Maintenance', path: '/maintenance/predictive', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
            { label: 'Invoice Scanner', path: '/invoice-scanner', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'] }
        ]
    },

    // Administration Group
    {
        label: 'Administration',
        icon: Shield,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
        subItems: [
            { label: 'Organization & Branches', path: '/offices', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
            { label: 'Users', path: '/users', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'] },
            { label: 'Audit Logs', path: '/audit-logs', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'] },
            { label: 'Settings', path: '/settings', roles: ['SUPER_ADMIN'] }
        ]
    },

    // Shared / System
    {
        label: 'Documents',
        path: '/documents',
        icon: BookOpen,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER']
    },
    {
        label: 'Notifications',
        path: '/notifications',
        icon: Bell,
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER'],
        badge: 'notifications'
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

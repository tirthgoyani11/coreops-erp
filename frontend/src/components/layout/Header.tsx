import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Bell, Plus, Menu, Sun, Moon, Globe, Building2, MapPin, User, X } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { getRoleLabel, getRoleColor, getRoleConfig, hasPermission } from '../../config/roleConfig';
import type { UserRole } from '../../types';
import { useSocket } from '../../hooks/useSocket';
import { useNotificationStore } from '../../stores/notificationStore';

// Scope icons mapping
const SCOPE_ICONS = {
    global: Globe,
    regional: MapPin,
    branch: Building2,
    assigned: User
} as const;

// Page title mappings for better display names
const PAGE_TITLES: Record<string, string> = {
    '': 'Dashboard',
    'assets': 'Assets',
    'inventory': 'Inventory',
    'maintenance': 'Maintenance',
    'vendors': 'Vendors',
    'purchase-orders': 'Purchase Orders',
    'analytics': 'Analytics',
    'notifications': 'Notifications',
    'audit-logs': 'Audit Logs',
    'users': 'Team Members',
    'offices': 'Organizations',
    'settings': 'Settings',
    'profile': 'My Profile',
    'access-denied': 'Access Denied'
};

/**
 * Header Component
 * 
 * Features:
 * - Role badge with scope indicator
 * - Approval limit display for managers
 * - Read-only indicator for viewers
 * - Notification badge with unread count
 * - Search bar (desktop only)
 * - Dark mode toggle
 * - Quick action button
 * 
 * All elements are properly accessible with ARIA labels.
 */
export const Header = memo(function Header() {
    const location = useLocation();
    const { setMobileSidebarOpen } = useUIStore();
    const { isDarkMode, toggleTheme } = useThemeStore();
    const { user } = useAuthStore();
    const { unreadCount, fetchUnreadCount } = useNotificationStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // Initialize Socket.IO connection
    useSocket();

    // Memoize role-related values
    const roleInfo = useMemo(() => {
        const userRole = (user?.role || 'VIEWER') as UserRole;
        return {
            role: userRole,
            label: getRoleLabel(userRole),
            color: getRoleColor(userRole),
            config: getRoleConfig(userRole)
        };
    }, [user?.role]);

    const ScopeIcon = SCOPE_ICONS[roleInfo.config.scope];

    // Get page title
    const pageTitle = useMemo(() => {
        const path = location.pathname.substring(1).split('/')[0];
        return PAGE_TITLES[path] || path
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }, [location.pathname]);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 60000); // Poll every minute as backup
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    // Handle search (placeholder for now)
    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            console.log('Search:', searchQuery);
            // TODO: Implement global search
        }
    }, [searchQuery]);

    // Check if user can create (for the New Action button)
    const canCreate = useMemo(() => {
        return hasPermission(roleInfo.role, 'assets.create') ||
            hasPermission(roleInfo.role, 'tickets.create');
    }, [roleInfo.role]);

    return (
        <header
            className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 border-b border-[var(--border-color)] bg-[var(--bg-overlay)] backdrop-blur-md sticky top-0 z-40"
            role="banner"
        >
            <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                <button
                    onClick={() => setMobileSidebarOpen(true)}
                    className="lg:hidden w-10 h-10 rounded-xl border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    aria-label="Open navigation menu"
                    aria-expanded="false"
                >
                    <Menu className="w-5 h-5" aria-hidden="true" />
                </button>

                <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] tracking-tight truncate max-w-[200px] md:max-w-none">
                    {pageTitle}
                </h1>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
                {/* Role Badge with Scope Indicator */}
                <div
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)]"
                    role="status"
                    aria-label={`Current role: ${roleInfo.label}, Scope: ${roleInfo.config.scope}`}
                >
                    <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: roleInfo.color }}
                        aria-hidden="true"
                    />
                    <span className="text-xs font-medium text-[var(--text-primary)]">{roleInfo.label}</span>
                    <div className="w-px h-3 bg-[var(--border-color)]" aria-hidden="true" />
                    <ScopeIcon className="w-3 h-3 text-[var(--text-secondary)]" aria-hidden="true" />
                    <span className="text-xs text-[var(--text-secondary)] capitalize">{roleInfo.config.scope}</span>
                </div>

                {/* Approval Limit Badge - Only for managers with limits */}
                {roleInfo.config.approvalLimit !== null && roleInfo.config.approvalLimit > 0 && (
                    <div
                        className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20"
                        role="status"
                        aria-label={`Approval limit: $${roleInfo.config.approvalLimit.toLocaleString()}`}
                    >
                        <span className="text-xs text-emerald-400 font-medium">
                            ${roleInfo.config.approvalLimit.toLocaleString()} limit
                        </span>
                    </div>
                )}

                {/* Read-only indicator for Viewer */}
                {roleInfo.role === 'VIEWER' && (
                    <div
                        className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/20"
                        role="status"
                        aria-label="You have read-only access"
                    >
                        <span className="text-xs text-blue-400 font-medium">Read-only</span>
                    </div>
                )}

                {/* Search - Desktop only */}
                <form onSubmit={handleSearch} className="relative group hidden lg:block">
                    <Search
                        className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isSearchFocused ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'
                            }`}
                        aria-hidden="true"
                    />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        placeholder="Search..."
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)] w-48 transition-all"
                        aria-label="Search"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            aria-label="Clear search"
                        >
                            <X className="w-3 h-3" aria-hidden="true" />
                        </button>
                    )}
                </form>

                {/* Notifications Link */}
                <Link
                    to="/notifications"
                    className="w-10 h-10 rounded-full border border-[var(--border-color)] flex items-center justify-center hover:bg-[var(--bg-card-hover)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] relative focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                >
                    <Bell className="w-4 h-4" aria-hidden="true" />
                    {unreadCount > 0 && (
                        <span
                            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-[var(--bg-background)]"
                            aria-hidden="true"
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Link>

                {/* Dark Mode Toggle */}
                <button
                    onClick={toggleTheme}
                    className="w-10 h-10 rounded-full border border-[var(--border-color)] flex items-center justify-center hover:bg-[var(--bg-card-hover)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    aria-pressed={isDarkMode}
                >
                    {isDarkMode ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
                </button>

                {/* Quick Action Button - Only if user can create */}
                {canCreate && (
                    <button
                        className="h-10 px-3 md:px-5 bg-[var(--primary)] text-[var(--primary-fg)] rounded-full text-sm font-bold flex items-center gap-2 hover:shadow-[0_0_20px_rgba(185,255,102,0.4)] transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-background)]"
                        aria-label="Create new item"
                    >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                        <span className="hidden md:inline">New</span>
                    </button>
                )}
            </div>
        </header >
    );
});

export default Header;

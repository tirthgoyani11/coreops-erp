import { NavLink, useLocation } from 'react-router-dom';
import { LogOut, Layers, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getNavItemsForRole, getRoleLabel, getRoleColor } from '../../config/roleConfig';
import type { UserRole } from '../../types';

export function Sidebar() {
    const { user, logout } = useAuthStore();
    const { isSidebarCollapsed, toggleSidebar, isMobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
    const location = useLocation();

    // Get navigation items based on user role
    const userRole = (user?.role || 'VIEWER') as UserRole;
    const navItems = getNavItemsForRole(userRole);
    const roleLabel = getRoleLabel(userRole);
    const roleColor = getRoleColor(userRole);

    const SidebarContent = () => (
        <>
            {/* Brand Header */}
            <div className={cn("h-20 flex items-center border-b border-[var(--sidebar-border)]", isSidebarCollapsed && !isMobileSidebarOpen ? "justify-center px-0" : "px-8 justify-between")}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center shadow-[0_0_15px_rgba(185,255,102,0.3)] shrink-0">
                        <Layers className="w-4 h-4 text-black" />
                    </div>
                    {(!isSidebarCollapsed || isMobileSidebarOpen) && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xl font-bold tracking-tight truncate text-[var(--sidebar-text)]"
                        >
                            CoreOps
                        </motion.span>
                    )}
                </div>

                {/* Mobile Close Button */}
                {isMobileSidebarOpen && (
                    <button
                        onClick={() => setMobileSidebarOpen(false)}
                        className="lg:hidden p-2 hover:bg-[var(--sidebar-hover)] rounded-lg text-[var(--sidebar-text-muted)]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                {(!isSidebarCollapsed || isMobileSidebarOpen) && (
                    <p className="px-4 text-[10px] font-bold text-[var(--sidebar-text-muted)] uppercase tracking-wider mb-4 truncate">
                        Main Menu
                    </p>
                )}

                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const IconComponent = item.icon;

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setMobileSidebarOpen(false)}
                            className={cn(
                                "flex items-center rounded-xl transition-all group relative overflow-hidden",
                                isSidebarCollapsed && !isMobileSidebarOpen ? "justify-center w-12 h-12 mx-auto" : "px-4 py-3 gap-3",
                                isActive
                                    ? "bg-[var(--sidebar-active)] text-[var(--sidebar-text)]"
                                    : "text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)]"
                            )}
                            title={isSidebarCollapsed && !isMobileSidebarOpen ? item.label : undefined}
                        >
                            <IconComponent className={cn("w-5 h-5 shrink-0", isActive ? "text-[var(--primary)]" : "group-hover:text-[var(--sidebar-text)]")} />

                            {(!isSidebarCollapsed || isMobileSidebarOpen) && (
                                <span className="font-medium text-sm truncate">{item.label}</span>
                            )}

                            {isActive && (
                                <div className={cn(
                                    "absolute bg-[var(--primary)] rounded-full shadow-[0_0_10px_var(--primary)]",
                                    isSidebarCollapsed && !isMobileSidebarOpen ? "bottom-1 w-1 h-1 left-1/2 -translate-x-1/2" : "right-0 top-0 h-full w-1 rounded-l-full"
                                )} />
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* User Footer with Role Badge */}
            <div className="p-4 border-t border-[var(--sidebar-border)]">
                <div className={cn(
                    "bg-[var(--sidebar-hover)] rounded-2xl flex items-center transition-colors group relative cursor-pointer",
                    isSidebarCollapsed && !isMobileSidebarOpen ? "justify-center p-2 w-12 h-12 mx-auto" : "p-4 gap-3 hover:bg-[var(--sidebar-active)]"
                )}>
                    <div
                        className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)` }}
                    >
                        {user?.name?.charAt(0)}
                    </div>

                    {(!isSidebarCollapsed || isMobileSidebarOpen) && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate text-[var(--sidebar-text)]">{user?.name}</p>
                                <p
                                    className="text-xs truncate"
                                    style={{ color: roleColor }}
                                >
                                    {roleLabel}
                                </p>
                            </div>
                            <button
                                onClick={logout}
                                className="p-2 -mr-2 text-[var(--sidebar-text-muted)] hover:text-red-400 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isSidebarCollapsed ? 80 : 280 }}
                className="hidden lg:flex fixed left-0 top-0 h-screen bg-[var(--bg-sidebar)] border-r border-[var(--sidebar-border)] flex-col z-50 transition-all duration-300 ease-in-out"
            >
                <SidebarContent />

                {/* Toggle Button */}
                <button
                    onClick={toggleSidebar}
                    className="absolute -right-3 top-24 w-6 h-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors z-50"
                >
                    {isSidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                </button>
            </motion.aside>

            {/* Mobile Sidebar Drawer */}
            <AnimatePresence>
                {isMobileSidebarOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileSidebarOpen(false)}
                            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />

                        {/* Drawer */}
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="lg:hidden fixed left-0 top-0 h-screen w-[280px] bg-[var(--bg-sidebar)] border-r border-[var(--sidebar-border)] flex flex-col z-50"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

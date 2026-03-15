import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Layers, ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getNavItemsForRole, getRoleLabel, getRoleColor } from '../../config/roleConfig';
import type { UserRole } from '../../types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

export function Sidebar() {
    const { user, logout } = useAuthStore();
    const { isSidebarCollapsed, toggleSidebar, isMobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
    const location = useLocation();
    const navigate = useNavigate();

    // State for expanded accordion menus
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

    // Get navigation items based on user role
    const userRole = (user?.role || 'VIEWER') as UserRole;
    const navItems = getNavItemsForRole(userRole);
    const roleLabel = getRoleLabel(userRole);
    const roleColor = getRoleColor(userRole);

    // Auto-expand menu if a child is active
    useEffect(() => {
        const activeItem = navItems.find(item =>
            item.subItems?.some(subItem => location.pathname === subItem.path)
        );
        if (activeItem && activeItem.label && !expandedMenus.includes(activeItem.label)) {
            setExpandedMenus(prev => [...prev, activeItem.label]);
        }
    }, [location.pathname, navItems]);

    const toggleMenu = (label: string) => {
        setExpandedMenus(prev =>
            prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
        );
    };

    // Instead of declaring a component inside a component (which causes remounts), we assign the JSX to a variable
    const sidebarContentJSX = (
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
                    <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4 truncate">
                        Main Menu
                    </p>
                )}

                {navItems.map((item) => {
                    const isActive = item.path ? location.pathname === item.path : false;
                    const isChildActive = item.subItems?.some(sub => location.pathname === sub.path);
                    const isExpanded = expandedMenus.includes(item.label);
                    const IconComponent = item.icon;

                    if (item.subItems && item.subItems.length > 0) {
                        const menuBtnClasses = cn(
                            "flex items-center rounded-xl transition-all group relative overflow-hidden w-full text-left",
                            isSidebarCollapsed && !isMobileSidebarOpen ? "justify-center w-12 h-12 mx-auto outline-none" : "px-4 py-3 gap-3",
                            isChildActive
                                ? "text-[var(--sidebar-active-text)]"
                                : "text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text)]"
                        );

                        const menuBtnContent = (
                            <>
                                <IconComponent className={cn("w-5 h-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1", isChildActive ? "text-[var(--sidebar-active-text)]" : "group-hover:text-[var(--sidebar-text)]")} />
                                {(!isSidebarCollapsed || isMobileSidebarOpen) && (
                                    <>
                                        <span className="font-medium text-sm truncate flex-1 relative z-10">{item.label}</span>
                                        <ChevronDown className={cn("w-4 h-4 transition-transform relative z-10", isExpanded ? "rotate-180" : "")} />
                                    </>
                                )}
                                {/* Shared Hover/Active Background Block */}
                                {(isChildActive || isExpanded) ? (
                                    <motion.div
                                        layoutId="activeNavPill"
                                        className="absolute inset-0 bg-[var(--sidebar-active)] rounded-xl shadow-[0_0_15px_var(--primary-glow)] pointer-events-none"
                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                ) : (
                                    <div className="absolute inset-0 bg-[var(--sidebar-hover)] opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300 pointer-events-none" />
                                )}
                            </>
                        );

                        const menuBtn = (
                            <button
                                onClick={() => toggleMenu(item.label)}
                                className={menuBtnClasses}
                            >
                                {menuBtnContent}
                            </button>
                        );

                        return (
                            <div key={item.label} className="flex flex-col relative w-full mb-1">
                                {isSidebarCollapsed && !isMobileSidebarOpen ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className={menuBtnClasses}>
                                            {menuBtnContent}
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent 
                                            side="right" 
                                            align="start" 
                                            sideOffset={14} 
                                            className="w-52 bg-[var(--surface-elevated)] border-[var(--sidebar-border)] rounded-xl shadow-[var(--shadow-dropdown)] p-1.5"
                                        >
                                            <DropdownMenuGroup>
                                                <DropdownMenuLabel className="font-bold text-xs text-[var(--sidebar-text-muted)] uppercase tracking-wider px-2 py-1.5">
                                                    {item.label}
                                                </DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-[var(--sidebar-border)] mb-1" />
                                                {item.subItems.filter(sub => sub.roles.includes(userRole)).map(subItem => {
                                                    const isSubActive = location.pathname === subItem.path;
                                                    return (
                                                        <DropdownMenuItem 
                                                            key={subItem.path} 
                                                            render={
                                                                <NavLink
                                                                    to={subItem.path!}
                                                                    className={cn(
                                                                        "w-full flex items-center px-2 py-2 text-[13px] transition-colors outline-none rounded-lg cursor-pointer",
                                                                        isSubActive
                                                                            ? "bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] font-semibold"
                                                                            : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] focus:bg-[var(--sidebar-hover)]"
                                                                    )}
                                                                />
                                                            }
                                                        >
                                                            {subItem.label}
                                                        </DropdownMenuItem>
                                                    );
                                                })}
                                            </DropdownMenuGroup>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    menuBtn
                                )}

                                <AnimatePresence>
                                    {isExpanded && (!isSidebarCollapsed || isMobileSidebarOpen) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pl-11 pr-4 py-1 space-y-1 relative before:absolute before:left-[22px] before:top-0 before:bottom-3 before:w-px before:bg-[var(--sidebar-border)]">
                                                {item.subItems.filter(sub => sub.roles.includes(userRole)).map(subItem => {
                                                    const isSubActive = location.pathname === subItem.path;
                                                    return (
                                                        <NavLink
                                                            key={subItem.path}
                                                            to={subItem.path!}
                                                            onClick={() => setMobileSidebarOpen(false)}
                                                            className={cn(
                                                                "flex items-center text-sm rounded-lg px-3 py-2 transition-colors relative before:absolute before:-left-5 before:top-1/2 before:w-3 before:h-px before:bg-[var(--sidebar-border)]",
                                                                isSubActive
                                                                    ? "text-[var(--sidebar-active-text)] font-medium"
                                                                    : "text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)]"
                                                            )}
                                                        >
                                                            {subItem.label}
                                                        </NavLink>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    }

                    const linkContent = (
                        <NavLink
                            to={item.path!}
                            onClick={() => setMobileSidebarOpen(false)}
                            className={cn(
                                "flex items-center rounded-xl transition-all group relative overflow-hidden mb-1",
                                isSidebarCollapsed && !isMobileSidebarOpen ? "justify-center w-12 h-12 mx-auto" : "px-4 py-3 gap-3",
                                isActive
                                    ? "text-[var(--sidebar-text)]"
                                    : "text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text)]"
                            )}
                        >
                            <IconComponent className={cn("w-5 h-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1", isActive ? "text-[var(--sidebar-active-text)]" : "group-hover:text-[var(--sidebar-text)]")} />

                            {(!isSidebarCollapsed || isMobileSidebarOpen) && (
                                <span className="font-medium text-sm truncate relative z-10">{item.label}</span>
                            )}

                            {isActive ? (
                                <motion.div
                                    layoutId="activeNavPill"
                                    className="absolute inset-0 bg-[var(--sidebar-active)] rounded-xl shadow-[0_0_15px_var(--primary-glow)] pointer-events-none"
                                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                />
                            ) : (
                                <div className="absolute inset-0 bg-[var(--sidebar-hover)] opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300 pointer-events-none" />
                            )}
                        </NavLink>
                    );

                    return isSidebarCollapsed && !isMobileSidebarOpen ? (
                        <Tooltip key={item.path || item.label}>
                            <TooltipTrigger>
                                {linkContent}
                            </TooltipTrigger>
                            <TooltipContent side="right" className="ml-2 font-medium bg-[#1e1e22] text-[#fafafa] border-white/10">
                                {item.label}
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <div key={item.path || item.label}>{linkContent}</div>
                    );
                })}
            </nav>

            {/* User Footer with Role Badge */}
            <div className="p-4 pb-6 mt-auto">
                <div 
                    onClick={() => navigate('/profile')}
                    className={cn(
                        "rounded-full flex items-center transition-all duration-300 group relative cursor-pointer overflow-hidden border border-[var(--sidebar-border)] bg-[var(--surface-muted)] hover:bg-[var(--sidebar-hover)] hover:border-[var(--color-primary)] hover:shadow-[0_0_8px_var(--color-primary-glow)]",
                        isSidebarCollapsed && !isMobileSidebarOpen ? "justify-center p-2 w-12 h-12 mx-auto" : "px-4 py-3 gap-3"
                    )}
                >
                    <div
                        className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white relative z-10"
                        style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)` }}
                    >
                        {user?.name?.charAt(0)}
                    </div>

                    {(!isSidebarCollapsed || isMobileSidebarOpen) && (
                        <>
                            <div className="flex-1 min-w-0 relative z-10">
                                <p className="text-[15px] font-bold truncate text-[var(--sidebar-text)]">{user?.name}</p>
                                <p
                                    className="text-[13px] truncate"
                                    style={{ color: roleColor }}
                                >
                                    {roleLabel}
                                </p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    logout();
                                }}
                                className="p-2 -mr-2 text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text)] transition-colors relative z-10"
                            >
                                <LogOut className="w-5 h-5" />
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
                className="hidden lg:flex fixed left-0 top-0 h-screen bg-[var(--surface-sidebar)] backdrop-blur-2xl border-r border-[var(--sidebar-border)] flex-col z-50 transition-all duration-300 ease-in-out"
            >
                {sidebarContentJSX}

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
                            className="lg:hidden fixed left-0 top-0 h-screen w-[280px] bg-[var(--surface-sidebar)] backdrop-blur-2xl border-r border-[var(--sidebar-border)] flex flex-col z-50"
                        >
                            {sidebarContentJSX}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

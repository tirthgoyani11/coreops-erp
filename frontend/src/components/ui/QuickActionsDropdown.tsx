import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Ticket, Monitor, Package, FileText, UserPlus, CreditCard } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useShortcut } from '../../hooks/useShortcuts';

export const QuickActionsDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { user, hasPermission: can } = useAuthStore();

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Global shortcut 'N' to open menu when not in an input
    useShortcut(['n'], (e) => {
        e.preventDefault();
        setIsOpen(prev => !prev);
    });
    
    // Close on Escape
    useShortcut(['Escape'], () => setIsOpen(false));

    const actions = [
        ...(can('tickets.create') ? [{ name: 'Create Ticket', icon: Ticket, action: () => navigate('/maintenance') }] : []),
        ...(can('assets.create') ? [{ name: 'Add Asset', icon: Monitor, action: () => navigate('/assets/new') }] : []),
        ...(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER' ? [
            { name: 'Add Inventory', icon: Package, action: () => navigate('/inventory') },
            { name: 'New Purchase Order', icon: CreditCard, action: () => navigate('/procurement/orders/new') }
        ] : []),
        ...(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' ? [
            { name: 'Scan Invoice', icon: FileText, action: () => navigate('/financial') },
            { name: 'Manage Users', icon: UserPlus, action: () => navigate('/users') }
        ] : [])
    ];

    if (actions.length === 0) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-10 px-3 md:px-5 bg-[var(--primary)] text-[var(--primary-fg)] rounded-full text-sm font-bold flex items-center gap-2 hover:shadow-[0_0_20px_rgba(185,255,102,0.4)] transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-background)]"
                aria-label="Create new item"
                aria-expanded={isOpen}
            >
                <Plus className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`} aria-hidden="true" />
                <span className="hidden md:inline">New</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border-color)]">
                        Quick Actions <span className="float-right bg-[var(--bg-hover)] px-1 rounded">N</span>
                    </div>
                    {actions.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={index}
                                onClick={() => {
                                    item.action();
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:text-[var(--primary)] transition-colors"
                            >
                                <Icon className="w-4 h-4" />
                                {item.name}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

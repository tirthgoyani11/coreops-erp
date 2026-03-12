import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Command, ArrowRight, Monitor, Package, CreditCard, LayoutDashboard, Ticket, Users, Plus, Sparkles, User, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useShortcut } from '../../hooks/useShortcuts';
import api from '../../lib/api';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

// Map string icons from backend to Lucide components
const IconMap: Record<string, any> = {
    'Monitor': Monitor,
    'Ticket': Ticket,
    'Package': Package,
    'User': User,
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [apiResults, setApiResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const { user, hasPermission: can } = useAuthStore();

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setSearch('');
            setSelectedIndex(0);
            setApiResults([]);
            setTimeout(() => inputRef.current?.focus(), 50); // slight delay for animation
        }
    }, [isOpen]);

    // Close on escape
    useShortcut(['Escape'], () => {
        if (isOpen) onClose();
    }, { preventDefault: true, ignoreInInputs: false });

    // Debounced API Search
    useEffect(() => {
        if (!isOpen || search.trim().length < 2) {
            setApiResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const timer = setTimeout(async () => {
            try {
                const { data } = await api.get(`/search?q=${encodeURIComponent(search)}`);
                if (data.success) {
                    setApiResults(data.data);
                }
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [search, isOpen]);

    // Static Actions configuration
    const staticItems = [
        // Navigation (All)
        { id: 'nav-dashboard', type: 'Navigation', name: 'Dashboard', icon: LayoutDashboard, action: () => navigate('/') },
        { id: 'nav-assets', type: 'Navigation', name: 'Assets', icon: Monitor, action: () => navigate('/assets') },
        { id: 'nav-inventory', type: 'Navigation', name: 'Inventory', icon: Package, action: () => navigate('/inventory') },
        { id: 'nav-tickets', type: 'Navigation', name: 'Maintenance Tickets', icon: Ticket, action: () => navigate('/maintenance') },
        { id: 'nav-finance', type: 'Navigation', name: 'Finance & Invoices', icon: CreditCard, action: () => navigate('/finance') },
        
        // Actions (Role based)
        ...(can('tickets.create') ? [{ id: 'action-ticket', type: 'Action', name: 'Create Ticket', icon: Plus, action: () => navigate('/maintenance') }] : []),
        ...(can('assets.create') ? [{ id: 'action-asset', type: 'Action', name: 'Add Asset', icon: Plus, action: () => navigate('/assets') }] : []),
        ...(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' ? [
            { id: 'nav-users', type: 'Navigation', name: 'Manage Users', icon: Users, action: () => navigate('/users') }
        ] : []),
        
        // AI Shortcut
        { id: 'action-ai', type: 'Action', name: 'Ask OpsPilot', icon: Sparkles, color: 'text-[var(--primary)]', action: () => {
            window.dispatchEvent(new CustomEvent('toggle-opspilot'));
        }}
    ];

    // Filter static items locally
    const filteredStaticItems = staticItems.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase()) || 
        item.type.toLowerCase().includes(search.toLowerCase())
    );

    // Map API results to the same structure
    const mappedApiResults = apiResults.map(res => ({
        id: res.id,
        type: `Database • ${res.type}`,
        name: res.title,
        subtitle: res.subtitle,
        icon: IconMap[res.icon] || Search,
        color: 'text-blue-500',
        action: () => navigate(res.url)
    }));

    // Merge static and remote results
    const allItems = [...mappedApiResults, ...filteredStaticItems];

    // Handle Keyboard Navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < allItems.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (allItems[selectedIndex]) {
                allItems[selectedIndex].action();
                onClose();
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] sm:pt-[25vh]">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div 
                className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden mx-4 pb-2 animate-in fade-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                {/* Header / Search */}
                <div className="flex items-center px-4 py-4 border-b border-[var(--border-color)]">
                    <Search className={`w-5 h-5 mr-3 ${isSearching ? 'text-[var(--primary)] animate-pulse' : 'text-[var(--text-secondary)]'}`} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
                        onKeyDown={handleKeyDown}
                        placeholder="Search assets, tickets, users, or type a command..."
                        className="flex-1 bg-transparent text-[var(--text-primary)] focus:outline-none text-lg placeholder-[var(--text-secondary)]"
                    />
                    {isSearching && <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin mr-3" />}
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[var(--text-secondary)] bg-[var(--bg-background)] px-2 py-1 rounded">
                        <span>Esc</span>
                    </div>
                </div>

                {/* Results List */}
                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {allItems.length === 0 ? (
                        <div className="py-12 px-4 text-center text-[var(--text-secondary)]">
                            <Command className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            {isSearching ? (
                                <p>Searching database...</p>
                            ) : (
                                <>
                                    <p>No results found for "{search}"</p>
                                    <p className="text-sm mt-1 opacity-70">Try searching for an asset tag, ticket title, or command.</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {apiResults.length > 0 && (
                                <div className="px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                    Database Results
                                </div>
                            )}
                            {allItems.map((item, index) => {
                                const Icon = item.icon;
                                const isSelected = index === selectedIndex;
                                // Show separator for static commands if we have API results
                                const isFirstStaticItem = apiResults.length > 0 && index === apiResults.length;
                                
                                return (
                                    <React.Fragment key={item.id}>
                                        {isFirstStaticItem && (
                                            <div className="px-3 py-1.5 mt-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-t border-[var(--border-color)] pt-3">
                                                Commands & Navigation
                                            </div>
                                        )}
                                        <button
                                            onClick={() => { item.action(); onClose(); }}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left ${
                                                isSelected 
                                                    ? 'bg-[var(--primary)]/10 text-[var(--primary)]' 
                                                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className={`p-2 rounded-lg ${isSelected ? 'bg-[var(--primary)]/20' : 'bg-[var(--bg-background)] border border-[var(--border-color)]'}`}>
                                                    <Icon className={`w-4 h-4 ${item.color || (isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]')}`} />
                                                </div>
                                                <div className="flex flex-col items-start truncate overflow-hidden">
                                                    <span className="font-semibold text-sm truncate w-full">{item.name}</span>
                                                    {(item as any).subtitle ? (
                                                        <span className={`text-xs truncate w-full ${isSelected ? 'opacity-80' : 'text-[var(--text-secondary)]'}`}>
                                                            {(item as any).subtitle}
                                                        </span>
                                                    ) : (
                                                        <span className={`text-[10px] font-bold uppercase ${isSelected ? 'opacity-80' : 'text-[var(--text-secondary)]'}`}>
                                                            {item.type}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {isSelected && <ArrowRight className="w-4 h-4 opacity-70 flex-shrink-0 ml-3" />}
                                        </button>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                {/* Footer Keys hint */}
                <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-background)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><kbd className="bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">↑</kbd><kbd className="bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">↓</kbd> to navigate</span>
                        <span className="flex items-center gap-1"><kbd className="bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">↵</kbd> to select</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-70">
                        <kbd className="bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">Omni-Search</kbd> Enabled
                    </div>
                </div>
            </div>
        </div>
    );
};

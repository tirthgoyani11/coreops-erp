import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Command, ArrowRight, Monitor, Package, CreditCard, LayoutDashboard, Ticket, Users, Plus, Sparkles, User, Loader2, Brain, Send, Bot } from 'lucide-react';
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
    const [activeFilter, setActiveFilter] = useState<'all' | 'assets' | 'tickets' | 'users'>('all');
    
    // AI Chat state
    const [isAIMode, setIsAIMode] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiHistory, setAiHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const aiScrollRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { user, hasPermission: can } = useAuthStore();

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setSearch('');
            setSelectedIndex(0);
            setApiResults([]);
            setActiveFilter('all');
            setIsAIMode(false);
            setAiHistory([]);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Auto-detect AI mode when search starts with ? or "ask "
    useEffect(() => {
        if (search.startsWith('?') || search.toLowerCase().startsWith('ask ')) {
            if (!isAIMode) setIsAIMode(true);
        }
    }, [search]);

    // Close on escape
    useShortcut(['Escape'], () => {
        if (isOpen) {
            if (isAIMode && aiHistory.length > 0) {
                setIsAIMode(false);
                setAiHistory([]);
                setSearch('');
            } else {
                onClose();
            }
        }
    }, { preventDefault: true, ignoreInInputs: false });

    // Debounced API Search (only when not in AI mode)
    useEffect(() => {
        if (!isOpen || isAIMode || search.trim().length < 2) {
            setApiResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const timer = setTimeout(async () => {
            try {
                let url = `/search?q=${encodeURIComponent(search)}`;
                const { data } = await api.get(url);
                if (data.success) {
                    let results = data.data;
                    if (activeFilter !== 'all') {
                        const typeMap = { 'assets': 'Asset', 'tickets': 'Ticket', 'users': 'User' };
                        const targetType = typeMap[activeFilter];
                        results = results.filter((r: any) => r.type === targetType);
                    }
                    setApiResults(results);
                }
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [search, isOpen, isAIMode]);

    // Handle AI query submission
    const handleAISubmit = async () => {
        const query = isAIMode ? search.replace(/^\?|^ask\s+/i, '').trim() : search.trim();
        if (!query || aiLoading) return;

        setAiHistory(prev => [...prev, { role: 'user', text: query }]);
        setSearch('');
        setAiLoading(true);

        try {
            const res = await api.post('/ai/chat', { message: query });
            if (res.data.success) {
                const aiText = res.data.data?.response || res.data.data?.text || JSON.stringify(res.data.data, null, 2);
                setAiHistory(prev => [...prev, { role: 'ai', text: aiText }]);
            }
        } catch (err: any) {
            setAiHistory(prev => [...prev, { role: 'ai', text: `⚠️ ${err.response?.data?.error || 'AI service unavailable. Check Ollama is running.'}` }]);
        } finally {
            setAiLoading(false);
            setTimeout(() => aiScrollRef.current?.scrollTo({ top: aiScrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
        }
    };

    // Static Actions configuration
    const staticItems = [
        { id: 'nav-dashboard', type: 'Navigation', name: 'Dashboard', icon: LayoutDashboard, action: () => navigate('/') },
        { id: 'nav-assets', type: 'Navigation', name: 'Assets', icon: Monitor, action: () => navigate('/assets') },
        { id: 'nav-inventory', type: 'Navigation', name: 'Inventory', icon: Package, action: () => navigate('/inventory') },
        { id: 'nav-tickets', type: 'Navigation', name: 'Maintenance Tickets', icon: Ticket, action: () => navigate('/maintenance') },
        { id: 'nav-finance', type: 'Navigation', name: 'Finance Control Tower', icon: CreditCard, action: () => navigate('/financial') },
        { id: 'nav-predictive', type: 'Navigation', name: 'Predictive Maintenance AI', icon: Brain, action: () => navigate('/maintenance/predictive') },
        { id: 'nav-scanner', type: 'Navigation', name: 'AI Invoice Scanner', icon: Sparkles, action: () => navigate('/invoice-scanner') },
        
        ...(can('tickets.create') ? [{ id: 'action-ticket', type: 'Action', name: 'Create Ticket', icon: Plus, action: () => navigate('/maintenance') }] : []),
        ...(can('assets.create') ? [{ id: 'action-asset', type: 'Action', name: 'Add Asset', icon: Plus, action: () => navigate('/assets') }] : []),
        ...(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' ? [
            { id: 'nav-users', type: 'Navigation', name: 'Manage Users', icon: Users, action: () => navigate('/users') }
        ] : []),
        
        { id: 'action-ai', type: 'Action', name: 'Ask OpsPilot AI', icon: Sparkles, color: 'text-[var(--primary)]', action: () => {
            setIsAIMode(true);
            setSearch('?');
            setTimeout(() => inputRef.current?.focus(), 50);
        }}
    ];

    const filteredStaticItems = staticItems.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase()) || 
        item.type.toLowerCase().includes(search.toLowerCase())
    );

    const mappedApiResults = apiResults.map(res => ({
        id: res.id,
        type: `Database • ${res.type}`,
        name: res.title,
        subtitle: res.subtitle,
        icon: IconMap[res.icon] || Search,
        color: 'text-blue-500',
        action: () => navigate(res.url)
    }));

    const allItems = [...mappedApiResults, ...filteredStaticItems];

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (isAIMode) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAISubmit();
            }
            return;
        }

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
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] sm:pt-[20vh]">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div 
                className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden mx-4 pb-2 animate-in fade-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                {/* Header / Search */}
                <div className="flex flex-col border-b border-[var(--border-color)]">
                    <div className="flex items-center px-4 py-4">
                        {isAIMode ? (
                            <Bot className="w-5 h-5 mr-3 text-purple-400" />
                        ) : (
                            <Search className={`w-5 h-5 mr-3 ${isSearching ? 'text-[var(--primary)] animate-pulse' : 'text-[var(--text-secondary)]'}`} />
                        )}
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
                            onKeyDown={handleKeyDown}
                            placeholder={isAIMode ? 'Ask OpsPilot anything... "Show overdue invoices"' : 'Search or type ? for AI assistant...'}
                            className="flex-1 bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] text-lg placeholder-[var(--text-secondary)] rounded-md px-2"
                        />
                        {isSearching && <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin mr-3" />}
                        {aiLoading && <Loader2 className="w-5 h-5 text-purple-400 animate-spin mr-3" />}
                        
                        {isAIMode ? (
                            <button
                                onClick={handleAISubmit}
                                disabled={aiLoading || !search.replace(/^\?|^ask\s+/i, '').trim()}
                                className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-30"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        ) : (
                            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[var(--text-secondary)] bg-[var(--bg-background)] px-2 py-1 rounded">
                                <span>Esc</span>
                            </div>
                        )}
                    </div>

                    {/* Mode Toggle Pills */}
                    <div className="flex gap-2 px-4 pb-3">
                        <button 
                            onClick={() => { setIsAIMode(false); setSearch(''); setSelectedIndex(0); }}
                            className={`text-xs px-3 py-1 rounded-full border transition-all flex items-center gap-1 ${!isAIMode ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]' : 'bg-[var(--bg-overlay)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        >
                            <Search className="w-3 h-3" /> Search
                        </button>
                        <button 
                            onClick={() => { setIsAIMode(true); setSearch('?'); inputRef.current?.focus(); }}
                            className={`text-xs px-3 py-1 rounded-full border transition-all flex items-center gap-1 ${isAIMode ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-[var(--bg-overlay)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        >
                            <Bot className="w-3 h-3" /> AI Assistant
                        </button>
                        {!isAIMode && (
                            <>
                                <button 
                                    onClick={() => { setActiveFilter('assets'); setSelectedIndex(0); }}
                                    className={`text-xs px-3 py-1 rounded-full border transition-all flex items-center gap-1 ${activeFilter === 'assets' ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]' : 'bg-[var(--bg-overlay)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                >
                                    <Monitor className="w-3 h-3" /> Assets
                                </button>
                                <button 
                                    onClick={() => { setActiveFilter('tickets'); setSelectedIndex(0); }}
                                    className={`text-xs px-3 py-1 rounded-full border transition-all flex items-center gap-1 ${activeFilter === 'tickets' ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]' : 'bg-[var(--bg-overlay)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                >
                                    <Ticket className="w-3 h-3" /> Tickets
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto p-2" ref={aiScrollRef}>
                    {isAIMode ? (
                        /* AI Chat Mode */
                        <div className="px-2 py-2 space-y-4 min-h-[200px]">
                            {aiHistory.length === 0 && !aiLoading && (
                                <div className="py-8 text-center">
                                    <Bot className="w-14 h-14 mx-auto mb-4 text-purple-400 opacity-40" />
                                    <p className="text-[var(--text-primary)] font-semibold text-lg">OpsPilot AI</p>
                                    <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-sm mx-auto">
                                        Ask anything about your operations — invoices, assets, maintenance, inventory
                                    </p>
                                    <div className="flex flex-wrap gap-2 justify-center mt-5">
                                        {[
                                            'Show overdue invoices',
                                            'Assets needing maintenance',
                                            'Low stock items',
                                            'Monthly expense summary',
                                        ].map(suggestion => (
                                            <button
                                                key={suggestion}
                                                onClick={() => { setSearch(`?${suggestion}`); }}
                                                className="text-xs px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {aiHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                                        msg.role === 'user'
                                            ? 'bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--text-primary)]'
                                            : 'bg-purple-500/10 border border-purple-500/20 text-[var(--text-primary)]'
                                    }`}>
                                        {msg.role === 'ai' && (
                                            <div className="flex items-center gap-2 mb-2">
                                                <Bot className="w-4 h-4 text-purple-400" />
                                                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">OpsPilot</span>
                                            </div>
                                        )}
                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                    </div>
                                </div>
                            ))}

                            {aiLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
                                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                                        <span className="text-sm text-purple-400">Thinking...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Normal Search Mode */
                        <>
                            {allItems.length === 0 ? (
                                <div className="py-12 px-4 text-center text-[var(--text-secondary)]">
                                    <Command className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    {isSearching ? (
                                        <p>Searching database...</p>
                                    ) : (
                                        <>
                                            <p>No results found for "{search}"</p>
                                            <p className="text-sm mt-1 opacity-70">Try searching for an asset tag, ticket title, or command.</p>
                                            <button
                                                onClick={() => { setIsAIMode(true); setSearch(`?${search}`); }}
                                                className="mt-4 inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/25 transition-colors"
                                            >
                                                <Bot className="w-4 h-4" /> Ask AI about "{search}"
                                            </button>
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
                                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left border ${
                                                        isSelected 
                                                            ? 'bg-[var(--primary)]/10 border-[var(--primary)]/50 shadow-[0_0_15px_rgba(var(--primary-glow-rgb),0.1)]' 
                                                            : 'bg-transparent border-transparent hover:bg-[var(--bg-hover)]'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className={`p-2 rounded-lg transition-colors ${isSelected ? 'bg-[var(--primary)] text-black shadow-lg' : 'bg-[var(--bg-overlay)] border border-[var(--border-color)] text-[var(--text-secondary)]'}`}>
                                                            <Icon className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col items-start truncate overflow-hidden">
                                                            <span className={`font-semibold text-sm truncate w-full ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>{item.name}</span>
                                                            {(item as any).subtitle ? (
                                                                <span className={`text-xs truncate w-full ${isSelected ? 'text-[var(--text-primary)] opacity-80' : 'text-[var(--text-secondary)]'}`}>
                                                                    {(item as any).subtitle}
                                                                </span>
                                                            ) : (
                                                                <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-[var(--primary)] opacity-80' : 'text-[var(--text-secondary)]'}`}>
                                                                    {item.type}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] uppercase font-bold text-[var(--primary)] opacity-80">Jump</span>
                                                            <ArrowRight className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
                                                        </div>
                                                    )}
                                                </button>
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
                
                {/* Footer */}
                <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-background)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center gap-4">
                        {isAIMode ? (
                            <span className="flex items-center gap-1">
                                <kbd className="bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">↵</kbd> send
                                <span className="mx-1">•</span>
                                <kbd className="bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">Esc</kbd> back
                            </span>
                        ) : (
                            <>
                                <span className="flex items-center gap-1"><kbd className="bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">↑</kbd><kbd className="bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">↓</kbd> navigate</span>
                                <span className="flex items-center gap-1"><kbd className="bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">↵</kbd> select</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1 opacity-70">
                        {isAIMode ? (
                            <span className="flex items-center gap-1 text-purple-400">
                                <Bot className="w-3 h-3" /> OpsPilot AI
                            </span>
                        ) : (
                            <>
                                <kbd className="bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">?</kbd> for AI
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

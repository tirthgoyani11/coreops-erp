import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Keyboard, X } from 'lucide-react';
import { useShortcut } from '../../hooks/useShortcuts';
import { useThemeStore } from '../../stores/themeStore';

export const GlobalShortcutsModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const { toggleTheme } = useThemeStore();

    // Toggle Help Modal
    useShortcut(['?'], () => setIsOpen(true));
    useShortcut(['Escape'], () => setIsOpen(false));

    // Theme Toggle
    useShortcut(['shift', 'd'], () => {
        toggleTheme();
    });

    // Rapid Navigation (using Alt/Option)
    useShortcut(['alt', 'd'], () => navigate('/dashboard'));
    useShortcut(['alt', 'a'], () => navigate('/assets'));
    useShortcut(['alt', 'i'], () => navigate('/inventory'));
    useShortcut(['alt', 't'], () => navigate('/maintenance'));
    useShortcut(['alt', 'f'], () => navigate('/financial'));

    const shortcutCategories = [
        {
            title: 'Global Actions',
            items: [
                { keys: ['Ctrl', 'K'], label: 'Open Command Palette' },
                { keys: ['Ctrl', '/'], label: 'Ask OpsPilot AI' },
                { keys: ['N'], label: 'Quick Actions Menu' },
                { keys: ['Shift', 'D'], label: 'Toggle Light/Dark Mode' },
                { keys: ['?'], label: 'Show Keyboard Shortcuts' },
            ]
        },
        {
            title: 'Rapid Navigation',
            items: [
                { keys: ['Alt', 'D'], label: 'Dashboard' },
                { keys: ['Alt', 'A'], label: 'Assets' },
                { keys: ['Alt', 'I'], label: 'Inventory' },
                { keys: ['Alt', 'T'], label: 'Tickets' },
                { keys: ['Alt', 'F'], label: 'Finance' },
            ]
        }
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
            
            <div 
                className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-2 text-[var(--text-primary)]">
                        <Keyboard className="w-5 h-5" />
                        <h2 className="text-lg font-bold">Keyboard Shortcuts</h2>
                    </div>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="p-1 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {shortcutCategories.map((category, idx) => (
                        <div key={idx} className="space-y-4">
                            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                                {category.title}
                            </h3>
                            <div className="space-y-3">
                                {category.items.map((item, idy) => (
                                    <div key={idy} className="flex items-center justify-between text-sm">
                                        <span className="text-[var(--text-primary)]">{item.label}</span>
                                        <div className="flex items-center gap-1">
                                            {item.keys.map((k, idk) => (
                                                <kbd 
                                                    key={idk} 
                                                    className="min-w-[24px] px-1.5 py-1 text-center text-xs font-mono font-bold bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg shadow-sm"
                                                >
                                                    {k === 'Ctrl' ? '⌘/Ctrl' : k === 'Alt' ? '⌥/Alt' : k}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="px-6 py-4 bg-[var(--bg-background)] border-t border-[var(--border-color)] flex justify-between items-center">
                    <span className="text-xs text-[var(--text-secondary)]">
                        Pro tip: Shortcuts are automatically disabled when typing in an input field.
                    </span>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="text-sm font-bold text-[var(--primary)] hover:opacity-80 transition-opacity"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

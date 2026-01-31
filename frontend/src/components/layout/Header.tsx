import { Search, Bell, Plus, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';

export function Header() {
    const location = useLocation();
    const { setMobileSidebarOpen } = useUIStore();

    const getTitle = () => {
        const path = location.pathname.substring(1);
        if (!path) return 'Dashboard';
        return path.charAt(0).toUpperCase() + path.slice(1);
    };

    return (
        <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-40">
            <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                <button
                    onClick={() => setMobileSidebarOpen(true)}
                    className="lg:hidden w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>

                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">{getTitle()}</h1>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                {/* Search - Hidden on mobile */}
                <div className="relative group hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="bg-[#18181b] border border-white/10 rounded-full pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)] text-white w-64 transition-all"
                    />
                </div>

                {/* Notifs */}
                <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors text-[var(--text-muted)] hover:text-white relative group">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[var(--primary)] rounded-full border-2 border-[#09090b]" />
                </button>

                {/* Global Action - Text hidden on mobile */}
                <button className="h-10 px-3 md:px-5 bg-[var(--primary)] text-black rounded-full text-sm font-bold flex items-center gap-2 hover:shadow-[0_0_20px_rgba(185,255,102,0.4)] transition-all active:scale-95">
                    <Plus className="w-4 h-4" />
                    <span className="hidden md:inline">New Action</span>
                </button>
            </div>
        </header>
    );
}

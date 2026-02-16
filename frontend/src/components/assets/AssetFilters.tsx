import { Search, Filter, LayoutGrid, List as ListIcon, Map as MapIcon, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AssetFiltersProps {
    search: string;
    setSearch: (value: string) => void;
    viewMode: 'table' | 'card' | 'map' | 'calendar';
    setViewMode: (mode: 'table' | 'card' | 'map' | 'calendar') => void;
    statusFilter: string;
    setStatusFilter: (value: string) => void;
}

export function AssetFilters({
    search,
    setSearch,
    viewMode,
    setViewMode,
    statusFilter,
    setStatusFilter
}: AssetFiltersProps) {
    return (
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6 bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-color)] shadow-lg shadow-black/5">

            {/* Left: Search & Filters */}
            <div className="flex flex-1 gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                    <input
                        type="text"
                        placeholder="Search assets..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]/50 transition-all text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                    />
                </div>

                <div className="relative min-w-[160px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]/50 transition-all appearance-none text-[var(--text-primary)] cursor-pointer hover:bg-[var(--bg-card-hover)]"
                    >
                        <option value="">All Statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="MAINTENANCE">In Maintenance</option>
                        <option value="RETIRED">Retired</option>
                        <option value="LOST">Lost</option>
                    </select>
                </div>
            </div>

            {/* Right: View Toggles */}
            <div className="flex items-center bg-[var(--bg-background)] p-1 rounded-xl border border-[var(--border-color)]">
                <ViewToggle
                    active={viewMode === 'table'}
                    onClick={() => setViewMode('table')}
                    icon={ListIcon}
                    label="List"
                />
                <ViewToggle
                    active={viewMode === 'card'}
                    onClick={() => setViewMode('card')}
                    icon={LayoutGrid}
                    label="Grid"
                />
                {/* Disabled for Phase 2 Initial Release */}
                <ViewToggle
                    active={viewMode === 'calendar'}
                    onClick={() => { }}
                    icon={CalendarIcon}
                    label="Calendar"
                    disabled
                />
                <ViewToggle
                    active={viewMode === 'map'}
                    onClick={() => { }}
                    icon={MapIcon}
                    label="Map"
                    disabled
                />
            </div>
        </div>
    );
}

function ViewToggle({ active, onClick, icon: Icon, label, disabled = false }: any) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={disabled ? "Coming Soon" : label}
            className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-all",
                active
                    ? "bg-[var(--primary)] text-black shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]",
                disabled && "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-[var(--text-secondary)]"
            )}
        >
            <Icon size={18} />
        </button>
    );
}

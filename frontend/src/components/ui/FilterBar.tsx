import React, { useState, useMemo } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Input } from './Input'
import { Button } from './Button'

export interface FilterOption {
    label: string
    value: string
    count?: number
}

export interface FilterGroup {
    key: string
    label: string
    options: FilterOption[]
    multiple?: boolean
}

export interface FilterBarProps {
    searchPlaceholder?: string
    searchValue?: string
    onSearchChange?: (value: string) => void
    filters?: FilterGroup[]
    activeFilters?: Record<string, string[]>
    onFilterChange?: (key: string, values: string[]) => void
    onClearAll?: () => void
    className?: string
    children?: React.ReactNode
}

/**
 * FilterBar — Reusable search + filter chip bar
 * 
 * Usage:
 *   <FilterBar
 *     searchPlaceholder="Search assets..."
 *     searchValue={search}
 *     onSearchChange={setSearch}
 *     filters={[
 *       { key: 'status', label: 'Status', options: [{ label: 'Active', value: 'active' }] },
 *       { key: 'type', label: 'Type', options: [{ label: 'Laptop', value: 'laptop' }] },
 *     ]}
 *     activeFilters={activeFilters}
 *     onFilterChange={handleFilterChange}
 *   />
 */
const FilterBar: React.FC<FilterBarProps> = ({
    searchPlaceholder = 'Search...',
    searchValue = '',
    onSearchChange,
    filters = [],
    activeFilters = {},
    onFilterChange,
    onClearAll,
    className,
    children,
}) => {
    const [expandedFilter, setExpandedFilter] = useState<string | null>(null)

    const activeCount = useMemo(() =>
        Object.values(activeFilters).reduce((sum, vals) => sum + vals.length, 0),
        [activeFilters]
    )

    const toggleFilter = (key: string, value: string) => {
        if (!onFilterChange) return
        const current = activeFilters[key] || []
        const filter = filters.find(f => f.key === key)

        if (filter?.multiple) {
            const newValues = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value]
            onFilterChange(key, newValues)
        } else {
            onFilterChange(key, current.includes(value) ? [] : [value])
        }
    }

    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="flex-1 min-w-[200px] max-w-md">
                    <Input
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={(e) => onSearchChange?.(e.target.value)}
                        startIcon={<Search className="w-4 h-4" />}
                        endIcon={searchValue ? (
                            <button onClick={() => onSearchChange?.('')} className="hover:text-[var(--text-primary)]">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        ) : undefined}
                    />
                </div>

                {/* Filter Chips */}
                {filters.map(group => (
                    <div key={group.key} className="relative">
                        <button
                            className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors",
                                "border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
                                (activeFilters[group.key]?.length > 0) && "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10"
                            )}
                            onClick={() => setExpandedFilter(expandedFilter === group.key ? null : group.key)}
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            {group.label}
                            {(activeFilters[group.key]?.length > 0) && (
                                <span className="bg-[var(--primary)] text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                    {activeFilters[group.key].length}
                                </span>
                            )}
                        </button>

                        {/* Dropdown */}
                        {expandedFilter === group.key && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setExpandedFilter(null)} />
                                <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl py-1">
                                    {group.options.map(opt => {
                                        const isActive = activeFilters[group.key]?.includes(opt.value)
                                        return (
                                            <button
                                                key={opt.value}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors",
                                                    "hover:bg-[var(--bg-hover)]",
                                                    isActive ? "text-[var(--primary)] font-medium" : "text-[var(--text-secondary)]"
                                                )}
                                                onClick={() => toggleFilter(group.key, opt.value)}
                                            >
                                                <span>{opt.label}</span>
                                                <span className="flex items-center gap-1.5">
                                                    {opt.count !== undefined && (
                                                        <span className="text-xs text-[var(--text-muted)]">{opt.count}</span>
                                                    )}
                                                    {isActive && (
                                                        <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {/* Extra actions slot */}
                {children}

                {/* Clear all */}
                {activeCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearAll}
                        className="text-[var(--text-muted)] hover:text-red-500"
                    >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Clear ({activeCount})
                    </Button>
                )}
            </div>

            {/* Active filter tags */}
            {activeCount > 0 && (
                <div className="flex flex-wrap gap-2">
                    {Object.entries(activeFilters).map(([key, values]) =>
                        values.map(val => {
                            const group = filters.find(f => f.key === key)
                            const option = group?.options.find(o => o.value === val)
                            return (
                                <span
                                    key={`${key}-${val}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-[var(--primary)]/15 text-[var(--primary)] font-medium"
                                >
                                    {group?.label}: {option?.label || val}
                                    <button
                                        onClick={() => toggleFilter(key, val)}
                                        className="hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    )
}

FilterBar.displayName = "FilterBar"

export { FilterBar }

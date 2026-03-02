import React, { useState, useMemo, useCallback } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './Button'
import { Skeleton } from './Skeleton'

// --- Types ---

export interface Column<T = any> {
    key: string
    header: string | React.ReactNode
    render?: (value: any, row: T, index: number) => React.ReactNode
    sortable?: boolean
    width?: string
    align?: 'left' | 'center' | 'right'
    className?: string
}

export type SortDirection = 'asc' | 'desc' | null

export interface SortState {
    key: string
    direction: SortDirection
}

export interface DataTableProps<T = any> {
    columns: Column<T>[]
    data: T[]
    keyField?: string
    loading?: boolean
    loadingRows?: number
    emptyMessage?: string
    emptyIcon?: React.ReactNode
    sortState?: SortState
    onSort?: (sort: SortState) => void
    selectable?: boolean
    selectedKeys?: Set<string>
    onSelectionChange?: (keys: Set<string>) => void
    onRowClick?: (row: T) => void
    rowClassName?: string | ((row: T) => string)
    pageSize?: number
    currentPage?: number
    totalItems?: number
    onPageChange?: (page: number) => void
    compact?: boolean
    stickyHeader?: boolean
    className?: string
}

// --- Helpers ---

function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj)
}

// --- DataTable ---

function DataTableInner<T extends Record<string, any>>(
    {
        columns,
        data,
        keyField = 'id',
        loading = false,
        loadingRows = 5,
        emptyMessage = 'No data found',
        emptyIcon,
        sortState,
        onSort,
        selectable = false,
        selectedKeys,
        onSelectionChange,
        onRowClick,
        rowClassName,
        pageSize,
        currentPage = 1,
        totalItems,
        onPageChange,
        compact = false,
        stickyHeader = false,
        className,
    }: DataTableProps<T>,
    ref: React.Ref<HTMLDivElement>
) {
    const [localSort, setLocalSort] = useState<SortState>({ key: '', direction: null })
    const activeSort = sortState ?? localSort

    const handleSort = useCallback((key: string) => {
        const col = columns.find(c => c.key === key)
        if (!col?.sortable) return

        let direction: SortDirection = 'asc'
        if (activeSort.key === key) {
            direction = activeSort.direction === 'asc' ? 'desc' : activeSort.direction === 'desc' ? null : 'asc'
        }

        const newSort = { key, direction }
        if (onSort) {
            onSort(newSort)
        } else {
            setLocalSort(newSort)
        }
    }, [columns, activeSort, onSort])

    // Client-side sort (when not using onSort)
    const sortedData = useMemo(() => {
        if (sortState || !localSort.key || !localSort.direction) return data

        return [...data].sort((a, b) => {
            const aVal = getNestedValue(a, localSort.key)
            const bVal = getNestedValue(b, localSort.key)

            if (aVal == null) return 1
            if (bVal == null) return -1

            const cmp = typeof aVal === 'string'
                ? aVal.localeCompare(bVal)
                : (aVal > bVal ? 1 : aVal < bVal ? -1 : 0)

            return localSort.direction === 'desc' ? -cmp : cmp
        })
    }, [data, localSort, sortState])

    // Selection
    const allSelected = selectable && selectedKeys && data.length > 0 &&
        data.every(row => selectedKeys.has(String(row[keyField])))

    const toggleAll = () => {
        if (!onSelectionChange) return
        if (allSelected) {
            onSelectionChange(new Set())
        } else {
            onSelectionChange(new Set(data.map(row => String(row[keyField]))))
        }
    }

    const toggleRow = (key: string) => {
        if (!onSelectionChange || !selectedKeys) return
        const next = new Set(selectedKeys)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        onSelectionChange(next)
    }

    // Pagination
    const total = totalItems ?? data.length
    const totalPages = pageSize ? Math.ceil(total / pageSize) : 1
    const showPagination = pageSize && totalPages > 1

    const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3'

    const SortIcon = ({ colKey }: { colKey: string }) => {
        if (activeSort.key !== colKey || !activeSort.direction) {
            return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
        }
        return activeSort.direction === 'asc'
            ? <ChevronUp className="w-3.5 h-3.5 text-[var(--primary)]" />
            : <ChevronDown className="w-3.5 h-3.5 text-[var(--primary)]" />
    }

    const alignClass = (align?: string) =>
        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'

    return (
        <div ref={ref} className={cn("w-full overflow-x-auto rounded-lg border border-[var(--border-color)]", className)}>
            <table className="w-full text-sm">
                {/* Header */}
                <thead className={cn(
                    "bg-[var(--bg-hover)] border-b border-[var(--border-color)]",
                    stickyHeader && "sticky top-0 z-10"
                )}>
                    <tr>
                        {selectable && (
                            <th className={cn(cellPadding, "w-10")}>
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleAll}
                                    className="rounded border-[var(--border-color)] accent-[var(--primary)]"
                                />
                            </th>
                        )}
                        {columns.map(col => (
                            <th
                                key={col.key}
                                className={cn(
                                    cellPadding,
                                    "font-medium text-xs uppercase tracking-wider text-[var(--text-muted)]",
                                    alignClass(col.align),
                                    col.sortable && "cursor-pointer select-none hover:text-[var(--text-primary)] transition-colors",
                                    col.className
                                )}
                                style={{ width: col.width }}
                                onClick={() => col.sortable && handleSort(col.key)}
                            >
                                <span className="inline-flex items-center gap-1">
                                    {col.header}
                                    {col.sortable && <SortIcon colKey={col.key} />}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>

                {/* Body */}
                <tbody className="divide-y divide-[var(--border-color)]">
                    {loading ? (
                        Array.from({ length: loadingRows }).map((_, i) => (
                            <tr key={`skeleton-${i}`}>
                                {selectable && (
                                    <td className={cellPadding}>
                                        <Skeleton width={16} height={16} variant="rectangular" />
                                    </td>
                                )}
                                {columns.map(col => (
                                    <td key={col.key} className={cellPadding}>
                                        <Skeleton height={14} width={`${60 + Math.random() * 30}%`} />
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : sortedData.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-12 text-center">
                                <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                                    {emptyIcon}
                                    <p className="text-sm">{emptyMessage}</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        sortedData.map((row, rowIndex) => {
                            const key = String(row[keyField])
                            const isSelected = selectable && selectedKeys?.has(key)
                            const rClassName = typeof rowClassName === 'function' ? rowClassName(row) : rowClassName

                            return (
                                <tr
                                    key={key}
                                    className={cn(
                                        "transition-colors",
                                        "hover:bg-[var(--bg-hover)]",
                                        isSelected && "bg-[var(--primary)]/5",
                                        onRowClick && "cursor-pointer",
                                        rClassName
                                    )}
                                    onClick={() => onRowClick?.(row)}
                                >
                                    {selectable && (
                                        <td className={cellPadding} onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleRow(key)}
                                                className="rounded border-[var(--border-color)] accent-[var(--primary)]"
                                            />
                                        </td>
                                    )}
                                    {columns.map(col => (
                                        <td
                                            key={col.key}
                                            className={cn(
                                                cellPadding,
                                                "text-[var(--text-primary)]",
                                                alignClass(col.align),
                                                col.className
                                            )}
                                        >
                                            {col.render
                                                ? col.render(getNestedValue(row, col.key), row, rowIndex)
                                                : getNestedValue(row, col.key) ?? '—'
                                            }
                                        </td>
                                    ))}
                                </tr>
                            )
                        })
                    )}
                </tbody>
            </table>

            {/* Pagination */}
            {showPagination && (
                <div className="flex items-center justify-between border-t border-[var(--border-color)] px-4 py-3 bg-[var(--bg-card)]">
                    <p className="text-xs text-[var(--text-muted)]">
                        Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, total)} of {total}
                    </p>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={currentPage <= 1}
                            onClick={() => onPageChange?.(currentPage - 1)}
                            className="h-8 w-8"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>

                        {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                            let page: number
                            if (totalPages <= 5) {
                                page = i + 1
                            } else if (currentPage <= 3) {
                                page = i + 1
                            } else if (currentPage >= totalPages - 2) {
                                page = totalPages - 4 + i
                            } else {
                                page = currentPage - 2 + i
                            }

                            return (
                                <Button
                                    key={page}
                                    variant={page === currentPage ? 'default' : 'ghost'}
                                    size="icon"
                                    onClick={() => onPageChange?.(page)}
                                    className={cn("h-8 w-8 text-xs", page === currentPage && "pointer-events-none")}
                                >
                                    {page}
                                </Button>
                            )
                        })}

                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={currentPage >= totalPages}
                            onClick={() => onPageChange?.(currentPage + 1)}
                            className="h-8 w-8"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

export const DataTable = React.forwardRef(DataTableInner) as <T extends Record<string, any>>(
    props: DataTableProps<T> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement

export type { Column as DataTableColumn }

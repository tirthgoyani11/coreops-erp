import React from 'react'
import { cn } from '../../lib/utils'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'text' | 'circular' | 'rectangular' | 'card'
    width?: string | number
    height?: string | number
    lines?: number
}

/**
 * Skeleton — Loading placeholder with shimmer animation
 * 
 * Usage:
 *   <Skeleton variant="text" lines={3} />
 *   <Skeleton variant="circular" width={40} height={40} />
 *   <Skeleton variant="card" height={200} />
 */
const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
    ({ className, variant = 'rectangular', width, height, lines = 1, style, ...props }, ref) => {
        if (variant === 'text' && lines > 1) {
            return (
                <div ref={ref} className={cn("space-y-2", className)} {...props}>
                    {Array.from({ length: lines }).map((_, i) => (
                        <div
                            key={i}
                            className="skeleton-shimmer rounded h-4"
                            style={{
                                width: i === lines - 1 ? '75%' : '100%',
                                ...style,
                            }}
                        />
                    ))}
                </div>
            )
        }

        const variantClasses = {
            text: 'rounded h-4',
            circular: 'rounded-full',
            rectangular: 'rounded-md',
            card: 'rounded-lg',
        }

        return (
            <div
                ref={ref}
                className={cn(
                    "skeleton-shimmer",
                    variantClasses[variant],
                    className
                )}
                style={{
                    width: width ?? '100%',
                    height: height ?? (variant === 'text' ? 16 : variant === 'circular' ? 40 : 100),
                    ...style,
                }}
                {...props}
            />
        )
    }
)
Skeleton.displayName = "Skeleton"

/**
 * SkeletonTable — Loading skeleton for data tables
 */
const SkeletonTable = ({ rows = 5, columns = 4, className }: { rows?: number, columns?: number, className?: string }) => (
    <div className={cn("space-y-3", className)}>
        {/* Header row */}
        <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton key={`h-${i}`} height={12} className="flex-1" />
            ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex gap-4">
                {Array.from({ length: columns }).map((_, c) => (
                    <Skeleton key={`${r}-${c}`} height={16} className="flex-1" />
                ))}
            </div>
        ))}
    </div>
)
SkeletonTable.displayName = "SkeletonTable"

/**
 * SkeletonCard — Loading skeleton for stat/metric cards
 */
const SkeletonCard = ({ className }: { className?: string }) => (
    <div className={cn("rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-6 space-y-3", className)}>
        <Skeleton height={12} width="40%" />
        <Skeleton height={28} width="60%" />
        <Skeleton height={10} width="30%" />
    </div>
)
SkeletonCard.displayName = "SkeletonCard"

export { Skeleton, SkeletonTable, SkeletonCard }

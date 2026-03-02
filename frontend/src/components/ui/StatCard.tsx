import { cn } from "../../lib/utils"
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react"

export interface StatCardProps {
    title: string
    value: string | number
    subtitle?: string
    icon?: LucideIcon
    trend?: {
        value: number   // e.g. 12.5 for +12.5%
        label?: string  // e.g. "vs last month"
    }
    variant?: "default" | "primary" | "success" | "warning" | "error"
    className?: string
}

export function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    variant = "default",
    className,
}: StatCardProps) {
    const iconColors: Record<string, string> = {
        default: "text-[var(--text-secondary)] bg-[var(--surface-muted)]",
        primary: "text-[var(--color-primary)] bg-[var(--color-primary-muted)]",
        success: "text-[var(--color-success)] bg-[var(--color-success-muted)]",
        warning: "text-[var(--color-warning)] bg-[var(--color-warning-muted)]",
        error: "text-[var(--color-error)] bg-[var(--color-error-muted)]",
    }

    const TrendIcon = trend
        ? trend.value > 0 ? TrendingUp
            : trend.value < 0 ? TrendingDown
                : Minus
        : null

    const trendColor = trend
        ? trend.value > 0 ? "text-emerald-500"
            : trend.value < 0 ? "text-red-500"
                : "text-[var(--text-muted)]"
        : ""

    return (
        <div className={cn(
            "rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--transition-normal)]",
            className
        )}>
            <div className="flex items-start justify-between mb-3">
                <span className="text-[var(--text-xs)] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    {title}
                </span>
                {Icon && (
                    <div className={cn("p-2 rounded-[var(--radius-md)]", iconColors[variant])}>
                        <Icon className="w-4 h-4" />
                    </div>
                )}
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                {value}
            </div>
            <div className="flex items-center gap-2 mt-2">
                {trend && TrendIcon && (
                    <span className={cn("flex items-center gap-0.5 text-xs font-semibold", trendColor)}>
                        <TrendIcon className="w-3.5 h-3.5" />
                        {Math.abs(trend.value)}%
                    </span>
                )}
                {(subtitle || trend?.label) && (
                    <span className="text-xs text-[var(--text-muted)]">
                        {subtitle || trend?.label}
                    </span>
                )}
            </div>
        </div>
    )
}

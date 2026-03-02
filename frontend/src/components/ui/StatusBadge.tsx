import { cn } from "../../lib/utils"

type StatusType = "success" | "warning" | "error" | "info" | "default" | "pending"

export interface StatusBadgeProps {
    status: StatusType | string
    label?: string
    dot?: boolean
    size?: "sm" | "md"
    className?: string
}

const statusMap: Record<string, { bg: string; text: string; dot: string }> = {
    success: {
        bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
        text: "text-emerald-700 dark:text-emerald-400",
        dot: "bg-emerald-500",
    },
    warning: {
        bg: "bg-amber-500/10 dark:bg-amber-500/15",
        text: "text-amber-700 dark:text-amber-400",
        dot: "bg-amber-500",
    },
    error: {
        bg: "bg-red-500/10 dark:bg-red-500/15",
        text: "text-red-700 dark:text-red-400",
        dot: "bg-red-500",
    },
    info: {
        bg: "bg-blue-500/10 dark:bg-blue-500/15",
        text: "text-blue-700 dark:text-blue-400",
        dot: "bg-blue-500",
    },
    pending: {
        bg: "bg-purple-500/10 dark:bg-purple-500/15",
        text: "text-purple-700 dark:text-purple-400",
        dot: "bg-purple-500",
    },
    default: {
        bg: "bg-[var(--surface-muted)]",
        text: "text-[var(--text-secondary)]",
        dot: "bg-[var(--text-muted)]",
    },
}

// Maps common ERP status strings to visual types
const statusAliases: Record<string, StatusType> = {
    active: "success",
    completed: "success",
    approved: "success",
    received: "success",
    paid: "success",
    maintained: "success",
    in_progress: "info",
    in_review: "info",
    ordered: "info",
    processing: "info",
    pending: "pending",
    pending_approval: "pending",
    requested: "pending",
    draft: "default",
    cancelled: "error",
    rejected: "error",
    overdue: "error",
    disposed: "error",
    failed: "error",
    warning: "warning",
    low_stock: "warning",
    under_maintenance: "warning",
}

export function StatusBadge({ status, label, dot = true, size = "sm", className }: StatusBadgeProps) {
    const normalizedStatus = status.toLowerCase().replace(/[\s-]/g, "_")
    const resolvedType: StatusType = statusAliases[normalizedStatus] || (statusMap[normalizedStatus] ? normalizedStatus as StatusType : "default")
    const style = statusMap[resolvedType]
    const displayLabel = label || status.replace(/[_-]/g, " ").replace(/\b\w/g, l => l.toUpperCase())

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full font-medium",
            style.bg,
            style.text,
            size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
            className
        )}>
            {dot && (
                <span className={cn(
                    "rounded-full flex-shrink-0",
                    style.dot,
                    size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"
                )} />
            )}
            {displayLabel}
        </span>
    )
}

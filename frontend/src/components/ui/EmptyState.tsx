import * as React from "react"
import { cn } from "../../lib/utils"
import { LucideIcon, InboxIcon } from "lucide-react"
import { Button } from "./Button"

export interface EmptyStateProps {
    icon?: LucideIcon
    title: string
    message?: string
    actionLabel?: string
    onAction?: () => void
    className?: string
}

export function EmptyState({
    icon: Icon = InboxIcon,
    title,
    message,
    actionLabel,
    onAction,
    className,
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center py-16 px-6 text-center",
            className
        )}>
            <div className="p-4 rounded-full bg-[var(--surface-muted)] mb-4">
                <Icon className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
            {message && (
                <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-4">{message}</p>
            )}
            {actionLabel && onAction && (
                <Button onClick={onAction} size="sm">
                    {actionLabel}
                </Button>
            )}
        </div>
    )
}

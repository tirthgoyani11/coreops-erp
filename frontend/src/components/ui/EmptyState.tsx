import { cn } from "../../lib/utils"
import type { LucideIcon } from "lucide-react"
import { InboxIcon } from "lucide-react"
import { Button } from "./Button"
import { motion } from "framer-motion"

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
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex flex-col items-center justify-center py-24 px-6 text-center rounded-3xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)]/50 backdrop-blur-sm",
                className
            )}
        >
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-[var(--color-primary)]/20 blur-xl rounded-full" />
                <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--color-primary)]/20 shadow-lg shadow-[var(--color-primary)]/5">
                    <Icon className="w-8 h-8 text-[var(--color-primary)]" strokeWidth={1.5} />
                </div>
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">{title}</h3>
            {message && (
                <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-6 leading-relaxed">{message}</p>
            )}
            {actionLabel && onAction && (
                <Button onClick={onAction} size="sm" className="shadow-lg hover:shadow-[0_4px_15px_rgba(var(--primary-glow-rgb),0.3)] transition-all">
                    {actionLabel}
                </Button>
            )}
        </motion.div>
    )
}

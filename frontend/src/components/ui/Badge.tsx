import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    const variants = {
        default: "border-transparent bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:opacity-80 shadow-[var(--shadow-glow-sm)]",
        secondary: "border-transparent bg-[var(--surface-muted)] text-[var(--text-primary)] hover:opacity-80",
        destructive: "border-transparent bg-[var(--color-error)] text-white hover:opacity-80",
        outline: "text-[var(--text-primary)] border-[var(--border-default)]",
        success: "border-transparent bg-[var(--color-success)] text-white hover:opacity-80",
        warning: "border-transparent bg-[var(--color-warning)] text-white hover:opacity-80",
        info: "border-transparent bg-[var(--color-info)] text-white hover:opacity-80",
    }

    return (
        <div
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[var(--text-xs)] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2",
                variants[variant],
                className
            )}
            {...props}
        />
    )
}

export { Badge }

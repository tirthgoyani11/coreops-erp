import * as React from "react"
import { cn } from "../../lib/utils"

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
    return (
        <div className="group relative inline-flex">
            {children}
            <div className={cn(
                "pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full opacity-0 transition-opacity group-hover:opacity-100",
                "z-[var(--z-tooltip)] w-max max-w-[200px] rounded-[var(--radius-sm)] bg-[var(--text-primary)] px-2.5 py-1.5 text-[var(--text-xs)] text-[var(--surface-card)] shadow-[var(--shadow-lg)]",
                className
            )}>
                {content}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-[var(--text-primary)]" />
            </div>
        </div>
    )
}

import * as React from "react"
import { cn } from "../../lib/utils"
import type { LucideIcon } from "lucide-react"

export interface PageHeaderProps {
    title: string
    subtitle?: string
    icon?: LucideIcon
    actions?: React.ReactNode
    breadcrumb?: React.ReactNode
    className?: string
}

export function PageHeader({ title, subtitle, icon: Icon, actions, breadcrumb, className }: PageHeaderProps) {
    return (
        <div className={cn(
            "sticky -top-4 md:-top-8 z-30 pt-4 md:pt-8 bg-[var(--bg-background)]/80 backdrop-blur-md border-b border-[var(--border-color)] pb-4 mb-6 -mt-4 md:-mt-8 -mx-4 md:-mx-8 px-4 md:px-8",
            className
        )}>
            {breadcrumb && <div className="mb-3">{breadcrumb}</div>}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="p-2 rounded-lg bg-[var(--color-primary-muted)]/50 border border-[var(--color-primary)]/10">
                            <Icon className="w-6 h-6 text-[var(--color-primary)]" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{title}</h1>
                        {subtitle && (
                            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
                        )}
                    </div>
                </div>
                {actions && (
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    )
}

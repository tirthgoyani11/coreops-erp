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
        <div className={cn("space-y-1", className)}>
            {breadcrumb && <div className="mb-2">{breadcrumb}</div>}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="p-2 rounded-lg bg-[var(--color-primary-muted)]">
                            <Icon className="w-6 h-6 text-[var(--color-primary)]" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
                        {subtitle && (
                            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
                        )}
                    </div>
                </div>
                {actions && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    )
}

import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "../../lib/utils"

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
    items: BreadcrumbItem[];
}

export function Breadcrumb({ items, className, ...props }: BreadcrumbProps) {
    return (
        <nav aria-label="Breadcrumb" className={cn("flex", className)} {...props}>
            <ol className="flex items-center space-x-2 text-[var(--text-sm)]">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    return (
                        <li key={item.label} className="flex items-center">
                            {item.href && !isLast ? (
                                <a
                                    href={item.href}
                                    className="font-medium text-[var(--text-secondary)] transition-[var(--transition-fast)] hover:text-[var(--text-primary)]"
                                >
                                    {item.label}
                                </a>
                            ) : (
                                <span className={cn(
                                    "font-medium",
                                    isLast ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                                )}>
                                    {item.label}
                                </span>
                            )}

                            {!isLast && (
                                <ChevronRight className="mx-2 h-4 w-4 text-[var(--text-muted)]" />
                            )}
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}

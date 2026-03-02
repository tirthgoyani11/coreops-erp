import * as React from "react"
import { cn } from "../../lib/utils"

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
    value: number;
    max?: number;
    color?: "primary" | "success" | "warning" | "error" | "info";
    showValue?: boolean;
}

export function ProgressBar({ value, max = 100, color = "primary", showValue = false, className, ...props }: ProgressBarProps) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const colorClasses = {
        primary: "bg-[var(--color-primary)] shadow-[var(--shadow-glow-sm)]",
        success: "bg-[var(--color-success)]",
        warning: "bg-[var(--color-warning)]",
        error: "bg-[var(--color-error)]",
        info: "bg-[var(--color-info)]",
    }

    return (
        <div className={cn("w-full", className)} {...props}>
            {showValue && (
                <div className="mb-1 flex justify-between text-[var(--text-xs)]">
                    <span className="text-[var(--text-secondary)] font-medium">{percentage.toFixed(0)}%</span>
                </div>
            )}
            <div className="h-2 w-full overflow-hidden rounded-[var(--radius-full)] bg-[var(--surface-muted)]">
                <div
                    className={cn(
                        "h-full rounded-[var(--radius-full)] transition-all duration-500 ease-in-out",
                        colorClasses[color]
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    )
}

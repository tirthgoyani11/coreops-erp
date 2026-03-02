import * as React from "react"
import { cn } from "../../lib/utils"

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: boolean
    helperText?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, error, helperText, ...props }, ref) => {
        return (
            <div className="w-full">
                <textarea
                    className={cn(
                        "flex min-h-[80px] w-full rounded-[var(--radius-md)] border bg-transparent px-3 py-2 text-[var(--text-sm)] transition-[var(--transition-normal)]",
                        "border-[var(--border-default)] text-[var(--text-primary)]",
                        "placeholder:text-[var(--text-muted)]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-background)]",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        "dark:bg-[var(--surface-card)]",
                        error && "border-[var(--color-error)] focus-visible:ring-[var(--color-error)] dark:border-[var(--color-error)]",
                        className
                    )}
                    ref={ref}
                    aria-invalid={error}
                    {...props}
                />
                {helperText && (
                    <p className={cn(
                        "mt-1.5 text-[var(--text-xs)]",
                        error ? "text-[var(--color-error)]" : "text-[var(--text-muted)]"
                    )}>
                        {helperText}
                    </p>
                )}
            </div>
        )
    }
)
Textarea.displayName = "Textarea"

export { Textarea }

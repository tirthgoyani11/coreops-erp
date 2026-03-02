import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean
    helperText?: string
    startIcon?: React.ReactNode
    endIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, helperText, startIcon, endIcon, ...props }, ref) => {
        return (
            <div className="w-full">
                <div className="relative">
                    {startIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                            {startIcon}
                        </div>
                    )}
                    <input
                        type={type}
                        className={cn(
                            "flex h-10 w-full rounded-[var(--radius-md)] border bg-transparent px-3 py-2 text-[var(--text-sm)] transition-[var(--transition-normal)]",
                            "border-[var(--border-default)] text-[var(--text-primary)]",
                            "placeholder:text-[var(--text-muted)]",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-background)]",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                            "dark:bg-[var(--surface-card)]",
                            error && "border-[var(--color-error)] focus-visible:ring-[var(--color-error)] dark:border-[var(--color-error)]",
                            startIcon && "pl-10",
                            endIcon && "pr-10",
                            className
                        )}
                        ref={ref}
                        aria-invalid={error}
                        {...props}
                    />
                    {endIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                            {endIcon}
                        </div>
                    )}
                </div>
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
Input.displayName = "Input"

export { Input }

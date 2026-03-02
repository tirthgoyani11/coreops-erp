import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success' | 'warning' | 'info'
    size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'default', ...props }, ref) => {
        const variants = {
            default: "bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:opacity-90 shadow-[var(--shadow-glow-sm)]",
            destructive: "bg-[var(--color-error)] text-white hover:opacity-90",
            outline: "border border-[var(--border-default)] bg-transparent hover:bg-[var(--surface-muted)] text-[var(--text-primary)]",
            secondary: "bg-[var(--surface-muted)] text-[var(--text-primary)] hover:opacity-90",
            ghost: "hover:bg-[var(--surface-muted)] text-[var(--text-primary)]",
            link: "text-[var(--color-primary)] underline-offset-4 hover:underline",
            success: "bg-[var(--color-success)] text-white hover:opacity-90",
            warning: "bg-[var(--color-warning)] text-white hover:opacity-90",
            info: "bg-[var(--color-info)] text-white hover:opacity-90",
        }

        const sizes = {
            default: "h-10 px-4 py-2",
            sm: "h-9 rounded-[var(--radius-sm)] px-3 text-[var(--text-xs)]",
            lg: "h-11 rounded-[var(--radius-md)] px-8 text-[var(--text-base)]",
            icon: "h-10 w-10",
        }

        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-md)] text-[var(--text-sm)] font-medium ring-offset-[var(--surface-background)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    variants[variant],
                    sizes[size],
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }

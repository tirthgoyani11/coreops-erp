import * as React from "react"
import { cn } from "../../lib/utils"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'elevated' | 'outlined' | 'glass'
}

const cardVariants = {
    default: "border border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] hover:border-[var(--border-focus)] hover:shadow-[0_8px_30px_rgba(var(--primary-glow-rgb),0.12)]",
    elevated: "border border-[var(--border-default)] bg-[var(--surface-elevated)] shadow-[var(--shadow-lg)] hover:border-[var(--border-focus)] hover:shadow-[0_8px_30px_rgba(var(--primary-glow-rgb),0.15)]",
    outlined: "border-2 border-[var(--border-default)] bg-transparent shadow-[var(--shadow-xs)] hover:border-[var(--border-focus)] hover:shadow-[0_8px_30px_rgba(var(--primary-glow-rgb),0.08)]",
    glass: "border border-[var(--border-muted)] bg-[var(--surface-card)]/60 backdrop-blur-xl shadow-[var(--shadow-md)] hover:border-[var(--border-focus)] hover:shadow-[0_8px_30px_rgba(var(--primary-glow-rgb),0.2)] dark:bg-[var(--surface-card)]/40",
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'default', ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "group rounded-[var(--radius-xl)] text-[var(--text-primary)] transition-all duration-300 ease-out",
                cardVariants[variant],
                className
            )}
            {...props}
        />
    )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("flex flex-col space-y-1.5 p-6", className)}
            {...props}
        />
    )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3
            ref={ref}
            className={cn("text-lg font-semibold leading-none tracking-tight", className)}
            {...props}
        />
    )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
        <p
            ref={ref}
            className={cn("text-sm text-[var(--text-secondary)]", className)}
            {...props}
        />
    )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
    )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("flex items-center p-6 pt-0", className)}
            {...props}
        />
    )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

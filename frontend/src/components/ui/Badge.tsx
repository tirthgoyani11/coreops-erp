import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    const variants = {
        default: "border-transparent bg-primary-600 text-white hover:bg-primary-600/80",
        secondary: "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-800/80",
        destructive: "border-transparent bg-red-500 text-white hover:bg-red-500/80 dark:bg-red-900 dark:text-gray-50 dark:hover:bg-red-900/80",
        outline: "text-gray-950 dark:text-gray-50",
        success: "border-transparent bg-green-500 text-white hover:bg-green-500/80 dark:bg-green-900 dark:text-gray-50",
        warning: "border-transparent bg-yellow-500 text-white hover:bg-yellow-500/80 dark:bg-yellow-900 dark:text-gray-50",
    }

    return (
        <div
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 dark:border-gray-800 dark:focus:ring-gray-300",
                variants[variant],
                className
            )}
            {...props}
        />
    )
}

export { Badge }

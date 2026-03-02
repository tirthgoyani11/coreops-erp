import * as React from "react"
import { cn } from "../../lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    src?: string;
    initials?: string;
    size?: "sm" | "md" | "lg";
}

export function Avatar({ src, initials, size = "md", className, ...props }: AvatarProps) {
    const sizeClasses = {
        sm: "h-8 w-8 text-[var(--text-xs)]",
        md: "h-10 w-10 text-[var(--text-sm)]",
        lg: "h-12 w-12 text-[var(--text-base)]",
    }

    return (
        <div
            className={cn(
                "relative flex shrink-0 overflow-hidden rounded-[var(--radius-full)] bg-[var(--surface-muted)]",
                sizeClasses[size],
                className
            )}
            {...props}
        >
            {src ? (
                <img src={src} className="aspect-square h-full w-full object-cover" alt="Avatar" />
            ) : (
                <span className="flex h-full w-full items-center justify-center font-medium text-[var(--text-secondary)]">
                    {initials?.substring(0, 2).toUpperCase()}
                </span>
            )}
        </div>
    )
}

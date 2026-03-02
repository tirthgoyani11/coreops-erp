import * as React from "react"
import { cn } from "../../lib/utils"

export const Dropdown = ({ children }: { children: React.ReactNode }) => {
    return <div className="relative inline-block text-left">{children}</div>
}

export const DropdownTrigger = ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => {
    return <div onClick={onClick} className="inline-flex cursor-pointer">{children}</div>
}

export const DropdownContent = ({ isOpen, children, align = "right" }: { isOpen: boolean, children: React.ReactNode, align?: "left" | "right" }) => {
    if (!isOpen) return null;
    return (
        <div className={cn(
            "absolute z-[var(--z-dropdown)] mt-2 w-56 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)] shadow-[var(--shadow-dropdown)] ring-1 ring-black ring-opacity-5 animate-in fade-in-80",
            align === "right" ? "right-0" : "left-0"
        )}>
            <div className="py-1">{children}</div>
        </div>
    )
}

export const DropdownItem = ({ children, onClick, active }: { children: React.ReactNode, onClick?: () => void, active?: boolean }) => {
    return (
        <button
            onClick={onClick}
            className={cn(
                "block w-full px-4 py-2 text-left text-[var(--text-sm)] transition-[var(--transition-fast)]",
                active ? "bg-[var(--surface-muted)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            )}
        >
            {children}
        </button>
    )
}

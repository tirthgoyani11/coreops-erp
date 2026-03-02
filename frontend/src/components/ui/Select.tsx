import * as React from "react"
import { cn } from "../../lib/utils"
import { ChevronDown } from "lucide-react"

const SelectContext = React.createContext<any>(null)

export const Select = ({ value, onValueChange, children, error }: any) => {
    const [open, setOpen] = React.useState(false)
    return (
        <SelectContext.Provider value={{ value, onValueChange, open, setOpen, error }}>
            <div className="relative">{children}</div>
        </SelectContext.Provider>
    )
}

export const SelectTrigger = ({ className, children }: any) => {
    const { open, setOpen, error } = React.useContext(SelectContext)
    return (
        <button
            type="button"
            onClick={() => setOpen(!open)}
            className={cn(
                "flex h-10 w-full items-center justify-between rounded-[var(--radius-md)] border bg-transparent px-3 py-2 text-[var(--text-sm)] ring-offset-[var(--surface-background)] transition-[var(--transition-fast)]",
                "border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                error && "border-[var(--color-error)] focus:ring-[var(--color-error)]",
                className
            )}
        >
            {children}
            <ChevronDown className="h-4 w-4 opacity-50 text-[var(--text-muted)]" />
        </button>
    )
}

export const SelectContent = ({ className, children }: any) => {
    const { open } = React.useContext(SelectContext)
    if (!open) return null
    return (
        <div className={cn(
            "absolute z-50 w-full min-w-[8rem] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-lg)] animate-in fade-in-80 mt-1",
            className
        )}>
            <div className="p-1">{children}</div>
        </div>
    )
}

export const SelectItem = ({ value, children, className }: any) => {
    const { onValueChange, setOpen } = React.useContext(SelectContext)
    return (
        <div
            onClick={() => {
                onValueChange(value)
                setOpen(false)
            }}
            className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-[var(--radius-sm)] py-1.5 px-2 text-[var(--text-sm)] outline-none transition-colors",
                "hover:bg-[var(--surface-muted)] focus:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus:text-[var(--text-primary)]",
                className
            )}
        >
            <span className="truncate">{children}</span>
        </div>
    )
}

export const SelectValue = ({ placeholder }: any) => {
    const { value } = React.useContext(SelectContext) || {}
    return <span className={value ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>{value || placeholder}</span>
}

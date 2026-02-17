import * as React from "react"
import { cn } from "../../lib/utils"
import { ChevronDown } from "lucide-react"

const SelectContext = React.createContext<any>(null)

export const Select = ({ value, onValueChange, children }: any) => {
    const [open, setOpen] = React.useState(false)
    return (
        <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
            <div className="relative">{children}</div>
        </SelectContext.Provider>
    )
}

export const SelectTrigger = ({ className, children }: any) => {
    const { open, setOpen } = React.useContext(SelectContext)
    return (
        <button
            type="button"
            onClick={() => setOpen(!open)}
            className={cn("flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:ring-offset-gray-950 dark:placeholder:text-gray-400 dark:focus:ring-gray-300", className)}
        >
            {children}
            <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
    )
}

export const SelectContent = ({ className, children }: any) => {
    const { open } = React.useContext(SelectContext)
    if (!open) return null
    return (
        <div className={cn("absolute z-50 w-full min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white text-gray-950 shadow-md animate-in fade-in-80 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50 mt-1", className)}>
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
            className={cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900 cursor-pointer dark:hover:bg-gray-800 dark:focus:bg-gray-800 dark:focus:text-gray-50", className)}
        >
            <span className="truncate">{children}</span>
        </div>
    )
}

export const SelectValue = ({ placeholder }: any) => {
    const { value } = React.useContext(SelectContext) || {}
    return <span>{value || placeholder}</span>
}

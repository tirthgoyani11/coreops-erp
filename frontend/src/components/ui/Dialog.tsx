import * as React from "react"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"

interface DialogContextType {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}
const DialogContext = React.createContext<DialogContextType>({ open: false, onOpenChange: () => { } });

export interface DialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
}

const DialogRoot = ({ open = false, onOpenChange, children }: DialogProps) => {
    return (
        <DialogContext.Provider value={{ open, onOpenChange: onOpenChange || (() => { }) }}>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
                        onClick={() => onOpenChange?.(false)}
                    />
                    {children}
                </div>
            )}
        </DialogContext.Provider>
    );
};

const DialogContentWithContext = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { size?: 'sm' | 'default' | 'lg' | 'xl' }
>(({ className, children, size = 'default', ...props }, ref) => {
    const { onOpenChange } = React.useContext(DialogContext);

    const sizes = {
        sm: 'max-w-sm',
        default: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    }

    return (
        <div
            ref={ref}
            className={cn(
                "relative z-50 grid w-full gap-4 p-6 shadow-[var(--shadow-xl)] duration-200 sm:rounded-[var(--radius-xl)]",
                "border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-primary)]",
                "animate-in zoom-in-95 slide-in-from-bottom-2",
                sizes[size],
                className
            )}
            onClick={(e) => e.stopPropagation()}
            {...props}
        >
            {children}
            <button
                className="absolute right-4 top-4 rounded-md p-1 opacity-70 transition-all hover:opacity-100 hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                onClick={() => onOpenChange(false)}
            >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </button>
        </div>
    )
})
DialogContentWithContext.displayName = "DialogContent"

const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-1.5 text-center sm:text-left",
            className
        )}
        {...props}
    />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
            className
        )}
        {...props}
    />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h2
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight text-[var(--text-primary)]",
            className
        )}
        {...props}
    />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-[var(--text-secondary)]", className)}
        {...props}
    />
))
DialogDescription.displayName = "DialogDescription"

export const Dialog = DialogRoot;
export const DialogContent = DialogContentWithContext;
export { DialogHeader, DialogFooter, DialogTitle, DialogDescription };
export const DialogTrigger = ({ children, onClick }: any) => <div onClick={onClick}>{children}</div>;

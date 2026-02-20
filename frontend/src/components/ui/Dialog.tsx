import * as React from "react"
import { X } from "lucide-react"

import { cn } from "../../lib/utils"



// Re-implementing with Context for better control
interface DialogContextType {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}
const DialogContext = React.createContext<DialogContextType>({ open: false, onOpenChange: () => { } });

const DialogRoot = ({ open = false, onOpenChange, children }: { open?: boolean, onOpenChange?: (open: boolean) => void, children: React.ReactNode }) => {
    return (
        <DialogContext.Provider value={{ open, onOpenChange: onOpenChange || (() => { }) }}>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in-0">
                    <div className="absolute inset-0" onClick={() => onOpenChange?.(false)} />
                    {children}
                </div>
            )}
        </DialogContext.Provider>
    );
};

const DialogContentWithContext = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const { onOpenChange } = React.useContext(DialogContext);
    return (
        <div
            ref={ref}
            className={cn(
                "relative z-50 grid w-full max-w-lg gap-4 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-lg duration-200 sm:rounded-lg animate-in zoom-in-95 slide-in-from-bottom-2",
                className
            )}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            {...props}
        >
            {children}
            <button
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
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
            "text-lg font-semibold leading-none tracking-tight",
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
        className={cn("text-sm text-muted-foreground text-gray-500 dark:text-gray-400", className)}
        {...props}
    />
))
DialogDescription.displayName = "DialogDescription"

// Exports matching Radix interface roughly
export const Dialog = DialogRoot;
export const DialogContent = DialogContentWithContext;
export { DialogHeader, DialogFooter, DialogTitle, DialogDescription };
// Placeholder for Trigger if needed, though we use controlled state mostly
export const DialogTrigger = ({ children, onClick }: any) => <div onClick={onClick}>{children}</div>;

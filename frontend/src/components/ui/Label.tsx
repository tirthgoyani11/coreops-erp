import * as React from "react"
import { cn } from "../../lib/utils"
// import * as LabelPrimitive from "@radix-ui/react-label" // If we had radix
// implementing simple label for now since I don't want to install radix if not present

const Label = React.forwardRef<
    HTMLLabelElement,
    React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
    <label
        ref={ref}
        className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-900 dark:text-gray-100",
            className
        )}
        {...props}
    />
))
Label.displayName = "Label"

export { Label }

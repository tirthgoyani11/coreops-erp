import React from 'react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
    valid?: boolean;
    helperText?: string;
    floatingLabel?: string;
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, valid, helperText, floatingLabel, startIcon, endIcon, ...props }, ref) => {
        return (
            <div className="w-full">
                <div className="relative flex items-center">
                    {startIcon && (
                        <div className="absolute left-3 text-[var(--text-muted)] pointer-events-none">
                            {startIcon}
                        </div>
                    )}
                    <input
                        type={type}
                        className={cn(
                            "flex w-full rounded-[var(--radius-md)] border bg-transparent px-3 text-[var(--text-sm)] transition-[var(--transition-normal)] peer",
                            floatingLabel ? "h-[3.25rem] pt-5 pb-1 placeholder:text-transparent" : "h-10 py-2 placeholder:text-[var(--text-muted)]",
                            "border-[var(--border-default)] text-[var(--text-primary)]",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:border-[var(--primary)] focus-visible:ring-offset-0",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                            "dark:bg-[var(--surface-card)]",
                            error && "border-red-500 focus-visible:ring-red-500/30",
                            valid && !error && "border-emerald-500/50 focus-visible:ring-emerald-500/30",
                            startIcon && "pl-10",
                            (endIcon || valid) && "pr-10",
                            className
                        )}
                        ref={ref}
                        aria-invalid={error}
                        placeholder={props.placeholder || (floatingLabel ? " " : undefined)}
                        {...props}
                    />
                    
                    {floatingLabel && (
                        <label
                            className={cn(
                                "absolute text-[var(--text-secondary)] transition-all duration-200 pointer-events-none select-none",
                                "top-1.5 text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]",
                                "peer-placeholder-shown:top-[1.1rem] peer-placeholder-shown:text-[var(--text-sm)] peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:font-normal",
                                "peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:font-bold peer-focus:text-[var(--primary)]",
                                startIcon ? "left-10" : "left-3",
                                error && "peer-focus:text-red-500",
                                valid && !error && "peer-focus:text-emerald-500"
                            )}
                        >
                            {floatingLabel}
                        </label>
                    )}
                    
                    <div className="absolute right-3 flex items-center pr-1 h-full pt-1">
                        <AnimatePresence mode="wait">
                            {valid && !error ? (
                                <motion.div
                                    key="valid-icon"
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                >
                                    <Check className="w-4 h-4 text-emerald-500 mb-1" />
                                </motion.div>
                            ) : endIcon ? (
                                <div key="end-icon" className="text-[var(--text-muted)] mb-1">
                                    {endIcon}
                                </div>
                            ) : null}
                        </AnimatePresence>
                    </div>
                </div>
                
                <AnimatePresence>
                    {helperText && (
                        <motion.p 
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            className={cn(
                                "mt-1.5 text-[var(--text-xs)] overflow-hidden",
                                error ? "text-red-500" : valid ? "text-emerald-500" : "text-[var(--text-muted)]"
                            )}
                        >
                            {helperText}
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>
        )
    }
)
Input.displayName = "Input"

export { Input }

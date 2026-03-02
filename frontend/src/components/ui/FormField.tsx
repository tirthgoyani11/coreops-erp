import React from 'react'
import { cn } from '../../lib/utils'
import { Label } from './Label'
import { Input, type InputProps } from './Input'

export interface FormFieldProps {
    label: string
    name: string
    error?: string
    helperText?: string
    required?: boolean
    children?: React.ReactNode
    className?: string
}

/**
 * FormField — Label + Input + Error wrapper for consistent forms
 * 
 * Usage:
 *   <FormField label="Email" name="email" error={errors.email} required>
 *     <Input type="email" {...register('email')} />
 *   </FormField>
 * 
 * Or use the InputField shorthand:
 *   <InputField label="Email" name="email" error={errors.email} type="email" />
 */
const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
    ({ label, name, error, helperText, required, children, className }, ref) => {
        return (
            <div ref={ref} className={cn("space-y-2", className)}>
                <Label htmlFor={name} className="flex items-center gap-1">
                    {label}
                    {required && <span className="text-red-500 text-xs">*</span>}
                </Label>

                {children && React.Children.map(children, child => {
                    if (React.isValidElement(child)) {
                        return React.cloneElement(child as React.ReactElement<any>, {
                            id: name,
                            name,
                            error: !!error,
                            'aria-describedby': error ? `${name}-error` : helperText ? `${name}-helper` : undefined,
                        })
                    }
                    return child
                })}

                {error && (
                    <p id={`${name}-error`} className="text-xs text-red-500 flex items-center gap-1" role="alert">
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </p>
                )}

                {!error && helperText && (
                    <p id={`${name}-helper`} className="text-xs text-[var(--text-muted)]">
                        {helperText}
                    </p>
                )}
            </div>
        )
    }
)
FormField.displayName = "FormField"

/**
 * InputField — Shorthand for FormField wrapping an Input
 */
export interface InputFieldProps extends Omit<InputProps, 'error'> {
    label: string
    error?: string
    helperText?: string
    required?: boolean
    fieldClassName?: string
}

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
    ({ label, error, helperText, required, fieldClassName, ...inputProps }, ref) => {
        const name = inputProps.name || inputProps.id || ''
        return (
            <FormField
                label={label}
                name={name}
                error={error}
                helperText={helperText}
                required={required}
                className={fieldClassName}
            >
                <Input ref={ref} error={!!error} {...inputProps} />
            </FormField>
        )
    }
)
InputField.displayName = "InputField"

export { FormField, InputField }

import toast from 'react-hot-toast';

/**
 * useToast — Convenience wrapper around react-hot-toast
 * Provides typed toast methods with consistent styling
 */
export function useToast() {
    return {
        success: (message: string) => toast.success(message),
        error: (message: string) => toast.error(message),
        info: (message: string) =>
            toast(message, {
                icon: 'ℹ️',
                style: { borderLeft: '3px solid #3b82f6' },
            }),
        warning: (message: string) =>
            toast(message, {
                icon: '⚠️',
                style: { borderLeft: '3px solid #f59e0b' },
            }),
        promise: <T,>(
            promise: Promise<T>,
            msgs: { loading: string; success: string; error: string }
        ) => toast.promise(promise, msgs),
        dismiss: (id?: string) => toast.dismiss(id),
    };
}

export default useToast;

import { Toaster as SonnerToaster } from 'sonner';

/**
 * Toaster — Global toast notification provider
 * Uses sonner for a premium, accessible experience
 */
export function Toaster() {
    return (
        <SonnerToaster
            position="top-right"
            theme="dark"
            richColors
            closeButton
            toastOptions={{
                style: {
                    background: 'rgba(24, 24, 27, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    backdropFilter: 'blur(20px)',
                },
            }}
        />
    );
}

export { toast } from 'sonner';
export default Toaster;

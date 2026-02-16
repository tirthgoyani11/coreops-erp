import toast, { Toaster as HotToaster } from 'react-hot-toast';

/**
 * Toaster — Global toast notification provider
 * Uses react-hot-toast with premium dark theme matching CoreOps design system
 */
export function Toaster() {
    return (
        <HotToaster
            position="top-right"
            gutter={12}
            containerStyle={{ top: 20, right: 20 }}
            toastOptions={{
                duration: 4000,
                style: {
                    background: 'rgba(24, 24, 27, 0.95)',
                    color: '#fafafa',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    fontSize: '14px',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    maxWidth: '420px',
                },
                success: {
                    duration: 3000,
                    iconTheme: {
                        primary: '#10b981',
                        secondary: '#fff',
                    },
                    style: {
                        borderLeft: '3px solid #10b981',
                    },
                },
                error: {
                    duration: 5000,
                    iconTheme: {
                        primary: '#ef4444',
                        secondary: '#fff',
                    },
                    style: {
                        borderLeft: '3px solid #ef4444',
                    },
                },
            }}
        />
    );
}

export { toast };
export default Toaster;

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * React Error Boundary
 * Catches render errors and shows a premium fallback UI.
 * Resets on navigation via key={location.pathname} from parent.
 */
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        // Log to console (future: send to monitoring service)
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }


    private handleReload = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-[var(--bg-dark,#030304)] flex items-center justify-center p-6">
                    <div
                        className="max-w-lg w-full rounded-2xl p-8 text-center"
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        {/* Error Icon */}
                        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </div>

                        {/* Title */}
                        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-[var(--text-muted,#a1a1aa)] text-sm mb-6">
                            An unexpected error occurred. Please try refreshing the page or navigating back to the dashboard.
                        </p>

                        {/* Actions */}
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <button
                                onClick={this.handleReload}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                                style={{
                                    background: 'var(--primary, #10b981)',
                                    color: '#fff',
                                }}
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reload Page
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    color: '#d4d4d8',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                }}
                            >
                                <Home className="w-4 h-4" />
                                Dashboard
                            </button>
                        </div>

                        {/* Error details (dev only) */}
                        {import.meta.env.DEV && this.state.error && (
                            <details className="text-left mt-4">
                                <summary className="text-xs text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)] transition-colors">
                                    Error Details
                                </summary>
                                <pre
                                    className="mt-2 p-3 rounded-lg text-xs text-red-300 overflow-x-auto"
                                    style={{
                                        background: 'rgba(239,68,68,0.05)',
                                        border: '1px solid rgba(239,68,68,0.1)',
                                        maxHeight: '200px',
                                    }}
                                >
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

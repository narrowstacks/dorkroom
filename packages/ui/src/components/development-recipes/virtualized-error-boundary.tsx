import { Component, type ErrorInfo, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically designed for virtualized scrolling components.
 * Provides a retry mechanism that resets the error state without reloading the page.
 */
export class VirtualizedErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log errors in development mode for debugging virtualized components
    if (process.env.NODE_ENV === 'development') {
      console.error('Virtualized component error:', error, errorInfo);
    }
  }

  private handleReset = () => {
    // Reset error state
    this.setState({ hasError: false, error: null });

    // Call optional reset callback (e.g., to reset parent component state)
    this.props.onReset?.();
  };

  public override render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI optimized for virtualized content areas
      return (
        <div className="flex min-h-[300px] w-full flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 rounded-full bg-[color:var(--color-semantic-error)]/10 p-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-[color:var(--color-semantic-error)]"
              aria-label="Error"
              role="img"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-[color:var(--color-text-primary)]">
            Something went wrong loading the results
          </h3>
          <p className="mb-4 max-w-md text-sm text-[color:var(--color-text-secondary)]">
            An error occurred while rendering the list. Please try again.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)]',
              'hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-text-primary)]'
            )}
          >
            Try Again
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 w-full max-w-2xl">
              <summary className="cursor-pointer text-sm font-medium text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]">
                Error Details
              </summary>
              <pre className="mt-2 overflow-auto rounded-lg bg-black/5 p-4 text-left text-xs text-[color:var(--color-text-tertiary)]">
                {this.state.error.stack || this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

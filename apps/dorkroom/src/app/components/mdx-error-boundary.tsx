import { Component, ReactNode } from 'react';

interface MDXErrorBoundaryProps {
  children: ReactNode;
}

interface MDXErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary for MDX content rendering
 * Catches errors in dynamically loaded MDX components to prevent full page crashes
 */
export class MDXErrorBoundary extends Component<
  MDXErrorBoundaryProps,
  MDXErrorBoundaryState
> {
  constructor(props: MDXErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): MDXErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('MDX rendering error:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-lg border border-red-500/20 bg-red-500/10 p-6"
          style={{
            borderColor: 'rgba(239, 68, 68, 0.2)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
          }}
        >
          <h2
            className="mb-2 text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Failed to Load Page
          </h2>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Sorry, this page could not be loaded. Please try another page or
            refresh the browser.
          </p>
          {this.state.error && (
            <details className="mt-4">
              <summary
                className="cursor-pointer text-sm font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Error details
              </summary>
              <pre
                className="mt-2 overflow-auto rounded bg-black/20 p-2 text-xs"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

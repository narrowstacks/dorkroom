/**
 * Error Boundary Component
 * Catches React errors and displays user-friendly error UI
 */

import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center px-6 py-12">
          <div className="mx-auto max-w-md text-center space-y-4">
            <div
              className="flex justify-center"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <AlertTriangle className="h-12 w-12" />
            </div>
            <h2
              className="text-xl font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Something went wrong
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full px-6 py-2 text-sm font-medium transition hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-text-primary)',
                color: 'var(--color-background)',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

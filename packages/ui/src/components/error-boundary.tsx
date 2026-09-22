import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useRef,
} from 'react';
import { cn } from '../lib/cn';

export interface ErrorFallbackAction {
  label: string;
  onClick: () => void;
}

export interface ErrorFallbackProps {
  /** Shown only in development builds; never rendered in production. */
  error?: Error | null;
  /** Called when the primary action button is pressed. */
  onReload: () => void;
  /** Primary action button label. Defaults to "Reload Page". */
  reloadLabel?: string;
  /**
   * An optional second button, e.g. a full page reload offered alongside a
   * lighter in-app retry — a retry alone can't recover from a chunk that
   * failed to load, since that failure is cached by the module loader.
   */
  secondaryAction?: ErrorFallbackAction;
  /**
   * Body copy between the heading and the action button(s). Defaults to copy
   * that only makes sense for a single "reload" action; callers offering a
   * different primary action (or two actions) should pass their own neutral
   * wording rather than leave the mismatch.
   */
  message?: string;
}

const buttonClasses =
  'rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]';

/**
 * The styled "something broke" UI, shared by the app-level `ErrorBoundary`
 * below and by callers that need to catch errors somewhere other than a plain
 * React error boundary (e.g. a router's `errorComponent`, which gets its own
 * `reset`/retry mechanism rather than remounting a class component).
 */
export function ErrorFallback({
  error,
  onReload,
  reloadLabel = 'Reload Page',
  secondaryAction,
  message = 'We encountered an unexpected error. Please try refreshing the page.',
}: ErrorFallbackProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Belt-and-suspenders: `role="alert"` announces the fallback to a screen
  // reader as soon as it's mounted, and moving focus to the heading also
  // gives sighted keyboard users a sane place to land, since whatever they
  // were focused on in the failed content is now gone.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div
      role="alert"
      className="flex min-h-[400px] w-full flex-col items-center justify-center p-6 text-center"
    >
      <div className="mb-4 rounded-full bg-[color:var(--color-semantic-error)]/10 p-4">
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
          className="size-8 text-[color:var(--color-semantic-error)]"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mb-2 text-xl font-semibold text-[color:var(--color-text-primary)] focus-visible:outline-none"
      >
        Something went wrong
      </h2>
      <p className="mb-6 max-w-md text-[color:var(--color-text-secondary)]">
        {message}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onReload}
          className={cn(
            buttonClasses,
            'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)]',
            'hover:opacity-90'
          )}
        >
          {reloadLabel}
        </button>
        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className={cn(
              buttonClasses,
              'border text-[color:var(--color-text-primary)]',
              'border-[color:var(--color-border-secondary)] bg-transparent',
              'hover:bg-[color:var(--color-surface)]'
            )}
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
      {process.env.NODE_ENV === 'development' && error && (
        <pre className="mt-8 max-w-full overflow-auto rounded-lg bg-black/5 p-4 text-left text-xs text-[color:var(--color-text-tertiary)]">
          {error.toString()}
        </pre>
      )}
    </div>
  );
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Called when a render below this boundary throws. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onReload={() => window.location.reload()}
        />
      );
    }

    return this.props.children;
  }
}

import { AlertCircle, AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { colorMixOr } from '../lib/color';

interface StatusAlertProps {
  message: string;
  action?: 'warning' | 'error';
  className?: string;
  /** Renders a close button that calls this. Requires `dismissLabel`. */
  onDismiss?: () => void;
  /** Accessible name for the close button, e.g. "Dismiss message". */
  dismissLabel?: string;
}

export function StatusAlert({
  message,
  action = 'warning',
  className,
  onDismiss,
  dismissLabel = 'Dismiss',
}: StatusAlertProps) {
  const Icon = action === 'error' ? AlertCircle : AlertTriangle;

  return (
    <div
      className={cn('flex items-center gap-3 rounded-lg border p-3', className)}
      role={action === 'error' ? 'alert' : 'status'}
      style={{
        borderColor:
          action === 'error'
            ? colorMixOr(
                'var(--color-semantic-error)',
                50,
                'transparent',
                'var(--color-border-secondary)'
              )
            : colorMixOr(
                'var(--color-semantic-warning)',
                50,
                'transparent',
                'var(--color-border-secondary)'
              ),
        backgroundColor:
          action === 'error'
            ? colorMixOr(
                'var(--color-semantic-error)',
                10,
                'transparent',
                'var(--color-border-muted)'
              )
            : colorMixOr(
                'var(--color-semantic-warning)',
                10,
                'transparent',
                'var(--color-border-muted)'
              ),
        color:
          action === 'error'
            ? colorMixOr(
                'var(--color-semantic-error)',
                80,
                'var(--color-text-primary)',
                'var(--color-semantic-error)'
              )
            : colorMixOr(
                'var(--color-semantic-warning)',
                80,
                'var(--color-text-primary)',
                'var(--color-semantic-warning)'
              ),
      }}
    >
      <Icon className="size-4 flex-shrink-0" aria-hidden="true" />
      <span className="flex-1 text-sm">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="-m-1 flex-shrink-0 rounded p-1 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

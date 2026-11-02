import { AlertCircle, AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { colorMixOr } from '../lib/color';

interface StatusAlertProps {
  message: string;
  action?: 'warning' | 'error';
  className?: string;
  /**
   * Skip setting the built-in `role`. Use this when a parent already owns
   * a persistent live region (e.g. a wrapper that stays mounted so screen
   * readers announce the first message, not just later swaps) and this
   * component just renders content inside it — nesting two `role="status"`
   * / `role="alert"` regions causes some screen readers to announce twice
   * or not at all.
   */
  omitRole?: boolean;
  /** Renders a close button that calls this. Requires `dismissLabel`. */
  onDismiss?: () => void;
  /** Accessible name for the close button, e.g. "Dismiss message". */
  dismissLabel?: string;
}

export function StatusAlert({
  message,
  action = 'warning',
  className,
  omitRole = false,
  onDismiss,
  dismissLabel = 'Dismiss',
}: StatusAlertProps) {
  const Icon = action === 'error' ? AlertCircle : AlertTriangle;

  return (
    <div
      className={cn('flex items-center gap-3 rounded-lg border p-3', className)}
      role={omitRole ? undefined : action === 'error' ? 'alert' : 'status'}
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

interface LiveStatusAlertProps {
  /** The text to show and announce. Empty, null or undefined hides the alert. */
  message: string | null | undefined;
  action?: 'warning' | 'error';
  className?: string;
  onDismiss?: () => void;
  dismissLabel?: string;
  /**
   * Set to false while another live region already announces this same
   * message (e.g. an open drawer section), so it is not spoken twice. The
   * region stays mounted, it just has no live role meanwhile.
   */
  announce?: boolean;
}

/**
 * A `StatusAlert` that screen readers announce when it appears.
 *
 * Assistive tech only announces text *added to* a live region that already
 * exists, so an alert that mounts together with its own `role` is usually
 * silent. This keeps the live region (`role="alert"` for errors, `role="status"`
 * for warnings) mounted at all times and swaps the visible alert in and out
 * of it. Render it unconditionally and pass `message` instead of writing
 * `{cond && <StatusAlert />}`.
 *
 * While the message is empty the wrapper is taken out of flow
 * (`empty:absolute`, still rendered and in the accessibility tree, unlike
 * `display: none`), so nothing is visible and a flex `gap-*` ignores it.
 * `space-y-*` does not ignore it, so put the alert in a `flex flex-col gap-*`
 * parent when it needs spacing from its siblings.
 *
 * Do not place it inside another live region (use `StatusAlert` with
 * `omitRole` there), and do not pair it with a `ResultAnnouncer` that speaks
 * the same text.
 */
export function LiveStatusAlert({
  message,
  action = 'warning',
  className,
  onDismiss,
  dismissLabel,
  announce = true,
}: LiveStatusAlertProps) {
  const alert = message ? (
    <StatusAlert
      message={message}
      action={action}
      className={className}
      omitRole
      onDismiss={onDismiss}
      dismissLabel={dismissLabel}
    />
  ) : null;

  if (!announce) {
    return <div className="block empty:absolute">{alert}</div>;
  }
  if (action === 'error') {
    return (
      <div role="alert" className="block empty:absolute">
        {alert}
      </div>
    );
  }
  return <output className="block empty:absolute">{alert}</output>;
}

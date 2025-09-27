import { AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/cn';
import { colorMixOr } from '../lib/color';

interface WarningAlertProps {
  message: string;
  action?: 'warning' | 'error';
  className?: string;
}

/**
 * Displays a compact warning or error alert with an icon and message.
 *
 * Renders a bordered, colored container whose semantics and colors depend on the `action` prop.
 *
 * @param message - The text message shown inside the alert
 * @param action - Visual and semantic type of the alert; either `'warning'` or `'error'`. Defaults to `'warning'`
 * @param className - Additional CSS class names to apply to the root element
 * @returns A JSX element representing the alert
 */
export function WarningAlert({
  message,
  action = 'warning',
  className,
}: WarningAlertProps) {
  const Icon = action === 'error' ? AlertCircle : AlertTriangle;

  return (
    <div
      className={cn('flex items-center gap-3 rounded-lg border p-3', className)}
      role={action === 'error' ? 'alert' : 'status'}
      style={{
        borderColor:
          action === 'error'
            ? colorMixOr('var(--color-semantic-error)', 50, 'transparent', 'var(--color-border-secondary)')
            : colorMixOr('var(--color-semantic-warning)', 50, 'transparent', 'var(--color-border-secondary)'),
        backgroundColor:
          action === 'error'
            ? colorMixOr('var(--color-semantic-error)', 10, 'transparent', 'var(--color-border-muted)')
            : colorMixOr('var(--color-semantic-warning)', 10, 'transparent', 'var(--color-border-muted)'),
        color:
          action === 'error'
            ? colorMixOr('var(--color-semantic-error)', 80, 'var(--color-text-primary)', 'var(--color-semantic-error)')
            : colorMixOr('var(--color-semantic-warning)', 80, 'var(--color-text-primary)', 'var(--color-semantic-warning)'),
      }}
    >
      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

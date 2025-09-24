import { AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/cn';

interface WarningAlertProps {
  message: string;
  action?: 'warning' | 'error';
  className?: string;
}

export function WarningAlert({
  message,
  action = 'warning',
  className,
}: WarningAlertProps) {
  const Icon = action === 'error' ? AlertCircle : AlertTriangle;

  return (
    <div
      className={cn('flex items-center gap-3 rounded-lg border p-3', className)}
      style={{
        borderColor:
          action === 'error'
            ? 'color-mix(in srgb, var(--color-semantic-error) 50%, transparent)'
            : 'color-mix(in srgb, var(--color-semantic-warning) 50%, transparent)',
        backgroundColor:
          action === 'error'
            ? 'color-mix(in srgb, var(--color-semantic-error) 10%, transparent)'
            : 'color-mix(in srgb, var(--color-semantic-warning) 10%, transparent)',
        color:
          action === 'error'
            ? 'color-mix(in srgb, var(--color-semantic-error) 80%, var(--color-text-primary))'
            : 'color-mix(in srgb, var(--color-semantic-warning) 80%, var(--color-text-primary))',
      }}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

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
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3',
        action === 'error'
          ? 'border-red-500/50 bg-red-500/10 text-red-200'
          : 'border-yellow-500/50 bg-yellow-500/10 text-yellow-200',
        className
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

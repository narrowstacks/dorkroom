import { cn } from '../lib/cn';

interface ResultRowProps {
  label: string;
  value: string;
  className?: string;
}

export function ResultRow({ label, value, className }: ResultRowProps) {
  return (
    <div className={cn('flex justify-between items-center py-1', className)}>
      <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
        {label}
      </span>
      <span
        className="text-sm font-medium"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {value}
      </span>
    </div>
  );
}

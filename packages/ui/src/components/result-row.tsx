import { cn } from '../lib/cn';

interface ResultRowProps {
  label: string;
  value: string;
  className?: string;
}

/**
 * Renders a horizontal key/value row with a label on the left and a value on the right.
 *
 * @param label - Text displayed on the left side of the row.
 * @param value - Text displayed on the right side of the row (rendered with medium font weight).
 * @param className - Optional additional CSS classes applied to the root container.
 * @returns The rendered row element containing the label and value.
 */
export function ResultRow({ label, value, className }: ResultRowProps) {
  return (
    <div className={cn('flex justify-between items-center py-1', className)}>
      <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
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

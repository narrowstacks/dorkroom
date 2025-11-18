import { cn } from '../../lib/cn';
import { Skeleton } from '../ui/skeleton';

interface FavoriteMessageSkeletonProps {
  message: string;
  variant?: 'card' | 'row';
  className?: string;
}

export function FavoriteMessageSkeleton({
  message,
  variant = 'card',
  className,
}: FavoriteMessageSkeletonProps) {
  if (variant === 'row') {
    return (
      <tr
        className="border-b"
        style={{ borderColor: 'var(--color-border-secondary)' }}
      >
        <td colSpan={8} className={cn('px-4 py-4', className)}>
          <div className="flex items-center justify-center gap-3">
            <Skeleton className="h-4 w-4 rounded-full" />
            <div
              className="text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {message}
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div
      className={cn(
        'cursor-default rounded-2xl border p-3 shadow-subtle',
        className
      )}
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'rgb(var(--color-background-rgb) / 0.15)',
      }}
    >
      <div className="flex flex-col items-center justify-center gap-2 py-4">
        <Skeleton className="h-4 w-4 rounded-full" />
        <div
          className="text-sm text-center"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {message}
        </div>
      </div>
    </div>
  );
}

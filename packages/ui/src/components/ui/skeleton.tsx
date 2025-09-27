import { cn } from '../../lib/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md', className)}
      style={{ backgroundColor: 'var(--color-border-muted)' }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div
      className="cursor-default rounded-2xl border p-4 shadow-subtle"
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'rgba(var(--color-background-rgb), 0.15)',
      }}
    >
      <div>
        <div>
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <Skeleton className="h-3 w-8 mb-1" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div>
          <Skeleton className="h-3 w-8 mb-1" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div>
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div>
          <Skeleton className="h-3 w-12 mb-1" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <tr
      className="border-b"
      style={{ borderColor: 'var(--color-border-secondary)' }}
    >
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-32" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-28" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-12" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-16" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-14" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-12" />
      </td>
    </tr>
  );
}

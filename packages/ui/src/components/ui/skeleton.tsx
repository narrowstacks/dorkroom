import { cn } from '../../lib/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-white/10',
        className
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="cursor-default rounded-2xl border border-white/10 bg-white/5 p-4 shadow-subtle">
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
    <tr className="border-b border-white/10">
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
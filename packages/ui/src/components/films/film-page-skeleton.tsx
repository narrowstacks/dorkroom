import type { FC } from 'react';
import { cn } from '../../lib/cn';
import { Skeleton } from '../ui/skeleton';

interface FilmPageSkeletonProps {
  /** Matches the `layout` of the `FilmPage` it stands in for. */
  layout: 'narrow' | 'wide';
  className?: string;
}

/** Stand-in for a `FilmPage` while a deep-linked film is still being found. */
export const FilmPageSkeleton: FC<FilmPageSkeletonProps> = ({
  layout,
  className,
}) => (
  <output
    aria-busy="true"
    aria-label="Loading film"
    className={cn('block space-y-6', className)}
  >
    <div
      className={cn(
        'flex gap-5',
        layout === 'wide' ? 'flex-row items-start' : 'flex-col items-center'
      )}
    >
      <Skeleton className="size-32 shrink-0 md:size-48" />
      <div className={cn('space-y-3', layout === 'narrow' && 'w-full')}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-6 w-40" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  </output>
);

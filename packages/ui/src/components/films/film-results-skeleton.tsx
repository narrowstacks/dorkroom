import type { FC } from 'react';
import { cn } from '../../lib/cn';
import { Skeleton } from '../ui/skeleton';
import {
  type FilmResultsView,
  isTableView,
  rowHeightFor,
} from './film-results-view';

interface FilmResultsSkeletonProps {
  view: FilmResultsView;
  showRecipes: boolean;
  className?: string;
}

/** Stable keys for the placeholder rows. */
const SKELETON_KEYS = Array.from(
  { length: 8 },
  (_, index) => `film-skeleton-${index}`
);

/** Placeholder rows in the layout the loaded results will have. */
export const FilmResultsSkeleton: FC<FilmResultsSkeletonProps> = ({
  view,
  showRecipes,
  className,
}) => {
  const height = rowHeightFor(view);
  const table = isTableView(view);
  return (
    <output
      aria-busy="true"
      aria-label="Loading films"
      className={cn('block', className)}
    >
      {SKELETON_KEYS.map((key) => (
        <div
          key={key}
          aria-hidden="true"
          style={{ height }}
          className="flex items-center gap-4 border-b border-[color:var(--color-border-secondary)] px-3"
        >
          <Skeleton className="size-10 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-1/2" />
            {!table && <Skeleton className="h-3 w-1/3" />}
          </div>
          {table && <Skeleton className="h-4 w-16" />}
          <Skeleton className="h-4 w-10" />
          {view === 'table' && <Skeleton className="h-4 w-20" />}
          {table && showRecipes && <Skeleton className="h-4 w-8" />}
        </div>
      ))}
    </output>
  );
};

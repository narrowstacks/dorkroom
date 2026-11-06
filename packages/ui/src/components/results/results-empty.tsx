import type { FC, ReactNode, Ref } from 'react';
import { cn } from '../../lib/cn';

interface ResultsEmptyProps {
  icon: ReactNode;
  title: string;
  /** Focus lands here when the row it was meant for is gone (#604). */
  emptyRef?: Ref<HTMLDivElement>;
  /** "Clear filters" shows when this is provided and filters are active. */
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
}

/** The empty state inside a `ResultsFrame`, which supplies border and surface. */
export const ResultsEmpty: FC<ResultsEmptyProps> = ({
  icon,
  title,
  emptyRef,
  onClearFilters,
  hasActiveFilters = false,
  className,
}) => (
  <div
    ref={emptyRef}
    tabIndex={-1}
    className={cn(
      'flex flex-col items-center justify-center rounded-2xl p-12 text-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]',
      className
    )}
  >
    <div className="mb-4 flex size-16 items-center justify-center rounded-full border-2 border-dashed border-[color:var(--color-border-secondary)] text-tertiary">
      {icon}
    </div>
    <p className="mb-1 text-base font-medium text-primary">{title}</p>
    <p className="text-sm text-tertiary">
      Try adjusting your filters or search query
    </p>
    {onClearFilters && hasActiveFilters && (
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-4 min-h-11 rounded-xl border border-secondary bg-surface-muted px-4 py-2 text-sm font-medium text-secondary transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]"
      >
        Clear filters
      </button>
    )}
  </div>
);

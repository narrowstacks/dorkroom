import { Film as FilmIcon } from 'lucide-react';
import type { FC, Ref } from 'react';
import { cn } from '../../lib/cn';

interface FilmResultsEmptyProps {
  /** Focus lands here when the card or row it was meant for is gone (#604). */
  emptyRef?: Ref<HTMLDivElement>;
  /**
   * Called when the user clicks "Clear filters". Only rendered when provided
   * and `hasActiveFilters` is true.
   */
  onClearFilters?: () => void;
  /** Whether any filter or search query is currently active. */
  hasActiveFilters?: boolean;
  className?: string;
}

/** The "No films found" state, shared by the card grid and the results table. */
export const FilmResultsEmpty: FC<FilmResultsEmptyProps> = ({
  emptyRef,
  onClearFilters,
  hasActiveFilters = false,
  className,
}) => (
  <div
    ref={emptyRef}
    tabIndex={-1}
    className={cn(
      'flex flex-col items-center justify-center rounded-2xl border p-12 text-center focus-visible:outline-2 focus-visible:outline-[color:var(--color-focus-ring)]',
      className
    )}
    style={{
      borderColor: 'var(--color-border-secondary)',
      backgroundColor: 'rgba(var(--color-background-rgb), 0.15)',
    }}
  >
    <div
      className="mb-4 flex size-16 items-center justify-center rounded-full border-2 border-dashed"
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'rgba(var(--color-background-rgb), 0.3)',
      }}
    >
      <FilmIcon
        className="size-8"
        style={{ color: 'var(--color-text-tertiary)' }}
      />
    </div>
    <p
      className="mb-1 text-base font-medium"
      style={{ color: 'var(--color-text-primary)' }}
    >
      No films found
    </p>
    <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
      Try adjusting your filters or search query
    </p>
    {onClearFilters && hasActiveFilters && (
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-4 rounded-xl px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]"
        style={{
          backgroundColor: 'var(--color-surface-muted)',
          color: 'var(--color-text-secondary)',
          border: '1px solid var(--color-border-secondary)',
        }}
      >
        Clear filters
      </button>
    )}
  </div>
);

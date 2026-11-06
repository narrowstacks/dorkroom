import { ArrowDown, ArrowUp } from 'lucide-react';
import type { ComponentPropsWithoutRef, FC, ReactNode } from 'react';
import { cn } from '../../lib/cn';

const HEAD_CLASS =
  'px-3 py-0 text-left text-xs font-medium uppercase tracking-wide text-tertiary';

/** A plain column header in a results table. */
export const ResultsTableHead: FC<ComponentPropsWithoutRef<'th'>> = ({
  className,
  ...props
}) => <th scope="col" {...props} className={cn(HEAD_CLASS, className)} />;

interface SortableResultsTableHeadProps {
  label: ReactNode;
  /** Whether the table is sorted by this column. */
  active: boolean;
  /** The direction the sort runs, for the active column's icon and aria-sort. */
  direction: 'ascending' | 'descending';
  onSort: () => void;
  align?: 'left' | 'right';
  className?: string;
  /** For a width computed at runtime. */
  width?: number;
}

/** A results table column header whose button sorts by that column. */
export const SortableResultsTableHead: FC<SortableResultsTableHeadProps> = ({
  label,
  active,
  direction,
  onSort,
  align = 'left',
  className,
  width,
}) => {
  const Icon = direction === 'ascending' ? ArrowUp : ArrowDown;
  return (
    <ResultsTableHead
      aria-sort={active ? direction : undefined}
      className={cn(align === 'right' && 'text-right', className)}
      style={width === undefined ? undefined : { width }}
    >
      <button
        type="button"
        onClick={onSort}
        className={cn(
          'inline-flex min-h-11 min-w-11 items-center gap-3 uppercase tracking-wide transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]',
          align === 'right' && 'flex-row-reverse',
          active
            ? 'font-medium text-primary'
            : 'font-medium text-tertiary hover:text-primary'
        )}
      >
        {label}
        {active && <Icon className="size-3.5" aria-hidden="true" />}
      </button>
    </ResultsTableHead>
  );
};

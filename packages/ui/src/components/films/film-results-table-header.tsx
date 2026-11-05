import type { FilmSort } from '@dorkroom/logic';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { FC } from 'react';
import { cn } from '../../lib/cn';
import type { FilmTableView } from './film-results-view';

interface FilmResultsTableHeaderProps {
  view: FilmTableView;
  sort: FilmSort;
  onSortChange: (sort: FilmSort) => void;
  showRecipes: boolean;
}

interface SortableHeaderProps {
  label: string;
  sortKey: FilmSort;
  /** The direction the sort runs, for the active column's icon and aria-sort. */
  direction: 'ascending' | 'descending';
  sort: FilmSort;
  onSortChange: (sort: FilmSort) => void;
  align?: 'left' | 'right';
  className?: string;
}

const headClass =
  'px-3 py-0 text-left text-xs font-medium uppercase tracking-wide text-tertiary';

/**
 * A sortable column header. Clicking sets this column's sort; there is no
 * direction toggle, each column has the one direction that makes sense.
 */
const SortableHeader: FC<SortableHeaderProps> = ({
  label,
  sortKey,
  direction,
  sort,
  onSortChange,
  align = 'left',
  className,
}) => {
  const active = sort === sortKey;
  const Icon = direction === 'ascending' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? direction : undefined}
      className={cn(headClass, align === 'right' && 'text-right', className)}
    >
      <button
        type="button"
        onClick={() => onSortChange(sortKey)}
        className={cn(
          'inline-flex min-h-11 items-center gap-3 uppercase tracking-wide transition-colors',
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
    </th>
  );
};

/** The sticky head of the films table; `view` decides which columns it has. */
export const FilmResultsTableHeader: FC<FilmResultsTableHeaderProps> = ({
  view,
  sort,
  onSortChange,
  showRecipes,
}) => {
  const full = view === 'table';
  const sortProps = { sort, onSortChange };
  return (
    <thead className="sticky top-0 z-10 bg-surface-muted">
      <tr>
        <th scope="col" className={cn(headClass, 'w-16')}>
          <span className="sr-only">Photo</span>
        </th>
        <SortableHeader
          {...sortProps}
          label="Film"
          sortKey="name"
          direction="ascending"
        />
        <th scope="col" className={cn(headClass, 'w-28')}>
          Type
        </th>
        <SortableHeader
          {...sortProps}
          label="ISO"
          sortKey="iso"
          direction="ascending"
          align="right"
          className="w-20"
        />
        {full && (
          <th scope="col" className={cn(headClass, 'w-36 text-right')}>
            Reciprocity
          </th>
        )}
        {showRecipes && (
          <SortableHeader
            {...sortProps}
            label="Recipes"
            sortKey="recipes"
            direction="descending"
            align="right"
            className="w-24"
          />
        )}
        {full && (
          <th scope="col" className={cn(headClass, 'w-32')}>
            Status
          </th>
        )}
      </tr>
    </thead>
  );
};

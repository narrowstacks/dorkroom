import type { Film } from '@dorkroom/api';
import { type FC, memo } from 'react';
import { cn } from '../../lib/cn';
import { filmMetaLine } from './film-results-view';

interface FilmListRowProps {
  film: Film;
  recipeCount: number;
  isSelected: boolean;
  onSelect: (film: Film) => void;
  height: number;
}

const FilmListRowComponent: FC<FilmListRowProps> = ({
  film,
  recipeCount,
  isSelected,
  onSelect,
  height,
}) => (
  <li
    data-list-item-key={film.uuid}
    style={{ height }}
    className="border-b border-[color:var(--color-border-secondary)]"
  >
    <button
      type="button"
      aria-current={isSelected ? 'true' : undefined}
      onClick={() => onSelect(film)}
      className={cn(
        'group flex h-full w-full items-center gap-3 px-3 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-focus-ring)]',
        isSelected
          ? 'bg-surface-muted shadow-[inset_3px_0_0_var(--color-brand)]'
          : 'hover:bg-surface-muted'
      )}
    >
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm text-primary group-hover:underline',
            isSelected ? 'font-bold' : 'font-medium'
          )}
        >
          {film.name}
        </span>
        <span className="block truncate text-xs text-tertiary">
          {filmMetaLine(film, recipeCount)}
        </span>
      </span>
      <span className="shrink-0 text-sm tabular-nums text-secondary">
        <span className="sr-only">ISO </span>
        {film.isoSpeed}
      </span>
    </button>
  </li>
);

export const FilmListRow = memo(FilmListRowComponent);

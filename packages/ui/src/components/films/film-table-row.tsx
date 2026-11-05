import type { Film } from '@dorkroom/api';
import { filmSupportsRecipes } from '@dorkroom/logic';
import { type FC, memo, use } from 'react';
import { cn } from '../../lib/cn';
import { Tag } from '../ui/tag';
import { FilmImage } from './film-image';
import { FilmImageModeContext } from './film-image-mode-context';
import { type FilmTableView, TABLE_ROW_HEIGHT } from './film-results-view';

interface FilmTableRowProps {
  film: Film;
  view: FilmTableView;
  showRecipes: boolean;
  recipeCount: number;
  onSelect: (film: Film) => void;
}

const cellClass = 'px-3 align-middle';

const FilmTableRowComponent: FC<FilmTableRowProps> = ({
  film,
  view,
  showRecipes,
  recipeCount,
  onSelect,
}) => {
  // Only `'all'` loads thumbnails; otherwise the film icon tile shows (#636).
  const showPhoto = use(FilmImageModeContext) === 'all';
  const full = view === 'table';

  return (
    <tr
      data-list-item-key={film.uuid}
      style={{ height: TABLE_ROW_HEIGHT }}
      // The row shows the focus indicator, since the button is stretched over it.
      className="relative border-b border-[color:var(--color-border-secondary)] transition-colors hover:bg-surface-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-[color:var(--color-focus-ring)]"
    >
      <td className={cn(cellClass, 'w-16')}>
        <FilmImage
          src={showPhoto ? film.staticImageUrl : null}
          alt=""
          size="sm"
        />
      </td>
      <td className={cn(cellClass, 'min-w-0')}>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onSelect(film)}
            className="min-w-0 truncate text-left text-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            <span className="text-tertiary">{film.brand}</span>{' '}
            <span className="font-semibold text-primary">{film.name}</span>
          </button>
          {film.baseFilmSlug && (
            <span className="hidden shrink-0 xl:inline-flex">
              <Tag variant="info">Rebrand</Tag>
            </span>
          )}
        </div>
      </td>
      <td className={cn(cellClass, 'w-28')}>
        <Tag>{film.colorType}</Tag>
      </td>
      <td className={cn(cellClass, 'w-20 text-right tabular-nums')}>
        {film.isoSpeed}
      </td>
      {full && (
        <td className={cn(cellClass, 'w-36 truncate text-sm text-secondary')}>
          {film.reciprocityFailure ?? '-'}
        </td>
      )}
      {showRecipes && (
        <td className={cn(cellClass, 'w-24 text-sm tabular-nums')}>
          {filmSupportsRecipes(film)
            ? recipeCount > 0
              ? recipeCount
              : '-'
            : null}
        </td>
      )}
      {full && (
        <td className={cn(cellClass, 'w-32 text-sm')}>
          {film.discontinued ? (
            <Tag variant="discontinued">Discontinued</Tag>
          ) : (
            <span className="text-tertiary">Active</span>
          )}
        </td>
      )}
    </tr>
  );
};

export const FilmTableRow = memo(FilmTableRowComponent);

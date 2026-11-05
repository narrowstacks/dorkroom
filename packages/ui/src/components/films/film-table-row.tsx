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
    // eslint-disable-next-line react-doctor/click-events-have-key-events -- pointer-only convenience: the Film cell button is the keyboard control for the same action, so the row itself takes no focus or key handler
    <tr
      data-list-item-key={film.uuid}
      style={{ height: TABLE_ROW_HEIGHT }}
      onClick={() => onSelect(film)}
      // The row is the pointer target; the Film cell button is the keyboard
      // one. The row shows the focus indicator when :has() is supported, and
      // the button underlines on focus where it is not.
      className="group cursor-pointer border-b border-[color:var(--color-border-secondary)] transition-colors hover:bg-surface-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-[color:var(--color-focus-ring)]"
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
            onClick={(event) => {
              // The row handles the click too; this keeps it to one call.
              event.stopPropagation();
              onSelect(film);
            }}
            className="min-w-0 truncate text-left text-sm focus-visible:underline focus-visible:outline-none"
          >
            <span className="text-tertiary">{film.brand}</span>{' '}
            <span className="font-semibold text-primary group-hover:underline">
              {film.name}
            </span>
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
        <td
          className={cn(
            cellClass,
            'w-36 truncate text-right text-sm tabular-nums text-secondary'
          )}
        >
          {film.reciprocityFailure ?? '-'}
        </td>
      )}
      {showRecipes && (
        <td className={cn(cellClass, 'w-24 text-right text-sm tabular-nums')}>
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

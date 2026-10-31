import type { Film } from '@dorkroom/api';
import { type FC, memo } from 'react';
import { cn } from '../../lib/cn';
import { cssVars } from '../../lib/dom';
import { Tag } from '../ui/tag';
import { FilmImage } from './film-image';

interface FilmCardProps {
  film: Film;
  isSelected?: boolean;
  onClick: (film: Film) => void;
  className?: string;
}

const FilmCardComponent: FC<FilmCardProps> = ({
  film,
  isSelected,
  onClick,
  className,
}) => {
  const tagsContent = (
    <>
      <Tag>{film.colorType}</Tag>
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border"
        style={{
          backgroundColor: 'var(--color-surface-muted)',
          color: 'var(--color-text-secondary)',
          borderColor: 'var(--color-border-secondary)',
        }}
      >
        ISO {film.isoSpeed}
      </span>
      {film.baseFilmSlug && <Tag variant="info">Rebrand</Tag>}
      {film.discontinued && <Tag variant="discontinued">Discontinued</Tag>}
    </>
  );

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={() => onClick(film)}
      className={cn(
        'relative block w-full appearance-none text-left card-grain',
        'cursor-pointer rounded-2xl border p-4 shadow-subtle transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
        isSelected
          ? 'border-primary bg-surface-muted'
          : 'border-secondary bg-background hover:border-primary hover:bg-surface-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2',
        className
      )}
      style={cssVars({
        // Dark surface — keep the grain restrained.
        '--card-grain-opacity': '0.28',
        // Blend the grain against this surface's own base colour.
        '--card-grain-base': isSelected
          ? 'var(--color-surface-muted)'
          : 'var(--color-background)',
      })}
    >
      <div className="relative z-10">
        <div className="flex gap-3 items-start">
          <FilmImage
            src={film.staticImageUrl}
            alt={`${film.brand} ${film.name}`}
            size="md"
          />

          <div className="flex-1 min-w-0">
            <div
              className="text-base font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {film.brand} {film.name}
            </div>

            {/* Desktop: tags inline with name */}
            <div className="mt-1 hidden sm:flex flex-wrap items-center gap-2">
              {tagsContent}
            </div>
          </div>
        </div>

        {/* Mobile: tags in full-width row below for better wrapping */}
        <div className="mt-2 flex sm:hidden flex-wrap items-center gap-1.5">
          {tagsContent}
        </div>
      </div>
    </button>
  );
};

// Memoize component to prevent unnecessary re-renders
// Only re-render when film.uuid or isSelected changes
export const FilmCard = memo(
  FilmCardComponent,
  (prevProps, nextProps) =>
    prevProps.film.uuid === nextProps.film.uuid &&
    prevProps.isSelected === nextProps.isSelected
);

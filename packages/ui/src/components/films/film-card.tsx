import type { Film } from '@dorkroom/api';
import { type FC, memo } from 'react';
import { cn } from '../../lib/cn';
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
  return (
    // biome-ignore lint/a11y/useSemanticElements: Card uses ARIA role with keyboard support instead of button to avoid resetting button styles
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={() => onClick(film)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick(film);
        }
      }}
      className={cn(
        'cursor-pointer rounded-2xl border p-4 shadow-subtle transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        className
      )}
      style={{
        borderColor: isSelected
          ? 'var(--color-border-primary)'
          : 'var(--color-border-secondary)',
        backgroundColor: isSelected
          ? 'var(--color-surface-muted)'
          : 'var(--color-background)',
        // @ts-expect-error: CSS custom property for ring color
        '--tw-ring-color': 'var(--color-primary)',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = 'var(--color-border-primary)';
          e.currentTarget.style.backgroundColor = 'var(--color-surface-muted)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = 'var(--color-border-secondary)';
          e.currentTarget.style.backgroundColor = 'var(--color-background)';
        }
      }}
    >
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

          <div className="mt-1 flex flex-wrap items-center gap-2">
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
            {film.discontinued && (
              <Tag variant="discontinued">Discontinued</Tag>
            )}
          </div>
        </div>
      </div>
    </div>
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

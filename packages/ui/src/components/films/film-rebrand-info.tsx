import type { Film } from '@dorkroom/api';
import type { FC } from 'react';

interface FilmRebrandInfoProps {
  film: Film;
  /** Null when the film is not a rebrand or its base is not in the catalog. */
  baseFilm: Film | null;
  /** When given, the base film's name is a button that opens it. */
  onSelectFilm?: (film: Film) => void;
}

/**
 * Displays alias ("Formerly: ...") and rebrand ("Repackaged ...") info for a film.
 * Shared between film detail panel views to avoid duplication.
 */
// Kept only for the rare case that a film row references a baseFilmSlug
// whose Film isn't in the current slug index (e.g. filtered out). Alias
// display names come straight from the DB now.
const slugToTitle = (slug: string): string =>
  slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const FilmRebrandInfo: FC<FilmRebrandInfoProps> = ({
  film,
  baseFilm,
  onSelectFilm,
}) => {
  const baseSlug = film.baseFilmSlug;
  const hasRebrand = Boolean(baseFilm || baseSlug);

  return (
    <>
      {film.aliases.length > 0 && (
        <p
          className="text-sm italic"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Formerly: {film.aliases.map((alias) => alias.name).join(', ')}
        </p>
      )}

      {hasRebrand && (
        <p
          className="text-sm italic"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Repackaged{' '}
          {baseFilm && onSelectFilm ? (
            <button
              type="button"
              onClick={() => onSelectFilm(baseFilm)}
              className="min-h-11 italic underline transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
            >
              {baseFilm.brand} {baseFilm.name}
            </button>
          ) : baseFilm ? (
            `${baseFilm.brand} ${baseFilm.name}`
          ) : baseSlug ? (
            slugToTitle(baseSlug)
          ) : (
            ''
          )}
        </p>
      )}
    </>
  );
};

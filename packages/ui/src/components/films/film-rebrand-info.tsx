import type { Film } from '@dorkroom/api';
import type { FC } from 'react';

interface FilmRebrandInfoProps {
  film: Film;
  baseFilm?: Film | null;
}

/**
 * Displays alias ("Formerly: ...") and rebrand ("Repackaged ...") info for a film.
 * Shared between film detail panel views to avoid duplication.
 */
export const FilmRebrandInfo: FC<FilmRebrandInfoProps> = ({
  film,
  baseFilm,
}) => {
  return (
    <>
      {film.aliases.length > 0 && (
        <p
          className="text-sm italic"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Formerly:{' '}
          {film.aliases
            .map((alias) =>
              alias.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            )
            .join(', ')}
        </p>
      )}

      {(baseFilm || film.baseFilmSlug) && (
        <p
          className="text-sm italic"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Repackaged{' '}
          {baseFilm
            ? `${baseFilm.brand} ${baseFilm.name}`
            : film
                .baseFilmSlug!.replace(/-/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase())}
        </p>
      )}
    </>
  );
};

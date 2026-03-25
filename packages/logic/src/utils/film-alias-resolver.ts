import type { Film } from '@dorkroom/api';

/**
 * Build an index mapping all slugs (canonical + aliases) to their Film.
 * Enables O(1) lookups for alias resolution.
 */
export function buildFilmSlugIndex(films: Film[]): Map<string, Film> {
  const index = new Map<string, Film>();
  for (const film of films) {
    index.set(film.slug, film);
    for (const alias of film.aliases) {
      index.set(alias, film);
    }
  }
  return index;
}

/**
 * Resolve a slug (canonical or alias) to a Film.
 */
export function resolveFilmBySlug(
  slug: string,
  index: Map<string, Film>
): Film | undefined {
  return index.get(slug);
}

/**
 * Get the base/OEM film for a rebranded film.
 */
export function getBaseFilm(
  film: Film,
  index: Map<string, Film>
): Film | undefined {
  if (!film.baseFilmSlug) return undefined;
  return index.get(film.baseFilmSlug);
}

/**
 * Get all slugs for a film (canonical slug + aliases).
 */
export function getAllSlugsForFilm(film: Film): string[] {
  return [film.slug, ...film.aliases];
}

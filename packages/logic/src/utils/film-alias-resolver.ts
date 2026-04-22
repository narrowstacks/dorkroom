import type { Film } from '@dorkroom/api';
import { debugWarn } from './debug-logger';

/**
 * Build an index mapping all slugs (canonical + aliases) to their Film.
 * Enables O(1) lookups for alias resolution.
 */
export function buildFilmSlugIndex(films: Film[]): Map<string, Film> {
  const index = new Map<string, Film>();
  for (const film of films) {
    index.set(film.slug, film);
    for (const { slug: aliasSlug } of film.aliases) {
      const prior = index.get(aliasSlug);
      if (prior && prior.slug !== film.slug) {
        debugWarn(
          `[film-alias-resolver] Alias "${aliasSlug}" claimed by both "${prior.slug}" and "${film.slug}" — later film wins`
        );
      }
      index.set(aliasSlug, film);
    }
  }
  return index;
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
  return [film.slug, ...film.aliases.map((alias) => alias.slug)];
}

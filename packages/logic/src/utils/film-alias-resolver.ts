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
    for (const alias of film.aliases) {
      if (index.has(alias) && index.get(alias)!.slug !== film.slug) {
        debugWarn(
          `[film-alias-resolver] Alias "${alias}" claimed by both "${index.get(alias)!.slug}" and "${film.slug}" — later film wins`
        );
      }
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

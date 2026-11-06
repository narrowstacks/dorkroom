import type { Film } from '@dorkroom/api';

/**
 * The name a page title shows for a film. A seam, unchanged for now: once the API
 * has an `also_known_as` column ("also known as / formerly known as"), long names
 * can be shortened here while the old ones stay searchable.
 */
export function getFilmDisplayName(film: Pick<Film, 'name'>): string {
  return film.name;
}

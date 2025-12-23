import type { Film } from '@dorkroom/api';
import type { FuseResult, FuseResultMatch, IFuseOptions } from 'fuse.js';
import Fuse from 'fuse.js';

/**
 * Configuration options for film search
 */
const FILM_SEARCH_OPTIONS: IFuseOptions<Film> = {
  // Search keys with weights (higher = more important)
  keys: [
    {
      name: 'name',
      weight: 2.0, // High priority - film name
    },
    {
      name: 'brand',
      weight: 2.0, // High priority - manufacturer
    },
    {
      name: 'colorType',
      weight: 1.0, // Medium priority - color/BW classification
    },
    {
      name: 'description',
      weight: 0.5, // Low priority - descriptive text
    },
  ],
  // Fuzzy matching threshold (0.0 = exact, 1.0 = match anything)
  // 0.4 provides good balance between precision and flexibility
  threshold: 0.4,
  // Include match info for highlighting
  includeMatches: true,
  // Include similarity score
  includeScore: true,
  // Sort results by best match
  shouldSort: true,
  // Minimum characters to match
  minMatchCharLength: 2,
  // Use extended search operators (=, ^, !, etc.)
  useExtendedSearch: false,
  // Ignore diacritics for better matching
  ignoreLocation: true,
};

/**
 * Fuse.js search result with Film item
 */
export type FilmSearchResult = FuseResult<Film>;

/**
 * Match information for highlighting
 */
export interface MatchHighlight {
  key: string;
  value: string;
  indices: readonly [number, number][];
}

/**
 * Creates a Fuse instance configured for searching Film objects
 *
 * @param films - Array of Film objects to search
 * @returns Configured Fuse instance
 *
 * @example
 * ```typescript
 * const films: Film[] = await fetchFilms();
 * const searcher = createFilmSearcher(films);
 * const results = searcher.search('kodak tri-x');
 * // results: [{ item: Film, score: 0.12, matches: [...] }, ...]
 * ```
 */
export function createFilmSearcher(films: Film[]): Fuse<Film> {
  return new Fuse(films, FILM_SEARCH_OPTIONS);
}

/**
 * Extract match highlights from a search result for UI rendering
 *
 * @param result - Fuse search result
 * @returns Array of match highlights with indices
 *
 * @example
 * ```typescript
 * const results = searcher.search('kodak');
 * results.forEach(result => {
 *   const highlights = getMatchHighlights(result);
 *   // highlights: [{ key: 'brand', value: 'Kodak', indices: [[0, 4]] }]
 * });
 * ```
 */
export function getMatchHighlights(result: FilmSearchResult): MatchHighlight[] {
  if (!result.matches) {
    return [];
  }

  return result.matches.map((match: FuseResultMatch) => ({
    key: match.key ?? '',
    value: match.value ?? '',
    indices: match.indices ?? [],
  }));
}

/**
 * Search films with a query string
 *
 * Convenience wrapper that creates a searcher and executes the search.
 * For repeated searches on the same dataset, create a searcher once
 * with `createFilmSearcher` and reuse it.
 *
 * @param films - Array of Film objects
 * @param query - Search query string
 * @returns Array of search results
 *
 * @example
 * ```typescript
 * const films: Film[] = await fetchFilms();
 * const results = searchFilms(films, 'ilford hp5');
 * ```
 */
export function searchFilms(films: Film[], query: string): FilmSearchResult[] {
  if (!query.trim()) {
    return [];
  }

  const searcher = createFilmSearcher(films);
  return searcher.search(query);
}

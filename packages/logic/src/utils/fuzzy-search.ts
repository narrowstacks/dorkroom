import type { Film } from '@dorkroom/api';
import type { FuseResult, FuseResultMatch, IFuseOptions } from 'fuse.js';
import Fuse from 'fuse.js';

/**
 * Strip hyphens, slashes, and other punctuation so "tmax" matches "T-MAX",
 * "Gc/Ultramax" matches "gcultramax", etc.
 */
function normalize(value: string): string {
  return value.replace(/[-/_.]/g, '').toLowerCase();
}

/** Snapshot of the default getFn to avoid depending on mutable global config */
const defaultGetFn = Fuse.config.getFn;

/**
 * Configuration options for film search
 */
const FILM_SEARCH_OPTIONS: IFuseOptions<Film> = {
  // Normalize indexed values so punctuation doesn't block matches
  getFn: (obj, path) => {
    const value = defaultGetFn(obj, path);
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === 'string' ? normalize(v) : v));
    }
    return typeof value === 'string' ? normalize(value) : value;
  },
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
      name: 'aliases',
      weight: 1.5, // Former names should be findable
    },
  ],
  // Fuzzy matching threshold (0.0 = exact, 1.0 = match anything)
  // 0.2 keeps results relevant — avoids matching "Retro"/"Pro" for "Portra"
  threshold: 0.2,
  // Include match info for highlighting
  includeMatches: true,
  // Include similarity score
  includeScore: true,
  // Sort results by best match
  shouldSort: true,
  // Minimum characters to match
  minMatchCharLength: 2,
  // Extended search allows logical AND/OR operators for multi-word queries
  useExtendedSearch: true,
  // Allow matches anywhere in the string (not just near the start)
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
export function searchFilms(
  films: Film[],
  query: string,
  existingSearcher?: Fuse<Film>
): FilmSearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const searcher = existingSearcher ?? createFilmSearcher(films);
  const normalized = normalize(trimmed);
  const tokens = trimmed.split(/\s+/).map(normalize);

  // Single word: search directly
  if (tokens.length === 1) {
    return searcher.search(normalized);
  }

  // Multi-word: search both the joined form ("tri x" -> "trix") and
  // the tokenized AND form ("kodak portra" -> kodak AND portra),
  // then merge results by best score
  const joinedResults = searcher.search(tokens.join(''));

  const keyNames = FILM_SEARCH_OPTIONS.keys!.map((key) =>
    typeof key === 'string'
      ? key
      : Array.isArray(key)
        ? key.join('.')
        : (key as { name: string }).name
  );

  const expression = {
    $and: tokens.map((token) => ({
      $or: keyNames.map((name) => ({ [name]: token })),
    })),
  };
  const tokenResults = searcher.search(expression);

  // Merge and deduplicate, keeping the best score for each film
  const seen = new Map<string, FilmSearchResult>();
  for (const result of [...joinedResults, ...tokenResults]) {
    const id = result.item.uuid;
    const existing = seen.get(id);
    if (!existing || (result.score ?? 1) < (existing.score ?? 1)) {
      seen.set(id, result);
    }
  }

  return [...seen.values()].sort((a, b) => (a.score ?? 1) - (b.score ?? 1));
}

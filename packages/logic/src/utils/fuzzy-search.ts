import type { Film } from '@dorkroom/api';
import type { Expression, FuseResult, IFuseOptions } from 'fuse.js';
import Fuse from 'fuse.js';
import { z } from 'zod';

/**
 * Strip hyphens, slashes, and other punctuation so "tmax" matches "T-MAX",
 * "Gc/Ultramax" matches "gcultramax", etc. Also strips Fuse.js extended-search
 * operators (`!`, `^`, `$`, `=`, `'`, `|`) so raw user input is matched
 * literally rather than being interpreted as a query operator.
 */
export function normalizeSearchText(value: string): string {
  return value.replace(/[-/_.!^$='|]/g, '').toLowerCase();
}

/**
 * Punctuation- and word-break-insensitive substring match for filtering
 * lists as the user types. Matches when the haystack contains either the
 * query with all punctuation/spaces collapsed ("tri x" -> "trix") or every
 * whitespace-separated token individually ("kodak trix" -> kodak AND trix).
 * Not a ranking search — for weighted fuzzy results use searchFilms().
 */
export function matchesSearchQuery(haystack: string, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const h = normalizeSearchText(haystack.replace(/\s+/g, ''));
  const tokens = q.split(/\s+/).map(normalizeSearchText).filter(Boolean);
  if (tokens.length === 0) return true;
  return (
    h.includes(tokens.join('')) || tokens.every((token) => h.includes(token))
  );
}

/** Snapshot of the default getFn to avoid depending on mutable global config */
const defaultGetFn = Fuse.config.getFn;

/** Fuse's default getFn is untyped and yields undefined for absent paths. */
const indexedText = z.string();

/** Keys describing a film as it is sold today (higher weight = more important) */
const CURRENT_SEARCH_KEYS = [
  { name: 'name', weight: 2.0 }, // High priority - film name
  { name: 'brand', weight: 2.0 }, // High priority - manufacturer
  { name: 'colorType', weight: 1.0 }, // Medium priority - color/BW classification
];

/**
 * Former names. Searched only as a fallback (see searchFilms): alias names
 * usually repeat the brand and current name, so scoring them alongside the
 * current keys would boost every aliased film on its own name.
 */
const ALIAS_SEARCH_KEY = { name: 'aliases.name', weight: 1.0 };

const FILM_SEARCH_KEYS = [...CURRENT_SEARCH_KEYS, ALIAS_SEARCH_KEY];

/**
 * Configuration options for film search
 */
const FILM_SEARCH_OPTIONS: IFuseOptions<Film> = {
  // Normalize indexed values so punctuation doesn't block matches
  getFn: (obj, path) => {
    const value = defaultGetFn(obj, path);
    if (Array.isArray(value)) {
      return value.map((item) => {
        const itemText = indexedText.safeParse(item);
        return itemText.success ? normalizeSearchText(itemText.data) : item;
      });
    }
    const text = indexedText.safeParse(value);
    return text.success ? normalizeSearchText(text.data) : value;
  },
  keys: FILM_SEARCH_KEYS,
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

/** Fuse logical expression: the term must match at least one of `keys`. */
function anyKey(keys: string[], term: string): Expression {
  return { $or: keys.map((key) => ({ [key]: term })) };
}

/**
 * Search films with a query string
 *
 * Films matching on their current name, brand, or color type come first,
 * ranked by score. Films found only through a former name (alias) follow,
 * so an alias makes a film findable without lifting it above films whose
 * current name is the better match.
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
  const tokens = trimmed.split(/\s+/).map(normalizeSearchText);
  if (tokens.every((token) => !token)) {
    // Nothing searchable left (e.g. "!!!"): return every film, in input
    // order, as an empty Fuse query does, rather than "no results".
    return searcher.search('');
  }
  const currentKeys = CURRENT_SEARCH_KEYS.map((key) => key.name);
  const allKeys = FILM_SEARCH_KEYS.map((key) => key.name);

  const currentResults = searchKeys(searcher, tokens, currentKeys);
  const currentIds = new Set(currentResults.map((r) => r.item.uuid));
  const aliasOnlyResults = searchKeys(searcher, tokens, allKeys).filter(
    (r) => !currentIds.has(r.item.uuid)
  );

  return [...currentResults, ...aliasOnlyResults];
}

/**
 * Run one ranked search restricted to `keys`.
 *
 * A single word is matched directly. Multi-word queries search both the
 * joined form ("tri x" -> "trix") and the tokenized AND form
 * ("kodak portra" -> kodak AND portra), then merge results by best score.
 */
function searchKeys(
  searcher: Fuse<Film>,
  tokens: string[],
  keys: string[]
): FilmSearchResult[] {
  const joinedResults = searcher.search(anyKey(keys, tokens.join('')));
  if (tokens.length === 1) {
    return joinedResults;
  }

  const tokenResults = searcher.search({
    $and: tokens.map((token) => anyKey(keys, token)),
  });

  // Merge and deduplicate, keeping the best score for each film
  const seen = new Map<string, FilmSearchResult>();
  for (const result of [...joinedResults, ...tokenResults]) {
    const id = result.item.uuid;
    const existing = seen.get(id);
    if (!existing || (result.score ?? 1) < (existing.score ?? 1)) {
      seen.set(id, result);
    }
  }

  return [...seen.values()].toSorted((a, b) => (a.score ?? 1) - (b.score ?? 1));
}

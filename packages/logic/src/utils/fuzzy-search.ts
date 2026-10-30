import type { Film } from '@dorkroom/api';
import type { FuseResult, IFuseOptions } from 'fuse.js';
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compact(value: string): string {
  return normalizeSearchText(value).replace(/\s+/g, '');
}

function isContainedIn(haystack: string, needle: string): boolean {
  return haystack.indexOf(needle) !== -1;
}

/**
 * Alias names that add searchable information beyond the film's current
 * "{brand} {name}". Real alias data holds full display names ("Kodak Tri-X
 * 400") and slug-form names ("kodak-tri-x-400"), which would otherwise boost
 * a film on tokens its current name already matches. A leading brand prefix
 * is stripped, and aliases whose remaining text is contained in the current
 * brand + name are dropped. Returned names keep their original punctuation
 * (minus any brand prefix and words the current name already has).
 */
export function getInformativeAliasNames(
  film: Pick<Film, 'brand' | 'name' | 'aliases'>
): string[] {
  const aliases = Array.isArray(film.aliases) ? film.aliases : [];
  if (aliases.length === 0) return [];
  const current = compact(`${film.brand} ${film.name}`);
  const currentWords = new Set(
    `${film.brand} ${film.name}`.split(/\s+/).map(compact)
  );
  const brand = film.brand.trim();
  const brandPrefix = brand
    ? new RegExp(`^${escapeRegExp(brand)}[\\s\\-_]+`, 'i')
    : null;
  const result: string[] = [];
  for (const alias of aliases) {
    const stripped = (
      brandPrefix ? alias.name.trim().replace(brandPrefix, '') : alias.name
    ).trim();
    if (!stripped || isContainedIn(current, compact(stripped))) continue;
    // Drop individual words the current name already carries ("Gold Ultra
    // 400" on "UltraMax 400" keeps "Gold Ultra"), so shared tokens such as
    // an ISO never boost the film.
    const novel = stripped
      .split(/\s+/)
      .filter((word) => {
        const text = compact(word);
        return text && !currentWords.has(text);
      })
      .join(' ');
    if (novel) result.push(novel);
  }
  return result;
}

/** Snapshot of the default getFn to avoid depending on mutable global config */
const defaultGetFn = Fuse.config.getFn;

/** Fuse's default getFn is untyped and yields undefined for absent paths. */
const indexedText = z.string();

/** Search keys with weights (higher = more important) */
const FILM_SEARCH_KEYS = [
  { name: 'name', weight: 2.0 }, // High priority - film name
  { name: 'brand', weight: 2.0 }, // High priority - manufacturer
  { name: 'colorType', weight: 1.0 }, // Medium priority - color/BW classification
];

/** Former names live in their own index so they can find a film but never boost one. */
const ALIAS_SEARCH_KEYS = [{ name: 'aliases.name', weight: 1.0 }];

/**
 * Configuration options for film search
 */
const BASE_SEARCH_OPTIONS: IFuseOptions<Film> = {
  // Normalize indexed values so punctuation doesn't block matches
  getFn: (obj, path) => {
    if ((Array.isArray(path) ? path.join('.') : path) === 'aliases.name') {
      return getInformativeAliasNames(obj).map(normalizeSearchText);
    }
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
  const searcher = new Fuse(films, {
    ...BASE_SEARCH_OPTIONS,
    keys: FILM_SEARCH_KEYS,
  });
  aliasSearchers.set(
    searcher,
    new Fuse(films, { ...BASE_SEARCH_OPTIONS, keys: ALIAS_SEARCH_KEYS })
  );
  return searcher;
}

/** Alias index paired with each searcher from `createFilmSearcher`. */
const aliasSearchers = new WeakMap<Fuse<Film>, Fuse<Film>>();

function runSearch(
  searcher: Fuse<Film>,
  keyNames: string[],
  trimmed: string
): FilmSearchResult[] {
  const normalized = normalizeSearchText(trimmed);
  const tokens = trimmed.split(/\s+/).map(normalizeSearchText);

  // Single word: search directly
  if (tokens.length === 1) {
    return searcher.search(normalized);
  }

  // Multi-word: search both the joined form ("tri x" -> "trix") and
  // the tokenized AND form ("kodak portra" -> kodak AND portra),
  // then merge results by best score
  const joinedResults = searcher.search(tokens.join(''));

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

  return [...seen.values()].toSorted((a, b) => (a.score ?? 1) - (b.score ?? 1));
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
  const direct = runSearch(
    searcher,
    FILM_SEARCH_KEYS.map((key) => key.name),
    trimmed
  );

  // Films matched only by a former name follow every direct match, so an
  // alias can find a film but never outrank or re-score one.
  const aliasSearcher = aliasSearchers.get(searcher);
  if (!aliasSearcher) return direct;
  const found = new Set(direct.map((result) => result.item.uuid));
  const aliasOnly = runSearch(
    aliasSearcher,
    ALIAS_SEARCH_KEYS.map((key) => key.name),
    trimmed
  ).filter((result) => !found.has(result.item.uuid));
  return [...direct, ...aliasOnly];
}

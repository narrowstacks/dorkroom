import Fuse, { type IFuseOptions } from 'fuse.js';
import type { Film, Developer } from '@/api/dorkroom/types';

/**
 * Configuration for fuzzy searching films
 */
export const filmFuseOptions: IFuseOptions<Film> = {
  // Fields to search with weights (higher = more important)
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'brand', weight: 0.5 },
    { name: 'description', weight: 0.3 },
  ],
  // Lower threshold = more fuzzy, higher = more exact
  threshold: 0.5,
  // Include relevance scores in results
  includeScore: true,
  // Minimum characters that must match
  minMatchCharLength: 1,
  // Don't find matches in every word
  findAllMatches: false,
  // Use extended search for better matching
  useExtendedSearch: false,
  // Ignore location when matching
  ignoreLocation: true,
  // Field name length affects score
  ignoreFieldNorm: false,
};

/**
 * Configuration for fuzzy searching developers
 */
export const developerFuseOptions: IFuseOptions<Developer> = {
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'manufacturer', weight: 0.5 },
    { name: 'notes', weight: 0.3 },
  ],
  threshold: 0.5,
  includeScore: true,
  minMatchCharLength: 1,
  findAllMatches: false,
  useExtendedSearch: false,
  ignoreLocation: true,
  ignoreFieldNorm: false,
};

/**
 * Performs fuzzy search on an array of films
 * @param films - Array of films to search through
 * @param query - Search query string
 * @returns Array of films sorted by relevance score
 */
export function fuzzySearchFilms(films: Film[], query: string): Film[] {
  if (!query.trim()) {
    return films;
  }

  const fuse = new Fuse(films, filmFuseOptions);
  const results = fuse.search(query);

  // Extract the film objects from the Fuse result format
  return results.map((result) => result.item);
}

/**
 * Finds developers that match the given query using fuzzy matching and orders results by relevance.
 *
 * If `query` is empty or contains only whitespace, the original `developers` array is returned.
 *
 * @param query - The search query string used for fuzzy matching
 * @returns An array of matching `Developer` objects ordered by relevance (most relevant first)
 */
export function fuzzySearchDevelopers(
  developers: Developer[],
  query: string
): Developer[] {
  if (!query.trim()) {
    return developers;
  }

  const fuse = new Fuse(developers, developerFuseOptions);
  const results = fuse.search(query);

  // Extract the developer objects from the Fuse result format
  return results.map((result) => result.item);
}

/**
 * Creates a Fuse instance for films that can be reused
 * @param films - Array of films to index
 * @returns Fuse instance configured for film search
 */
export function createFilmSearchIndex(films: Film[]): Fuse<Film> {
  return new Fuse(films, filmFuseOptions);
}

/**
 * Create a reusable Fuse search index for Developer objects.
 *
 * @param developers - Developer objects to index for fuzzy searching
 * @returns A Fuse instance configured for searching `Developer` objects
 */
export function createDeveloperSearchIndex(
  developers: Developer[]
): Fuse<Developer> {
  return new Fuse(developers, developerFuseOptions);
}

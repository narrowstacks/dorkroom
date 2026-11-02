import { speculativeImport } from './lazy-page';

/**
 * Loads `catalogue-prefetch` (the API client and the pages' query options)
 * for the /development and /films loaders, kept out of the entry chunk. One
 * shared instance, so a hover on either route and the navigation that follows
 * join one import, and a hover's failed import cannot reload the page: see
 * `speculativeImport`.
 */
export const loadCataloguePrefetch = speculativeImport(
  () => import('./catalogue-prefetch')
);

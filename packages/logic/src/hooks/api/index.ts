/**
 * API Hooks
 *
 * TanStack Query hooks for fetching API data
 */

export {
  type CatalogueQueryOptions,
  combinationsQueryOptions,
  developersQueryOptions,
  filmsQueryOptions,
} from '../../queries/api-query-options';
export { useCombinations } from './use-combinations';
export { useDevelopers } from './use-developers';
export { useFilms } from './use-films';
export { useStats } from './use-stats';

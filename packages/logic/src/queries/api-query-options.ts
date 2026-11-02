import {
  type Combination,
  type Developer,
  fetchCombinations,
  fetchDevelopers,
  fetchFilms,
  type Film,
} from '@dorkroom/api';
import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

/**
 * How a catalogue list's fetch treats the query's `AbortSignal`.
 */
export interface CatalogueQueryOptions {
  /**
   * `true` (the default) hands the fetch the query's signal, so TanStack
   * Query aborts it when the last component watching the list unmounts
   * mid-request. Pass `false` for a prefetch that nothing watches yet, such
   * as a route loader's: there an unrelated component unmounting (the home
   * page's search box, on the way to /development) would otherwise abort the
   * prefetch and leave the page to fetch the list again.
   */
  cancellable?: boolean;
}

/**
 * Query options for the catalogue lists, shared by the `use*` hooks and by
 * anything that fetches the same data outside a component (the web app's
 * route loaders prefetch them so a page's data starts with its chunk). One
 * definition per list keeps the key and fetcher identical everywhere, so a
 * prefetch and the page's own query land on the same cache entry.
 */
export const filmsQueryOptions = ({
  cancellable = true,
}: CatalogueQueryOptions = {}) =>
  queryOptions<Film[]>({
    queryKey: queryKeys.films.list(),
    queryFn: cancellable ? fetchFilms : () => fetchFilms(),
  });

export const developersQueryOptions = ({
  cancellable = true,
}: CatalogueQueryOptions = {}) =>
  queryOptions<Developer[]>({
    queryKey: queryKeys.developers.list(),
    queryFn: cancellable ? fetchDevelopers : () => fetchDevelopers(),
  });

export const combinationsQueryOptions = ({
  cancellable = true,
}: CatalogueQueryOptions = {}) =>
  queryOptions<Combination[]>({
    queryKey: queryKeys.combinations.list(),
    queryFn: cancellable ? fetchCombinations : () => fetchCombinations(),
  });

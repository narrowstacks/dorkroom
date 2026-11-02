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
 * Query options for the catalogue lists, shared by the `use*` hooks and by
 * anything that fetches the same data outside a component (the web app's
 * route loaders prefetch them so a page's data starts with its chunk). One
 * definition per list keeps the key and fetcher identical everywhere, so a
 * prefetch and the page's own query land on the same cache entry.
 */
export const filmsQueryOptions = () =>
  queryOptions<Film[]>({
    queryKey: queryKeys.films.list(),
    queryFn: fetchFilms,
  });

export const developersQueryOptions = () =>
  queryOptions<Developer[]>({
    queryKey: queryKeys.developers.list(),
    queryFn: fetchDevelopers,
  });

export const combinationsQueryOptions = () =>
  queryOptions<Combination[]>({
    queryKey: queryKeys.combinations.list(),
    queryFn: fetchCombinations,
  });

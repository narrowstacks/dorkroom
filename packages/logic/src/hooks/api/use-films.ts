import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { Film } from '@dorkroom/api';
import { fetchFilms } from '../../queries/fetch-functions';
import { queryKeys } from '../../queries/query-keys';

/**
 * Hook to fetch and cache all films
 * Auto-refetches when:
 * - staleTime expires (5 minutes by default)
 * - window regains focus
 * - component mounts after being unmounted
 */
export function useFilms(): UseQueryResult<Film[]> {
  return useQuery<Film[]>({
    queryKey: queryKeys.films.list(),
    queryFn: fetchFilms,
  });
}

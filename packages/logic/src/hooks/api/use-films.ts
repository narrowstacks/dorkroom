import type { Film } from '@dorkroom/api';
import { fetchFilms } from '@dorkroom/api';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../queries/query-keys';
import type { QueryHookOptions } from './query-hook-options';

/**
 * Hook to fetch and cache all films
 * Auto-refetches when:
 * - staleTime expires (5 minutes by default)
 * - window regains focus
 * - component mounts after being unmounted
 */
export function useFilms({
  enabled = true,
}: QueryHookOptions = {}): UseQueryResult<Film[]> {
  return useQuery({
    queryKey: queryKeys.films.list(),
    queryFn: fetchFilms,
    enabled,
  });
}

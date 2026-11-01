import { type Developer, fetchDevelopers } from '@dorkroom/api';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../queries/query-keys';
import type { QueryHookOptions } from './query-hook-options';

/**
 * Hook to fetch and cache all developers
 * Auto-refetches when:
 * - staleTime expires (5 minutes by default)
 * - window regains focus
 * - component mounts after being unmounted
 */
export function useDevelopers({ enabled = true }: QueryHookOptions = {}) {
  return useQuery<Developer[]>({
    queryKey: queryKeys.developers.list(),
    queryFn: fetchDevelopers,
    enabled,
  });
}

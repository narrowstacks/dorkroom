import { useQuery } from '@tanstack/react-query';
import { Developer } from '@dorkroom/api';
import { fetchDevelopersForQuery } from '@dorkroom/api';
import { queryKeys } from '../../queries/query-keys';

/**
 * Hook to fetch and cache all developers
 * Auto-refetches when:
 * - staleTime expires (5 minutes by default)
 * - window regains focus
 * - component mounts after being unmounted
 */
export function useDevelopers() {
  return useQuery<Developer[]>({
    queryKey: queryKeys.developers.list(),
    queryFn: fetchDevelopersForQuery,
  });
}

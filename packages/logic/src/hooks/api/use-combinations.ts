import { useQuery } from '@tanstack/react-query';
import { Combination } from '@dorkroom/api';
import { fetchCombinations } from '../../queries/fetch-functions';
import { queryKeys } from '../../queries/query-keys';

/**
 * Hook to fetch and cache all combinations
 * Auto-refetches when:
 * - staleTime expires (5 minutes by default)
 * - window regains focus
 * - component mounts after being unmounted
 */
export function useCombinations() {
  return useQuery<Combination[]>({
    queryKey: queryKeys.combinations.list(),
    queryFn: fetchCombinations,
  });
}

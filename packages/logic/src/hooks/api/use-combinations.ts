import { type Combination, fetchCombinations } from '@dorkroom/api';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../queries/query-keys';
import type { QueryHookOptions } from './query-hook-options';

/**
 * Hook to fetch and cache all film/developer combinations from the API.
 */
export function useCombinations({ enabled = true }: QueryHookOptions = {}) {
  return useQuery<Combination[]>({
    queryKey: queryKeys.combinations.list(),
    queryFn: fetchCombinations,
    enabled,
  });
}

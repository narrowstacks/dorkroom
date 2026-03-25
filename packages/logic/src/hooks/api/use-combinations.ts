import { type Combination, fetchCombinationsForQuery } from '@dorkroom/api';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../queries/query-keys';

/**
 * Hook to fetch and cache all film/developer combinations from the API.
 */
export function useCombinations() {
  return useQuery<Combination[]>({
    queryKey: queryKeys.combinations.list(),
    queryFn: fetchCombinationsForQuery,
  });
}

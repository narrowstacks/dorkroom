import type { Combination } from '@dorkroom/api';
import { useQuery } from '@tanstack/react-query';
import { combinationsQueryOptions } from '../../queries/api-query-options';
import type { QueryHookOptions } from './query-hook-options';

/**
 * Hook to fetch and cache all film/developer combinations from the API.
 */
export function useCombinations({ enabled = true }: QueryHookOptions = {}) {
  return useQuery<Combination[]>({
    ...combinationsQueryOptions(),
    enabled,
  });
}

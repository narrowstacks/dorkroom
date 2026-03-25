import {
  type Combination,
  fetchCombinationsForQuery,
  fetchCombinationsPage,
} from '@dorkroom/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '../../queries/query-keys';

const SEED_PAGE_SIZE = 24;

/**
 * Hook to fetch combinations with two-phase loading:
 * 1. Seed: fetch the first page (24 items) for instant display
 * 2. Hydrate: fetch all combinations in the background for full filtering
 *
 * The seed query populates the cache immediately so the UI renders fast.
 * Once the full dataset arrives, it replaces the seed data transparently.
 */
export function useCombinations() {
  const queryClient = useQueryClient();

  // Phase 1: Seed with first page for instant display
  const seedQuery = useQuery<Combination[]>({
    queryKey: queryKeys.combinations.seed(),
    queryFn: ({ signal }) =>
      fetchCombinationsPage({ signal, page: 1, count: SEED_PAGE_SIZE }),
  });

  // Phase 2: Full dataset for complete client-side filtering
  const fullQuery = useQuery<Combination[]>({
    queryKey: queryKeys.combinations.list(),
    queryFn: fetchCombinationsForQuery,
    // Don't block on this — let seed data render first
    enabled: seedQuery.isSuccess,
  });

  // When seed data arrives and full data isn't cached yet, prime the full query cache
  // so consumers see seed data immediately instead of undefined
  useEffect(() => {
    if (seedQuery.data && !fullQuery.data) {
      queryClient.setQueryData(queryKeys.combinations.list(), seedQuery.data);
    }
  }, [seedQuery.data, fullQuery.data, queryClient]);

  // Return full data when available, fall back to seed data
  return {
    data: fullQuery.data ?? seedQuery.data,
    isPending: seedQuery.isPending,
    isSuccess: seedQuery.isSuccess || fullQuery.isSuccess,
    isFullyLoaded: fullQuery.isSuccess,
    error: seedQuery.error || fullQuery.error,
    refetch: fullQuery.refetch,
  };
}

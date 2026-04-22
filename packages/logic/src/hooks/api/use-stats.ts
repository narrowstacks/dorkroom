import { fetchStatsForQuery, type Stats } from '@dorkroom/api';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../queries/query-keys';

/**
 * Hook to fetch aggregate stats (film, developer, combination counts).
 * Uses a lightweight endpoint that returns only counts, not full data.
 */
export function useStats() {
  return useQuery<Stats>({
    queryKey: queryKeys.stats.counts(),
    queryFn: fetchStatsForQuery,
    staleTime: 5 * 60 * 1000,
  });
}

import { type Combination, fetchCombinationsForQuery } from '@dorkroom/api';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../queries/query-keys';

/**
 * Hook to fetch and cache all film/developer combinations from the API
 *
 * Auto-refetches when:
 * - staleTime expires (5 minutes by default)
 * - window regains focus
 * - component mounts after being unmounted
 *
 * @returns TanStack Query result with combinations data, loading state, and error handling
 *
 * Error Handling:
 * - Network errors are caught and exposed through the `error` state
 * - Failed requests can be retried using the `refetch` function
 * - Uses TanStack Query's built-in retry logic (3 retries with exponential backoff)
 *
 * @example
 * ```typescript
 * const { data: combinations, isPending, error, refetch } = useCombinations();
 *
 * if (error) {
 *   return <ErrorMessage onRetry={refetch}>Failed to load combinations</ErrorMessage>;
 * }
 *
 * if (isPending) {
 *   return <LoadingSpinner />;
 * }
 *
 * return <CombinationsList combinations={combinations} />;
 * ```
 */
export function useCombinations() {
  return useQuery<Combination[]>({
    queryKey: queryKeys.combinations.list(),
    queryFn: fetchCombinationsForQuery,
  });
}

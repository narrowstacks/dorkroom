import { QueryCache, QueryClient } from '@tanstack/react-query';
import { describeQueryFailure } from '@/lib/query-failure';
import { QUERY_CACHE_MAX_AGE } from './query-persister';

/**
 * QueryClient tuned for mobile: no window-focus refetch, mobile-friendly retry.
 * `gcTime` matches the persister's max age so cached queries aren't garbage-
 * collected before they can be rehydrated from disk on the next launch.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // Runs once per query after its retries are exhausted.
    onError: (error, query) => {
      console.warn(describeQueryFailure(query.queryKey, error));
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: QUERY_CACHE_MAX_AGE,
    },
  },
});

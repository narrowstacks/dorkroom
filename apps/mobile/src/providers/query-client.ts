import { QueryClient } from '@tanstack/react-query';

/** QueryClient tuned for mobile: no window-focus refetch, mobile-friendly retry. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

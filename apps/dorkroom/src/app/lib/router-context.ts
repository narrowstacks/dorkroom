import type { QueryClient } from '@tanstack/react-query';

/**
 * What every route's `beforeLoad` and `loader` receive as `context`. main.tsx
 * passes the app's QueryClient, so a loader can prefetch a page's queries
 * into the same cache the page reads. Its own module, exported, because the
 * route tree's declarations name it.
 */
export interface RouterContext {
  queryClient: QueryClient;
}

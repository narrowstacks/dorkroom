import {
  combinationsQueryOptions,
  developersQueryOptions,
  filmsQueryOptions,
} from '@dorkroom/logic';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  prefetchDevelopmentPageData,
  prefetchFilmsPageData,
} from '../catalogue-prefetch';

/** The path and signal of each request. */
let requests: { url: string; signal: AbortSignal | null | undefined }[] = [];

beforeEach(() => {
  requests = [];
  // An empty list, a tick later, so a test can act while it is in flight.
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    requests.push({ url, signal: init?.signal });
    return new Promise<Response>((resolve) =>
      setTimeout(() => resolve(Response.json({ data: [] })), 0)
    );
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The home search box's disabled films watcher, unmounting. */
function watchAndLeave(queryClient: QueryClient) {
  const watcher = new QueryObserver(queryClient, {
    ...filmsQueryOptions(),
    enabled: false,
  });
  watcher.subscribe(() => undefined)();
}

describe('catalogue prefetch', () => {
  it('fetches the three /development lists into the pages’ cache entries', async () => {
    const queryClient = new QueryClient();
    prefetchDevelopmentPageData(queryClient);
    await vi.waitFor(() =>
      expect(
        queryClient.getQueryData(combinationsQueryOptions().queryKey)
      ).toEqual([])
    );

    expect(requests.map(({ url }) => url.replace(/^.*\/api/, ''))).toEqual([
      '/films',
      '/developers',
      '/combinations',
    ]);
    expect(queryClient.getQueryData(filmsQueryOptions().queryKey)).toEqual([]);
    expect(queryClient.getQueryData(developersQueryOptions().queryKey)).toEqual(
      []
    );
  });

  /**
   * #354: the /films or /development loader runs while the home page is still
   * mounted, and leaving home unmounts its search box's (disabled) watchers.
   * The last watcher leaving aborts a fetch that took the query's signal, and
   * the page then fetched the list a second time.
   */
  it('survives the last watcher leaving mid-request', async () => {
    const queryClient = new QueryClient();
    prefetchFilmsPageData(queryClient);
    watchAndLeave(queryClient);
    await vi.waitFor(() =>
      expect(queryClient.getQueryData(filmsQueryOptions().queryKey)).toEqual([])
    );

    expect(requests).toHaveLength(1);
    expect(requests[0]?.signal).toBeUndefined();
  });

  it('is needed: the page’s own options would be aborted', async () => {
    const queryClient = new QueryClient();
    const prefetch = queryClient.prefetchQuery(filmsQueryOptions());
    watchAndLeave(queryClient);
    await prefetch;

    expect(requests[0]?.signal?.aborted).toBe(true);
    expect(
      queryClient.getQueryData(filmsQueryOptions().queryKey)
    ).toBeUndefined();
  });
});

import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  combinationsQueryOptions,
  developersQueryOptions,
  filmsQueryOptions,
} from '../../queries/api-query-options';
import { queryKeys } from '../../queries/query-keys';

/** The signal each request was sent with. */
let signals: (AbortSignal | null | undefined)[] = [];

beforeEach(() => {
  signals = [];
  // An empty list, a tick later, so a test can act while it is in flight.
  vi.stubGlobal('fetch', (_url: string, init?: RequestInit) => {
    signals.push(init?.signal);
    return new Promise<Response>((resolve) =>
      setTimeout(() => resolve(Response.json({ data: [] })), 0)
    );
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Watches the films list, disabled, and stops at once (a search box unmounting). */
function watchAndLeave(queryClient: QueryClient) {
  const watcher = new QueryObserver(queryClient, {
    ...filmsQueryOptions(),
    enabled: false,
  });
  watcher.subscribe(() => undefined)();
}

describe('catalogue query options', () => {
  it('use the hooks’ query keys', () => {
    expect(filmsQueryOptions().queryKey).toEqual(queryKeys.films.list());
    expect(developersQueryOptions().queryKey).toEqual(
      queryKeys.developers.list()
    );
    expect(combinationsQueryOptions().queryKey).toEqual(
      queryKeys.combinations.list()
    );
    expect(filmsQueryOptions({ cancellable: false }).queryKey).toEqual(
      queryKeys.films.list()
    );
  });

  /**
   * #354: a route loader prefetches the list while the home page is still
   * mounted, and leaving home unmounts its search box's (disabled) watcher.
   * The last watcher leaving aborts a fetch that took the query's signal, and
   * the page then fetched the list a second time.
   */
  it('a non-cancellable prefetch survives its last watcher leaving', async () => {
    const queryClient = new QueryClient();
    const prefetch = queryClient.prefetchQuery(
      filmsQueryOptions({ cancellable: false })
    );
    watchAndLeave(queryClient);
    await prefetch;

    expect(signals).toEqual([undefined]);
    expect(queryClient.getQueryData(queryKeys.films.list())).toEqual([]);
  });

  it('a cancellable fetch takes the signal and is aborted', async () => {
    const queryClient = new QueryClient();
    const prefetch = queryClient.prefetchQuery(filmsQueryOptions());
    watchAndLeave(queryClient);
    await prefetch;

    expect(signals).toHaveLength(1);
    expect(signals[0]?.aborted).toBe(true);
    expect(queryClient.getQueryData(queryKeys.films.list())).toBeUndefined();
  });
});

import { QueryClient } from '@tanstack/react-query';
import { createMemoryHistory, createRouter } from '@tanstack/react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DevelopmentRecipesPage } from '../../components/lazy-development-recipes-page';
import { routeTree } from '../../routeTree.gen';
import { parseSearch, stringifySearch } from '../search-params';

/**
 * Regression cover for #354: routes never preloaded and a page's data only
 * started after its chunk had downloaded and rendered. Each route's loader
 * now starts the page chunk and, for /development and /films, prefetches the
 * page's queries, without the router waiting on either. (calculatorRoute's
 * loader is covered in components/__tests__/calculator-route.test.tsx, the
 * lazyPage chunk preload in app/lib/__tests__/lazy-page.test.tsx.)
 */

function setup() {
  const queryClient = new QueryClient();
  // Never resolves: the loaders must not wait on their prefetches.
  const prefetch = vi
    .spyOn(queryClient, 'prefetchQuery')
    .mockReturnValue(new Promise(() => undefined));
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: ['/settings'] }),
    parseSearch,
    stringifySearch,
  });
  const prefetchedKeys = () =>
    prefetch.mock.calls.map(([options]) => options.queryKey);
  return { router, prefetchedKeys };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('route preloading', () => {
  it('starts the /development chunk and its three lists on preload', async () => {
    const { router, prefetchedKeys } = setup();
    const preloadChunk = vi
      .spyOn(DevelopmentRecipesPage, 'preload')
      .mockReturnValue(undefined);

    await router.preloadRoute({
      to: '/development',
      search: { film: 'hp5-plus' },
    });

    expect(prefetchedKeys()).toEqual([
      ['films', 'list'],
      ['developers', 'list'],
      ['combinations', 'list'],
    ]);
    expect(preloadChunk).toHaveBeenCalledOnce();
  });

  it('starts the films list on preload', async () => {
    const { router, prefetchedKeys } = setup();

    await router.preloadRoute({ to: '/films' });

    expect(prefetchedKeys()).toEqual([['films', 'list']]);
  });

  it('navigates without waiting for the prefetches, search intact', async () => {
    const { router } = setup();

    await router.navigate({
      to: '/development',
      search: { film: 'hp5-plus' },
    });

    expect(router.state.location.pathname).toBe('/development');
    expect(router.state.status).toBe('idle');
    expect(router.state.location.search).toMatchObject({ film: 'hp5-plus' });
  });
});

import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { loadCataloguePrefetch } from '../app/lib/load-catalogue-prefetch';
import { DevelopmentRoute } from '../components/development-route';
import { DevelopmentRecipesPage } from '../components/lazy-development-recipes-page';
import { developmentSearchSchema } from './search-schemas';

export const Route = createFileRoute('/development')({
  validateSearch: developmentSearchSchema,
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/development']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/development'] },
      { property: 'og:title', content: ROUTE_TITLES['/development'] },
      {
        property: 'og:description',
        content: ROUTE_DESCRIPTIONS['/development'],
      },
    ],
  }),
  // Starts the page chunk on intent and at navigation, and its three lists at
  // navigation only (a touch-scroll over a link counts as intent), without
  // holding the navigation (the page's Suspense spinner and its own loading
  // state still cover the wait): see lazyPage and catalogue-prefetch. The
  // search is left to `validateSearch` and the page, so no `loaderDeps`.
  loader: ({ context: { queryClient }, preload }) => {
    DevelopmentRecipesPage.preload(preload);
    const prefetcher = loadCataloguePrefetch(preload);
    if (preload) {
      // Only the module on intent, through the speculative count, so a stale
      // chunk cannot reload the page on hover.
      prefetcher.catch(() => undefined);
      return;
    }
    prefetcher
      .then(({ prefetchDevelopmentPageData }) =>
        prefetchDevelopmentPageData(queryClient)
      )
      // A failed import is left to the page, which fetches its own lists,
      // and to the stale-chunk recovery.
      .catch(() => undefined);
  },
  component: DevelopmentRoute,
});

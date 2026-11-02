import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { lazyPage } from '../app/lib/lazy-page';
import { loadCataloguePrefetch } from '../app/lib/load-catalogue-prefetch';
import { LoadingSpinner } from '../components/loading-spinner';
import { filmsSearchSchema } from './search-schemas';

const FilmsPage = lazyPage(() => import('../app/pages/films/films-page'));

export const Route = createFileRoute('/films')({
  validateSearch: filmsSearchSchema,
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/films']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/films'] },
      { property: 'og:title', content: ROUTE_TITLES['/films'] },
      {
        property: 'og:description',
        content: ROUTE_DESCRIPTIONS['/films'],
      },
    ],
  }),
  // Starts the page chunk on intent and at navigation, and the films list at
  // navigation only (a touch-scroll over a link counts as intent), without
  // holding the navigation for either: see lazyPage and catalogue-prefetch.
  loader: ({ context: { queryClient }, preload }) => {
    FilmsPage.preload(preload);
    const prefetcher = loadCataloguePrefetch(preload);
    if (preload) {
      // Only the module on intent, through the speculative count, so a stale
      // chunk cannot reload the page on hover.
      prefetcher.catch(() => undefined);
      return;
    }
    prefetcher
      .then(({ prefetchFilmsPageData }) => prefetchFilmsPageData(queryClient))
      // A failed import is left to the page, which fetches its own lists,
      // and to the stale-chunk recovery.
      .catch(() => undefined);
  },
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <FilmsPage />
    </Suspense>
  ),
});

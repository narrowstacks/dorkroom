import { filmsQueryOptions } from '@dorkroom/logic';
import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { lazyPage } from '../app/lib/lazy-page';
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
  // Starts the page chunk and the films list together, on intent and on
  // navigation, without holding the navigation for either: see lazyPage.
  // prefetchQuery shares the page's query (same key) and never throws; fresh
  // cached data is not refetched. Not cancellable: leaving the home page
  // unmounts its search box's watcher of this list, which would otherwise
  // abort the prefetch mid-request.
  loader: ({ context: { queryClient } }) => {
    FilmsPage.preload();
    void queryClient.prefetchQuery(filmsQueryOptions({ cancellable: false }));
  },
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <FilmsPage />
    </Suspense>
  ),
});

import {
  combinationsQueryOptions,
  developersQueryOptions,
  filmsQueryOptions,
} from '@dorkroom/logic';
import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
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
  // Starts the page chunk and its three catalogue lists together, on intent
  // and on navigation, without holding the navigation (the page's Suspense
  // spinner and its own loading state still cover the wait): see lazyPage.
  // prefetchQuery shares the page's queries (same keys) and never throws;
  // fresh cached data is not refetched. Not cancellable: leaving the home
  // page unmounts its search box's watchers of these lists, which would
  // otherwise abort the prefetch mid-request. The search is left to
  // `validateSearch` and the page, so no `loaderDeps`.
  loader: ({ context: { queryClient } }) => {
    DevelopmentRecipesPage.preload();
    void queryClient.prefetchQuery(filmsQueryOptions({ cancellable: false }));
    void queryClient.prefetchQuery(
      developersQueryOptions({ cancellable: false })
    );
    void queryClient.prefetchQuery(
      combinationsQueryOptions({ cancellable: false })
    );
  },
  component: DevelopmentRoute,
});

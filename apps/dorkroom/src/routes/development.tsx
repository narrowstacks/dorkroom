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
  // Starts the page chunk on intent and at navigation, and its three lists at
  // navigation only (a touch-scroll over a link counts as intent), without
  // holding the navigation (the page's Suspense spinner and its own loading
  // state still cover the wait): see lazyPage and catalogue-prefetch. The
  // search is left to `validateSearch` and the page, so no `loaderDeps`.
  loader: ({ context: { queryClient }, preload }) => {
    DevelopmentRecipesPage.preload(preload);
    if (preload) return;
    import('../app/lib/catalogue-prefetch')
      .then(({ prefetchDevelopmentPageData }) =>
        prefetchDevelopmentPageData(queryClient)
      )
      .catch(() => undefined); // Unreachable: the page fetches its own.
  },
  component: DevelopmentRoute,
});

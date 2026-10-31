import { useRouter, useRouterState } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from './loading-spinner';

const DevelopmentRecipesPage = lazy(
  () => import('../app/pages/development-recipes/development-recipes-page')
);

/**
 * The /development route's component. The page reads its link params (film,
 * developer, recipe, ...) only on mount. It keeps the URL in step with its
 * filters through `history.replaceState` with the entry's existing state, so
 * its own writes keep the location's history key; only a real navigation
 * that lands here while the page is open (a search answer, the nav) brings a
 * new key, and remounting the page on it applies the link.
 *
 * The router writes a navigation to the browser in a microtask, and a link
 * click renders before that: the remounted page would read the old URL and
 * its URL writer would put the old filters back. Flushing the pending write
 * first (a no-op when nothing is pending) makes `window.location` match.
 *
 * Outside the route file, like `calculatorRoute`: a router hook typed against
 * the route tree, called in the file that defines a route, makes that
 * route's type circular.
 */
export function DevelopmentRoute() {
  const router = useRouter();
  const locationKey = useRouterState({
    select: (state) => state.location.state.__TSR_key,
  });
  router.history.flush();
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DevelopmentRecipesPage key={locationKey} />
    </Suspense>
  );
}

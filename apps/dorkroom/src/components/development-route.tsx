import type { RecipeUrlBinding, RecipeUrlSearch } from '@dorkroom/logic';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { lazy, Suspense, useCallback, useMemo } from 'react';
import { LoadingSpinner } from './loading-spinner';

declare module '@tanstack/react-router' {
  interface HistoryState {
    /**
     * The history key of the navigation that mounted the recipes page,
     * carried through the page's own URL writes (see `DevelopmentRoute`).
     */
    developmentPageKey?: string;
  }
}

const DevelopmentRecipesPage = lazy(
  () => import('../app/pages/development-recipes/development-recipes-page')
);

/**
 * The /development route's component. It hands the page the router's search
 * (flat strings, which `useRecipeUrlState` parses and validates param by
 * param) and a writer that applies the page's filter changes as replace
 * navigations, keeping the hash, the scroll position and any other param
 * (the writer starts from the search `developmentSearchSchema` validated),
 * so a filter change never adds a history entry.
 *
 * The page seeds its filters from the URL only on mount, so a real navigation
 * that lands here while it is open (a search answer, the nav) must remount
 * it. Every navigation gets a fresh history key, the page's own writes
 * included, so those carry the key of the navigation that mounted the page in
 * `developmentPageKey`, and the page is keyed on that, falling back to the
 * entry's own key: its own writes keep it mounted, anything else remounts it.
 *
 * Outside the route file, like `calculatorRoute`: a router hook typed against
 * the route tree, called in the file that defines a route, makes that
 * route's type circular.
 */
export function DevelopmentRoute() {
  // The search and the page key come from the same location. The route's
  // match (`useSearch`) takes the new search a render after the location, and
  // a page remounted on the new key in between would seed from the old one.
  // Search values are flat strings: see parseSearch in routes/search-params.
  const search = useRouterState({
    select: (state): RecipeUrlSearch => state.location.search,
  });
  const pageKey = useRouterState({
    select: (state) =>
      state.location.state.developmentPageKey ?? state.location.state.__TSR_key,
  });
  const navigate = useNavigate();

  const replaceSearch = useCallback<RecipeUrlBinding['replaceSearch']>(
    (update) => {
      void navigate({
        to: '.',
        replace: true,
        resetScroll: false,
        hash: true,
        state: (prev) => ({
          ...prev,
          developmentPageKey: prev.developmentPageKey ?? prev.__TSR_key,
        }),
        search: (prev: RecipeUrlSearch) => update(prev),
      });
    },
    [navigate]
  );

  const url = useMemo<RecipeUrlBinding>(
    () => ({ search, replaceSearch }),
    [search, replaceSearch]
  );

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DevelopmentRecipesPage key={pageKey} url={url} />
    </Suspense>
  );
}

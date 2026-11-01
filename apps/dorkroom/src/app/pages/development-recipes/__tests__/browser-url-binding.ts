import type { RecipeUrlBinding, RecipeUrlSearch } from '@dorkroom/logic';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

/**
 * A stand-in for `DevelopmentRoute`'s router binding over the browser's own
 * history, for tests that render the recipes page (or its URL hooks) without
 * a router. Like the route, it reads the current search and applies writes as
 * a replace that keeps the hash, so URL assertions can read
 * `window.location` directly.
 */

const listeners = new Set<() => void>();

const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('popstate', onChange);
  };
};

const getSearchString = () => window.location.search;

export function useBrowserUrlBinding(): RecipeUrlBinding {
  const searchString = useSyncExternalStore(subscribe, getSearchString);
  const search = useMemo<RecipeUrlSearch>(
    () => Object.fromEntries(new URLSearchParams(searchString)),
    [searchString]
  );
  const replaceSearch = useCallback<RecipeUrlBinding['replaceSearch']>(
    (update) => {
      const prev = Object.fromEntries(
        new URLSearchParams(window.location.search)
      );
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(update(prev))) {
        if (value) params.set(key, value);
      }
      const query = params.toString();
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
      );
      for (const listener of listeners) listener();
    },
    []
  );
  return useMemo(() => ({ search, replaceSearch }), [search, replaceSearch]);
}

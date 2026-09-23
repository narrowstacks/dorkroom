import { useCallback } from 'react';

export interface UseClearFiltersProps {
  /** Resets every filter owned by `useDevelopmentRecipes` (developer type,
   * dilution, ISO, recipe type, tag, search). It has no knowledge of
   * `favoritesOnly`, which is page-level state. */
  clearFilters: () => void;
  setFavoritesOnly: (value: boolean) => void;
}

/**
 * Wraps the hook's `clearFilters` so "Clear filters" also resets
 * "Favorites only". `favoritesOnly` lives in page state (not in
 * `useDevelopmentRecipes`), so the hook's own `clearFilters` can't reach it
 * on its own (#327). Resetting it here is also sufficient
 * to clear the `favorites` URL param and the dead-end-search analytics
 * filter count, both of which already react to `favoritesOnly` changes.
 */
export function useClearFilters({
  clearFilters,
  setFavoritesOnly,
}: UseClearFiltersProps): () => void {
  return useCallback(() => {
    clearFilters();
    setFavoritesOnly(false);
  }, [clearFilters, setFavoritesOnly]);
}

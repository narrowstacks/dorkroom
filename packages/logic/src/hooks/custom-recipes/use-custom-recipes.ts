import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { queryKeys } from '../../queries/query-keys';
import type { CustomRecipe } from '../../types/custom-recipes';
import { debugError, debugWarn } from '../../utils/debug-logger';

const STORAGE_KEY = 'dorkroom_custom_recipes';

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    debugWarn('Local storage unavailable for custom recipes:', error);
    return null;
  }
};

const readRecipesFromStorage = (): CustomRecipe[] => {
  const storage = getStorage();

  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as CustomRecipe[];
    if (Array.isArray(parsed)) {
      return parsed;
    }

    return [];
  } catch (error) {
    debugError('[useCustomRecipes] Failed to parse stored recipes:', error);
    return [];
  }
};

/**
 * Hook to fetch and cache custom recipes from localStorage
 * Uses TanStack Query to provide consistent cache management
 *
 * @returns TanStack Query result with custom recipes data, loading state, and error handling
 *
 * Error Handling:
 * - Returns empty array if localStorage is unavailable
 * - Logs parsing errors but continues with empty state
 * - Exposes `error` state through TanStack Query for UI error handling
 *
 * @example
 * ```typescript
 * const { data: recipes, isPending, error } = useCustomRecipes();
 *
 * if (error) {
 *   return <ErrorMessage>Failed to load custom recipes</ErrorMessage>;
 * }
 * ```
 */
export function useCustomRecipes() {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => queryKeys.customRecipes.list(), []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleStorage = (event: StorageEvent) => {
      // Ignore events that aren't for our specific key
      // Also ignore localStorage.clear() events (where key is null)
      // as we don't want to wipe the in-memory cache unexpectedly if other data is cleared
      if (!event.key || event.key !== STORAGE_KEY) {
        return;
      }

      try {
        queryClient.setQueryData(queryKey, readRecipesFromStorage());
      } catch (error) {
        debugError(
          '[useCustomRecipes] Failed to update cache from storage event:',
          error
        );
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [queryClient, queryKey]);

  return useQuery<CustomRecipe[]>({
    queryKey,
    queryFn: readRecipesFromStorage,
    // Custom recipes are purely client-side, no stale time
    staleTime: Infinity,
    // Keep in cache for the session
    gcTime: Infinity,
  });
}

/**
 * Hook to refetch custom recipes manually
 * Useful for syncing changes across tabs
 */
export function useRefreshCustomRecipes() {
  const queryClient = useQueryClient();

  return () => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.customRecipes.list(),
    });
  };
}

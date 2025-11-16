import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CustomRecipe } from '../../types/custom-recipes';
import { queryKeys } from '../../queries/query-keys';
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
 */
export function useCustomRecipes() {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => queryKeys.customRecipes.list(), []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== STORAGE_KEY) {
        return;
      }

      queryClient.setQueryData(queryKey, readRecipesFromStorage());
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

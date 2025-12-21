import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createStorageManager,
  isStringArray,
} from '../../services/local-storage';

const STORAGE_KEY = 'dorkroom_favorite_recipes';

const favoritesStorage = createStorageManager<string[]>(STORAGE_KEY, {
  defaultValue: [],
  validate: isStringArray,
  logContext: 'useFavorites',
});

/**
 * Hook for managing favorite recipe IDs stored in localStorage.
 * Provides functionality to mark recipes as favorites and check favorite status.
 *
 * @returns Object containing favorite state and management functions
 *
 * @example
 * ```typescript
 * const {
 *   favoriteIds,
 *   isFavorite,
 *   addFavorite,
 *   removeFavorite,
 *   toggleFavorite
 * } = useFavorites();
 *
 * // Check if a recipe is favorited
 * if (isFavorite(recipeId)) {
 *   console.log('This recipe is a favorite!');
 * }
 *
 * // Toggle favorite status
 * toggleFavorite(recipeId);
 * ```
 */
export const useFavorites = () => {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadFavorites = useCallback(() => {
    const ids = favoritesStorage.read();
    setFavoriteIds(ids);
    setIsInitialized(true);
    setError(null);
    return ids;
  }, []);

  const saveFavorites = useCallback((ids: string[]) => {
    favoritesStorage.write(ids);
    setFavoriteIds(ids);
    setError(null);
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const isFavorite = useCallback(
    (id?: string | number | null): boolean => {
      if (id === undefined || id === null) return false;
      const key = String(id);
      return favoriteIds.includes(key);
    },
    [favoriteIds]
  );

  const addFavorite = useCallback(
    (id: string | number) => {
      const key = String(id);
      if (favoriteIds.includes(key)) return;
      const updated = [...favoriteIds, key];
      saveFavorites(updated);
    },
    [favoriteIds, saveFavorites]
  );

  const removeFavorite = useCallback(
    (id: string | number) => {
      const key = String(id);
      if (!favoriteIds.includes(key)) return;
      const updated = favoriteIds.filter((x) => x !== key);
      saveFavorites(updated);
    },
    [favoriteIds, saveFavorites]
  );

  const toggleFavorite = useCallback(
    (id: string | number) => {
      const key = String(id);
      if (favoriteIds.includes(key)) {
        removeFavorite(key);
      } else {
        addFavorite(key);
      }
    },
    [favoriteIds, addFavorite, removeFavorite]
  );

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  return {
    favoriteIds,
    favoriteSet,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    reload: loadFavorites,
    isInitialized,
    error,
  };
};

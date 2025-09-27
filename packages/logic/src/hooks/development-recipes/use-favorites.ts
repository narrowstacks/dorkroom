import { useCallback, useEffect, useMemo, useState } from 'react';
import { debugError, debugWarn } from '../../utils/debug-logger';

const STORAGE_KEY = 'dorkroom_favorite_recipes';

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch (error) {
    debugWarn('Local storage unavailable for favorites:', error);
    return null;
  }
};

const readFavoritesFromStorage = (): string[] => {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch (error) {
    debugError('[useFavorites] Failed to parse favorites:', error);
    return [];
  }
};

const writeFavoritesToStorage = (ids: string[]): void => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch (error) {
    debugError('[useFavorites] Failed to persist favorites:', error);
    // Swallow so the UI can keep working even if persistence fails
  }
};

export const useFavorites = () => {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const loadFavorites = useCallback(() => {
    const ids = readFavoritesFromStorage();
    setFavoriteIds(ids);
    return ids;
  }, []);

  const saveFavorites = useCallback((ids: string[]) => {
    writeFavoritesToStorage(ids);
    setFavoriteIds(ids);
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
  };
};

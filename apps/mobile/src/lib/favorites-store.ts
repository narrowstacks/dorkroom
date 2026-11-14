import { useMemo } from 'react';
import { useMMKVString } from 'react-native-mmkv';
import {
  addFavorite,
  moveFavorite,
  parseFavoriteIds,
  removeFavorite,
  sameFavorites,
  toggleFavorite,
} from './favorites';
import { homeStorage } from './recent-store';

// The favorite tools, stored like Home's recent lists (`recent-store.ts`): one
// JSON array of tool ids in the `dorkroom-home` MMKV instance. Local to the
// device; the Favorites widget gets the ids, names and symbols pushed to it
// (`widgets.ts`), never this store.

export const storage = homeStorage;
export const FAVORITES_KEY = 'favoriteToolIds';

export function getFavoriteIds(): string[] {
  return parseFavoriteIds(storage.getString(FAVORITES_KEY));
}

/** Writes `next` unless it is what is stored already (no listener churn). */
function write(next: readonly string[]): void {
  if (sameFavorites(getFavoriteIds(), next)) return;
  storage.set(FAVORITES_KEY, JSON.stringify(next));
}

export function setFavoriteIds(ids: readonly string[]): void {
  write(parseFavoriteIds(JSON.stringify(ids)));
}

export function addFavoriteTool(id: string): void {
  write(addFavorite(getFavoriteIds(), id));
}

export function removeFavoriteTool(id: string): void {
  write(removeFavorite(getFavoriteIds(), id));
}

export function toggleFavoriteTool(id: string): void {
  write(toggleFavorite(getFavoriteIds(), id));
}

/** Moves a favorite one place up (-1) or down (+1). */
export function moveFavoriteTool(id: string, delta: number): void {
  write(moveFavorite(getFavoriteIds(), id, delta));
}

/** Calls `listener` when the favorites change. Returns the unsubscribe. */
export function subscribeFavorites(listener: () => void): () => void {
  const subscription = storage.addOnValueChangedListener((key) => {
    if (key === FAVORITES_KEY) listener();
  });
  return () => subscription.remove();
}

/** The favorites, re-read whenever they change (from any screen). */
export function useFavoriteIds(): readonly string[] {
  const [raw] = useMMKVString(FAVORITES_KEY, storage);
  return useMemo(() => parseFavoriteIds(raw), [raw]);
}

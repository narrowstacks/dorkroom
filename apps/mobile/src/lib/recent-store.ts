import { createMMKV } from 'react-native-mmkv';
import { getTool } from '@/lib/tools';
import { parseRecentIds, recordRecentId } from './recent-list';

// What the Home screen resumes from: the tools and recipes last opened, and
// whether Home has been shown before. Local to the device, never sent anywhere.
const storage = createMMKV({ id: 'dorkroom-home' });

const RECENT_TOOLS_KEY = 'recentToolIds';
const RECENT_RECIPES_KEY = 'recentRecipeIds';
const SEEN_KEY = 'homeSeen';

export const MAX_RECENT_TOOLS = 4;
/** How many recently opened recipes Home shows. */
export const MAX_RECENT_RECIPES = 3;
/**
 * How many recently opened recipes are kept: Home shows the first
 * `MAX_RECENT_RECIPES`, Spotlight indexes them all (`spotlight-sync.ts`).
 */
export const MAX_RECIPE_HISTORY = 50;

export function getRecentToolIds(): string[] {
  return parseRecentIds(storage.getString(RECENT_TOOLS_KEY)).filter(
    (id) => getTool(id) !== undefined
  );
}

export function recordToolUse(id: string): void {
  if (getTool(id) === undefined) return;
  const next = recordRecentId(getRecentToolIds(), id, MAX_RECENT_TOOLS);
  storage.set(RECENT_TOOLS_KEY, JSON.stringify(next));
}

/** The recipes Home lists, newest first. */
export function getRecentRecipeIds(): string[] {
  return getRecipeHistoryIds().slice(0, MAX_RECENT_RECIPES);
}

/** Every kept recently opened recipe, newest first (at most `MAX_RECIPE_HISTORY`). */
export function getRecipeHistoryIds(): string[] {
  return parseRecentIds(storage.getString(RECENT_RECIPES_KEY));
}

export function recordRecipeOpen(id: string): void {
  const next = recordRecentId(getRecipeHistoryIds(), id, MAX_RECIPE_HISTORY);
  storage.set(RECENT_RECIPES_KEY, JSON.stringify(next));
}

/** The stored history as written, for `useSyncExternalStore` (a string compares by value). */
export function getRecipeHistoryRaw(): string | undefined {
  return storage.getString(RECENT_RECIPES_KEY);
}

/** Calls `listener` when the recipe history changes. Returns the unsubscribe. */
export function subscribeRecipeHistory(listener: () => void): () => void {
  const subscription = storage.addOnValueChangedListener((key) => {
    if (key === RECENT_RECIPES_KEY) listener();
  });
  return () => subscription.remove();
}

/** Whether Home has never been shown on this device. */
export function isFirstHomeLaunch(): boolean {
  return storage.getString(SEEN_KEY) === undefined;
}

export function markHomeSeen(): void {
  storage.set(SEEN_KEY, '1');
}

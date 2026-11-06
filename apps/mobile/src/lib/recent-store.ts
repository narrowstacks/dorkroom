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
export const MAX_RECENT_RECIPES = 3;

// Tools that are not worth resuming: Home itself, and Settings.
const UNTRACKED_TOOLS = new Set(['home', 'settings']);

export function getRecentToolIds(): string[] {
  return parseRecentIds(storage.getString(RECENT_TOOLS_KEY)).filter(
    (id) => getTool(id) !== undefined
  );
}

export function recordToolUse(id: string): void {
  if (UNTRACKED_TOOLS.has(id) || getTool(id) === undefined) return;
  const next = recordRecentId(getRecentToolIds(), id, MAX_RECENT_TOOLS);
  storage.set(RECENT_TOOLS_KEY, JSON.stringify(next));
}

export function getRecentRecipeIds(): string[] {
  return parseRecentIds(storage.getString(RECENT_RECIPES_KEY));
}

export function recordRecipeOpen(id: string): void {
  const next = recordRecentId(getRecentRecipeIds(), id, MAX_RECENT_RECIPES);
  storage.set(RECENT_RECIPES_KEY, JSON.stringify(next));
}

/** Whether Home has never been shown on this device. */
export function isFirstHomeLaunch(): boolean {
  return storage.getString(SEEN_KEY) === undefined;
}

export function markHomeSeen(): void {
  storage.set(SEEN_KEY, '1');
}

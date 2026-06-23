import { MMKV } from 'react-native-mmkv';
import { DEFAULT_PINNED_IDS, getTool } from './tools';

export const storage = new MMKV({ id: 'dorkroom-tab-bar' });
export const KEY = 'pinnedToolIds';

export const MAX_PINNED = 4;

/** Normalizes a raw stored value into a valid, capped pinned-id list,
 * falling back to defaults when unset/malformed/empty. */
export function normalizePinnedIds(raw: string | undefined): string[] {
  if (!raw) return [...DEFAULT_PINNED_IDS];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [...DEFAULT_PINNED_IDS];
  }
  if (!Array.isArray(parsed)) return [...DEFAULT_PINNED_IDS];
  const valid = parsed
    .filter(
      (id): id is string => typeof id === 'string' && getTool(id) !== undefined
    )
    .slice(0, MAX_PINNED);
  return valid.length > 0 ? valid : [...DEFAULT_PINNED_IDS];
}

export function getPinnedIds(): string[] {
  return normalizePinnedIds(storage.getString(KEY));
}

export function setPinnedIds(ids: string[]): void {
  storage.set(KEY, JSON.stringify(ids.slice(0, MAX_PINNED)));
}

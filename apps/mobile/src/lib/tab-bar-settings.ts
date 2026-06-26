import { createMMKV } from 'react-native-mmkv';
import { DEFAULT_PINNED_IDS, getTool } from './tools';

export const storage = createMMKV({ id: 'dorkroom-tab-bar' });
export const KEY = 'pinnedToolIds';

// The native tab bar holds at most 5 items. Film Log and More are permanent, so
// the user can pin up to 3 of their own tools.
export const MAX_PINNED = 3;

// Default pins, capped to the limit (takes the first MAX_PINNED in priority order).
const DEFAULT_PINS = DEFAULT_PINNED_IDS.slice(0, MAX_PINNED);

/** Normalizes a raw stored value into a valid, capped pinned-id list,
 * falling back to defaults when unset/malformed/empty. */
export function normalizePinnedIds(raw: string | undefined): string[] {
  if (!raw) return [...DEFAULT_PINS];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [...DEFAULT_PINS];
  }
  if (!Array.isArray(parsed)) return [...DEFAULT_PINS];
  const valid = parsed
    .filter((id): id is string => {
      if (typeof id !== 'string') return false;
      const tool = getTool(id);
      // Drop unknown tools and ones that aren't user-pinnable (e.g. film-log, a
      // permanent tab) so a stale pin can't render a broken/duplicate trigger.
      return tool !== undefined && tool.pinnable !== false;
    })
    .slice(0, MAX_PINNED);
  return valid.length > 0 ? valid : [...DEFAULT_PINS];
}

export function getPinnedIds(): string[] {
  return normalizePinnedIds(storage.getString(KEY));
}

export function setPinnedIds(ids: string[]): void {
  storage.set(KEY, JSON.stringify(ids.slice(0, MAX_PINNED)));
}

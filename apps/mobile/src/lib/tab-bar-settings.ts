import { createMMKV } from 'react-native-mmkv';
import { z } from 'zod';
import { DEFAULT_PINNED_IDS, getTool } from './tools';

export const storage = createMMKV({ id: 'dorkroom-tab-bar' });
export const KEY = 'pinnedToolIds';

// The native tab bar holds at most 5 items. Film Log, Recipes and More are
// permanent, so the user can pin up to 2 of their own tools.
export const MAX_PINNED = 2;

// Default pins, capped to the limit (takes the first MAX_PINNED in priority order).
const DEFAULT_PINS = DEFAULT_PINNED_IDS.slice(0, MAX_PINNED);

/** A stored pin: the id of a known, user-pinnable tool. Unknown tools and
 * permanent tabs (e.g. film-log) fail, so a stale pin can't render a broken or
 * duplicate trigger. */
const pinnableToolIdSchema = z.string().refine((id) => {
  const tool = getTool(id);
  return tool !== undefined && tool.pinnable !== false;
});

/** Anything that isn't a JSON array decodes as empty — i.e. back to defaults. */
const storedPinsSchema = z.array(z.unknown()).catch([]);

/** Normalizes a raw stored value into a valid, capped pinned-id list,
 * falling back to defaults when unset/malformed/empty. */
export function normalizePinnedIds(raw: string | undefined): string[] {
  if (!raw) return [...DEFAULT_PINS];
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return [...DEFAULT_PINS];
  }
  // Entries are decoded one at a time so one bad pin can't discard the rest.
  const valid = storedPinsSchema
    .parse(json)
    .flatMap((entry) => {
      const id = pinnableToolIdSchema.safeParse(entry);
      return id.success ? [id.data] : [];
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

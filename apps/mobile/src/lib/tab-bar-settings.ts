import { MMKV } from 'react-native-mmkv';
import { DEFAULT_PINNED_IDS, getTool } from './tools';

const storage = new MMKV({ id: 'dorkroom-tab-bar' });
const KEY = 'pinnedToolIds';

export const MAX_PINNED = 4;

export function getPinnedIds(): string[] {
  const raw = storage.getString(KEY);
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

export function setPinnedIds(ids: string[]): void {
  storage.set(KEY, JSON.stringify(ids.slice(0, MAX_PINNED)));
}

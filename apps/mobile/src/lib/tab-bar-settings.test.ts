// src/lib/tab-bar-settings.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('react-native-mmkv', () => ({
  MMKV: class {
    getString(k: string) {
      return store.get(k);
    }
    set(k: string, v: string) {
      store.set(k, v);
    }
    delete(k: string) {
      store.delete(k);
    }
  },
}));

import { getPinnedIds, MAX_PINNED, setPinnedIds } from './tab-bar-settings';
import { DEFAULT_PINNED_IDS } from './tools';

describe('tab-bar-settings', () => {
  beforeEach(() => store.clear());

  it('returns the defaults when unset', () => {
    expect(getPinnedIds()).toEqual([...DEFAULT_PINNED_IDS]);
  });

  it('round-trips a saved set', () => {
    setPinnedIds(['border', 'resize']);
    expect(getPinnedIds()).toEqual(['border', 'resize']);
  });

  it('drops unknown ids and caps at MAX_PINNED', () => {
    setPinnedIds(['border', 'nope', 'resize', 'meter', 'exposure', 'mat']);
    const result = getPinnedIds();
    expect(result).not.toContain('nope');
    expect(result.length).toBeLessThanOrEqual(MAX_PINNED);
  });

  it('falls back to defaults when the saved set is empty', () => {
    setPinnedIds([]);
    expect(getPinnedIds()).toEqual([...DEFAULT_PINNED_IDS]);
  });
});

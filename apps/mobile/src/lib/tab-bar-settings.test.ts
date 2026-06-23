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
  useMMKVString: (key: string) => [store.get(key), vi.fn()],
}));

import {
  getPinnedIds,
  MAX_PINNED,
  normalizePinnedIds,
  setPinnedIds,
} from './tab-bar-settings';
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

describe('normalizePinnedIds', () => {
  it('returns defaults when value is undefined', () => {
    expect(normalizePinnedIds(undefined)).toEqual([...DEFAULT_PINNED_IDS]);
  });

  it('returns valid ids from a well-formed JSON array', () => {
    const ids = ['border', 'resize'];
    expect(normalizePinnedIds(JSON.stringify(ids))).toEqual(ids);
  });

  it('returns defaults when value is malformed JSON', () => {
    expect(normalizePinnedIds('not json')).toEqual([...DEFAULT_PINNED_IDS]);
  });

  it('drops unknown ids from a mixed array', () => {
    const raw = JSON.stringify(['border', 'unknown-tool', 'resize']);
    const result = normalizePinnedIds(raw);
    expect(result).toContain('border');
    expect(result).toContain('resize');
    expect(result).not.toContain('unknown-tool');
  });

  it('caps results at MAX_PINNED when more than 4 valid ids are provided', () => {
    const raw = JSON.stringify([
      'border',
      'resize',
      'meter',
      'exposure',
      'reciprocity',
    ]);
    const result = normalizePinnedIds(raw);
    expect(result.length).toBeLessThanOrEqual(MAX_PINNED);
  });
});

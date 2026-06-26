import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, boolean>();
vi.mock('@/lib/meter-settings', () => ({
  meterStorage: {
    getBoolean: (k: string) => store.get(k),
    set: (k: string, v: boolean) => void store.set(k, v),
  },
}));
// Shim the MMKV hook so the module can be imported in node (no react-native needed).
vi.mock('react-native-mmkv', () => ({
  useMMKVBoolean: (
    key: string,
    storage: {
      getBoolean: (k: string) => boolean | undefined;
      set: (k: string, v: boolean) => void;
    }
  ) => [storage.getBoolean(key), (v: boolean) => storage.set(key, v)],
}));

import {
  getSaveMeterPhotosToLibrary,
  setSaveMeterPhotosToLibrary,
} from './photo-settings';

describe('photo-settings', () => {
  beforeEach(() => store.clear());
  it('defaults to false', () => {
    expect(getSaveMeterPhotosToLibrary()).toBe(false);
  });
  it('round-trips true', () => {
    setSaveMeterPhotosToLibrary(true);
    expect(getSaveMeterPhotosToLibrary()).toBe(true);
  });
});

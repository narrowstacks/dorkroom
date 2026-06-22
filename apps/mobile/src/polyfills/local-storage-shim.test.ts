import { beforeEach, describe, expect, it } from 'vitest';
import { createWebStorageShim, type KVBackend } from './local-storage-shim';

function makeMemoryBackend(): KVBackend {
  const store = new Map<string, string>();
  return {
    getString: (k) => store.get(k),
    set: (k, v) => {
      store.set(k, v);
    },
    delete: (k) => {
      store.delete(k);
    },
    getAllKeys: () => [...store.keys()],
  };
}

describe('createWebStorageShim', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createWebStorageShim(makeMemoryBackend());
  });

  it('returns null for a missing key', () => {
    expect(storage.getItem('missing')).toBeNull();
  });

  it('round-trips a value via setItem/getItem', () => {
    storage.setItem('k', 'v');
    expect(storage.getItem('k')).toBe('v');
  });

  it('overwrites an existing value', () => {
    storage.setItem('k', 'a');
    storage.setItem('k', 'b');
    expect(storage.getItem('k')).toBe('b');
  });

  it('removeItem deletes the key', () => {
    storage.setItem('k', 'v');
    storage.removeItem('k');
    expect(storage.getItem('k')).toBeNull();
  });

  it('reports length and clears all keys', () => {
    storage.setItem('a', '1');
    storage.setItem('b', '2');
    expect(storage.length).toBe(2);
    storage.clear();
    expect(storage.length).toBe(0);
    expect(storage.getItem('a')).toBeNull();
  });

  it('key(index) returns the key name at that index', () => {
    storage.setItem('only', '1');
    expect(storage.key(0)).toBe('only');
    expect(storage.key(5)).toBeNull();
  });
});

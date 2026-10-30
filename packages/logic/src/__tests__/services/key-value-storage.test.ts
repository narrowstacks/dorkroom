import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLocalStorageAdapter,
  createMemoryStorage,
} from '../../services/key-value-storage';

describe('createMemoryStorage', () => {
  it('round-trips, overwrites and removes strings', () => {
    const storage = createMemoryStorage({ seeded: '1' });
    expect(storage.getItem('seeded')).toBe('1');
    expect(storage.getItem('missing')).toBeNull();

    storage.setItem('k', 'a');
    storage.setItem('k', 'b');
    expect(storage.getItem('k')).toBe('b');

    storage.removeItem('k');
    expect(storage.getItem('k')).toBeNull();
  });

  it('keeps separate instances separate', () => {
    const a = createMemoryStorage();
    const b = createMemoryStorage();
    a.setItem('k', 'v');
    expect(b.getItem('k')).toBeNull();
  });
});

describe('createLocalStorageAdapter', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reads and writes window.localStorage', () => {
    const storage = createLocalStorageAdapter();
    storage.setItem('k', 'v');
    expect(window.localStorage.getItem('k')).toBe('v');
    window.localStorage.setItem('other', 'x');
    expect(storage.getItem('other')).toBe('x');
    storage.removeItem('k');
    expect(window.localStorage.getItem('k')).toBeNull();
  });

  it('looks localStorage up on each call, so a replaced global is used', () => {
    const storage = createLocalStorageAdapter();
    const replacement = createMemoryStorage({ k: 'from replacement' });
    vi.stubGlobal('localStorage', replacement);
    expect(storage.getItem('k')).toBe('from replacement');
  });

  it('propagates storage errors for the caller to handle', () => {
    const storage = createLocalStorageAdapter();
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => storage.setItem('k', 'v')).toThrow('quota exceeded');
  });

  it('reads null and drops writes where there is no localStorage, warning once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('localStorage', undefined);
    const storage = createLocalStorageAdapter();

    expect(storage.getItem('k')).toBeNull();
    expect(() => storage.setItem('k', 'v')).not.toThrow();
    expect(() => storage.removeItem('k')).not.toThrow();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('calculator state will not persist')
    );
  });
});

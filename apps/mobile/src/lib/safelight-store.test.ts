import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSafelight,
  KEY,
  setSafelight,
  storage,
  subscribeSafelight,
} from './safelight-store';

beforeEach(() => {
  storage.clearAll();
});

describe('safelight store', () => {
  it('is off by default', () => {
    expect(getSafelight()).toBe(false);
  });

  it('round-trips and persists synchronously', () => {
    setSafelight(true);
    expect(getSafelight()).toBe(true);
    expect(storage.getBoolean(KEY)).toBe(true);
    setSafelight(false);
    expect(getSafelight()).toBe(false);
  });

  it('reads a value written by an earlier launch', () => {
    storage.set(KEY, true);
    expect(getSafelight()).toBe(true);
  });

  it('notifies subscribers only on a change, and stops after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSafelight(listener);
    setSafelight(true);
    setSafelight(true);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setSafelight(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

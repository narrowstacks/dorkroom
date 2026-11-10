import { describe, expect, it, vi } from 'vitest';
import {
  clearLegacyPins,
  LEGACY_PINS_INSTANCE_ID,
  type LegacyPinsStorage,
} from './legacy-pins';

function fakeStorage(present: boolean) {
  let exists = present;
  const remove = vi.fn(() => {
    exists = false;
    return true;
  });
  const storage: LegacyPinsStorage = { exists: () => exists, remove };
  return { storage, remove };
}

describe('clearLegacyPins', () => {
  it('deletes the old tab-bar instance when it exists', () => {
    const { storage, remove } = fakeStorage(true);
    clearLegacyPins(storage);
    expect(LEGACY_PINS_INSTANCE_ID).toBe('dorkroom-tab-bar');
    expect(remove).toHaveBeenCalledWith('dorkroom-tab-bar');
  });

  it('does nothing, and creates nothing, when there is no instance', () => {
    const { storage, remove } = fakeStorage(false);
    clearLegacyPins(storage);
    expect(remove).not.toHaveBeenCalled();
  });

  it('is idempotent across launches', () => {
    const { storage, remove } = fakeStorage(true);
    clearLegacyPins(storage);
    clearLegacyPins(storage);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('never throws', () => {
    expect(() =>
      clearLegacyPins({
        exists: () => {
          throw new Error('native module unavailable');
        },
        remove: () => true,
      })
    ).not.toThrow();
    expect(() =>
      clearLegacyPins({
        exists: () => true,
        remove: () => {
          throw new Error('busy');
        },
      })
    ).not.toThrow();
  });
});

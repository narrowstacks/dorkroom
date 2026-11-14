import { describe, expect, it } from 'vitest';
import type { DorkroomSharedModule } from '../../modules/dorkroom-shared';
import {
  createSharedDefaults,
  SHARED_DEFAULTS_UNAVAILABLE,
  sharedDefaults,
} from './shared-defaults';

/** An in-memory stand-in for the App Group suite. */
function memoryModule(): DorkroomSharedModule & {
  reloaded: (string | null)[];
} {
  const values = new Map<string, boolean | number>();
  const reloaded: (string | null)[] = [];
  return {
    reloaded,
    getSharedBool: (key) => {
      const value = values.get(key);
      return value === undefined ? null : Boolean(value);
    },
    setSharedBool: (key, value) => {
      values.set(key, value);
    },
    getSharedNumber: (key) => {
      const value = values.get(key);
      return value === undefined ? null : Number(value);
    },
    setSharedNumber: (key, value) => {
      values.set(key, value);
    },
    reloadControls: (kind) => {
      reloaded.push(kind ?? null);
    },
  };
}

const throwing: DorkroomSharedModule = {
  getSharedBool: () => {
    throw new Error('no group');
  },
  setSharedBool: () => {
    throw new Error('no group');
  },
  getSharedNumber: () => {
    throw new Error('no group');
  },
  setSharedNumber: () => {
    throw new Error('no group');
  },
  reloadControls: () => {
    throw new Error('no group');
  },
};

describe('createSharedDefaults', () => {
  it('reads and writes through the native module', () => {
    const native = memoryModule();
    const warnings: string[] = [];
    const defaults = createSharedDefaults(native, (m) => warnings.push(m));
    expect(defaults.getBool('safelightOn')).toBeNull();
    defaults.setBool('safelightOn', true);
    defaults.setNumber('safelightChangedAt', 1_700_000_000_000);
    expect(defaults.getBool('safelightOn')).toBe(true);
    expect(defaults.getNumber('safelightChangedAt')).toBe(1_700_000_000_000);
    defaults.reloadControls('kind');
    defaults.reloadControls();
    expect(native.reloaded).toEqual(['kind', null]);
    expect(warnings).toEqual([]);
  });

  it('degrades to null reads and no-op writes without the module, warning once', () => {
    const warnings: string[] = [];
    const defaults = createSharedDefaults(null, (m) => warnings.push(m));
    expect(defaults.getBool('a')).toBeNull();
    expect(defaults.getNumber('a')).toBeNull();
    expect(() => defaults.setBool('a', true)).not.toThrow();
    expect(() => defaults.reloadControls('k')).not.toThrow();
    expect(warnings).toEqual([SHARED_DEFAULTS_UNAVAILABLE]);
  });

  it('never throws when the App Group is unavailable', () => {
    const warnings: string[] = [];
    const defaults = createSharedDefaults(throwing, (m) => warnings.push(m));
    expect(defaults.getBool('a')).toBeNull();
    expect(defaults.getNumber('a')).toBeNull();
    expect(() => defaults.setNumber('a', 1)).not.toThrow();
    expect(() => defaults.reloadControls()).not.toThrow();
    expect(warnings).toHaveLength(1);
  });

  it('treats a non-finite number as absent', () => {
    const native = memoryModule();
    native.setSharedNumber('n', Number.NaN);
    expect(createSharedDefaults(native, () => {}).getNumber('n')).toBeNull();
  });

  it('falls back under vitest, where the native module is missing', () => {
    expect(sharedDefaults.getBool('safelightOn')).toBeNull();
  });
});

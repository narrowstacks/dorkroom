import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  type MigrationStep,
  openVersionedStore,
  SCHEMA_VERSION_KEY,
} from './schema-version';
import {
  getQuarantined,
  type StringStore,
  writeCollection,
} from './stored-collection';

const itemSchema = z.object({ id: z.string(), label: z.string() });
const collections = [{ key: 'items', schema: itemSchema }];

function memoryStore(initial: Record<string, string> = {}): StringStore & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getString: (key) => data.get(key),
    set: (key, value) => {
      data.set(key, value);
    },
  };
}

describe('openVersionedStore', () => {
  const a = { id: 'a', label: 'A' };

  it('keeps a real v0 -> v1 step so unversioned data gets stamped', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
    expect(MIGRATIONS).toHaveLength(1);
  });

  it('stamps a fresh install without touching anything else', () => {
    const store = memoryStore();
    expect(openVersionedStore(store, collections)).toEqual({
      state: 'fresh',
      version: 1,
    });
    expect(store.data.get(SCHEMA_VERSION_KEY)).toBe('1');
    expect(store.data.has('items')).toBe(false);
  });

  it('migrates unversioned (v0) data and stamps it', () => {
    const store = memoryStore({ items: JSON.stringify([a]) });
    expect(openVersionedStore(store, collections).state).toBe('migrated');
    expect(JSON.parse(store.data.get('items') ?? '')).toEqual([a]);
    expect(store.data.get(SCHEMA_VERSION_KEY)).toBe('1');
  });

  it('is a no-op at the current version', () => {
    const raw = JSON.stringify([{ id: 'x' }]);
    const store = memoryStore({ items: raw, [SCHEMA_VERSION_KEY]: '1' });
    expect(openVersionedStore(store, collections)).toEqual({
      state: 'current',
      version: 1,
    });
    expect(store.data.get('items')).toBe(raw);
    expect(store.data.has('items.quarantine')).toBe(false);
  });

  it('runs only the steps after the stored version, in order', () => {
    const seen: string[] = [];
    const step =
      (name: string): MigrationStep =>
      (item) => {
        seen.push(name);
        return item;
      };
    const steps = [step('0to1'), step('1to2'), step('2to3')];
    const store = memoryStore({
      items: JSON.stringify([a]),
      [SCHEMA_VERSION_KEY]: '1',
    });
    openVersionedStore(store, collections, steps);
    expect(seen).toEqual(['1to2', '2to3']);
    expect(store.data.get(SCHEMA_VERSION_KEY)).toBe('3');
  });

  it('applies a transform and quarantines records it cannot migrate', () => {
    const rename: MigrationStep = (item) => {
      const parsed = z
        .object({ id: z.string(), name: z.string().optional() })
        .safeParse(item);
      if (!parsed.success) return item;
      return parsed.data.name === undefined
        ? { id: parsed.data.id }
        : { id: parsed.data.id, label: parsed.data.name };
    };
    const legacy = { id: 'b', name: 'B' };
    const broken = { id: 'c' };
    const store = memoryStore({ items: JSON.stringify([legacy, broken]) });
    openVersionedStore(store, collections, [rename]);
    expect(JSON.parse(store.data.get('items') ?? '')).toEqual([
      { id: 'b', label: 'B' },
    ]);
    expect(getQuarantined(store, 'items')).toEqual([JSON.stringify(broken)]);
  });

  it('quarantines a record when a step throws instead of losing it', () => {
    const boom: MigrationStep = () => {
      throw new Error('bad');
    };
    const store = memoryStore({ items: JSON.stringify([a]) });
    openVersionedStore(store, collections, [boom]);
    expect(store.data.get('items')).toBe('[]');
    expect(getQuarantined(store, 'items')).toEqual([JSON.stringify(a)]);
  });

  describe('future version', () => {
    const raw = JSON.stringify([{ id: 'z', layout: 'new' }]);

    it('leaves data and version untouched and drops later writes', () => {
      const store = memoryStore({ items: raw, [SCHEMA_VERSION_KEY]: '2' });
      expect(openVersionedStore(store, collections)).toEqual({
        state: 'future',
        version: '2',
      });
      writeCollection(store, 'items', itemSchema, [a]);
      expect(store.data.get('items')).toBe(raw);
      expect(store.data.get(SCHEMA_VERSION_KEY)).toBe('2');
      expect(store.data.has('items.quarantine')).toBe(false);
    });

    it('treats an unreadable version as unknown and protects the store', () => {
      const store = memoryStore({ items: raw, [SCHEMA_VERSION_KEY]: 'v2' });
      expect(openVersionedStore(store, collections).state).toBe('future');
      writeCollection(store, 'items', itemSchema, [a]);
      expect(store.data.get('items')).toBe(raw);
    });
  });
});

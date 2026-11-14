import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type {
  DorkroomSpotlightModule,
  NativeSpotlightItem,
} from '../../modules/dorkroom-shared';
import {
  appBuildIdentity,
  createSerialQueue,
  createSpotlight,
  createSpotlightRuntime,
  type IndexedStore,
  pruneSpotlightDomain,
  type Spotlight,
  spotlight,
  SPOTLIGHT_UNAVAILABLE,
  STARTUP_SYNC_DELAY_MS,
  syncSpotlightDomain,
} from './spotlight';
import { parseIndexedRecord, type SpotlightItem } from './spotlight-index';

/** An in-memory stand-in for the on-device index. */
function memoryModule(): DorkroomSpotlightModule & {
  items: Map<string, NativeSpotlightItem>;
} {
  const items = new Map<string, NativeSpotlightItem>();
  return {
    items,
    indexSpotlightItems: async (next) => {
      for (const item of next) items.set(item.id, item);
    },
    removeSpotlightItems: async (ids) => {
      for (const id of ids) items.delete(id);
    },
    removeSpotlightDomain: async (domain) => {
      for (const [id, item] of items) {
        if (item.domain === domain) items.delete(id);
      }
    },
    removeAllSpotlightItems: async () => {
      items.clear();
    },
  };
}

const rejecting: DorkroomSpotlightModule = {
  indexSpotlightItems: () => Promise.reject(new Error('refused')),
  removeSpotlightItems: () => Promise.reject(new Error('refused')),
  removeSpotlightDomain: () => Promise.reject(new Error('refused')),
  removeAllSpotlightItems: () => Promise.reject(new Error('refused')),
};

describe('createSpotlight', () => {
  it('passes calls through and resolves true', async () => {
    const native = memoryModule();
    const index = createSpotlight(native, () => {});
    expect(
      await index.index([
        {
          id: '/shoot/film-log/roll/a',
          domain: 'rolls',
          title: 'A',
          description: '',
          keywords: [],
        },
      ])
    ).toBe(true);
    expect([...native.items.keys()]).toEqual(['/shoot/film-log/roll/a']);
    expect(native.items.get('/shoot/film-log/roll/a')).toEqual({
      id: '/shoot/film-log/roll/a',
      domain: 'rolls',
      title: 'A',
      description: '',
      keywords: [],
    });
    expect(await index.removeDomain('rolls')).toBe(true);
    expect(native.items.size).toBe(0);
  });

  it('degrades to false with one warning when the module is missing', async () => {
    const warnings: string[] = [];
    const index = createSpotlight(null, (m) => warnings.push(m));
    expect(await index.index([])).toBe(false);
    expect(await index.remove(['x'])).toBe(false);
    expect(await index.removeAll()).toBe(false);
    expect(warnings).toEqual([SPOTLIGHT_UNAVAILABLE]);
  });

  it('degrades to false when a call is rejected', async () => {
    const warnings: string[] = [];
    const index = createSpotlight(rejecting, (m) => warnings.push(m));
    expect(await index.removeDomain('recipes')).toBe(false);
    expect(await index.removeDomain('recipes')).toBe(false);
    expect(warnings).toHaveLength(1);
  });

  it('is a no-op under vitest, where no native module exists', async () => {
    expect(await spotlight.removeAll()).toBe(false);
  });
});

const BUILD = '2026.7.3+12';

interface MemoryStore extends IndexedStore {
  raw: string | undefined;
  build: string | undefined;
}

/** A record store; by default its record was made under `BUILD` (null: none yet). */
function memoryStore(build: string | null = BUILD): MemoryStore {
  const store: MemoryStore = {
    raw: undefined,
    build: build ?? undefined,
    read: () => store.raw,
    write: (raw) => {
      store.raw = raw;
    },
    readBuild: () => store.build,
    writeBuild: (next) => {
      store.build = next;
    },
  };
  return store;
}

const roll = (id: string, title = id): SpotlightItem => ({
  id: `/shoot/film-log/roll/${id}`,
  domain: 'rolls',
  title,
  description: '',
  keywords: [],
});

interface SentLog {
  indexed: string[];
  removed: string[];
  cleared: number;
}

/** Counts what is sent, so a test can see that unchanged items are not. */
function countingSpotlight(native: DorkroomSpotlightModule) {
  const inner = createSpotlight(native, () => {});
  const sent: SentLog = { indexed: [], removed: [], cleared: 0 };
  const wrapped: Spotlight = {
    index: (items) => {
      sent.indexed.push(...items.map((i) => i.id));
      return inner.index(items);
    },
    remove: (ids) => {
      sent.removed.push(...ids);
      return inner.remove(ids);
    },
    removeDomain: (domain) => {
      sent.cleared += 1;
      return inner.removeDomain(domain);
    },
    removeAll: () => inner.removeAll(),
  };
  return { wrapped, sent };
}

describe('syncSpotlightDomain', () => {
  const NOW = 1_794_000_000_000;

  it('indexes, then sends only changes, and removes a deleted roll', async () => {
    const native = memoryModule();
    const store = memoryStore();
    const { wrapped, sent } = countingSpotlight(native);
    const sync = (desired: SpotlightItem[], now = NOW) =>
      syncSpotlightDomain({
        domain: 'rolls',
        desired,
        store,
        spotlight: wrapped,
        build: BUILD,
        now,
        clearWhenEmpty: true,
      });

    await sync([roll('a'), roll('b')]);
    expect([...native.items.keys()].sort()).toEqual([
      '/shoot/film-log/roll/a',
      '/shoot/film-log/roll/b',
    ]);
    expect(Object.keys(parseIndexedRecord(store.raw)).sort()).toEqual([
      '/shoot/film-log/roll/a',
      '/shoot/film-log/roll/b',
    ]);

    sent.indexed.length = 0;
    await sync([roll('a'), roll('b')], NOW + 1000);
    expect(sent.indexed).toEqual([]);

    // Renamed a, deleted b.
    await sync([roll('a', 'Renamed')], NOW + 2000);
    expect(sent.indexed).toEqual(['/shoot/film-log/roll/a']);
    expect(sent.removed).toEqual(['/shoot/film-log/roll/b']);
    expect(native.items.get('/shoot/film-log/roll/a')?.title).toBe('Renamed');
    expect(native.items.has('/shoot/film-log/roll/b')).toBe(false);

    // The film log emptied: the whole domain is cleared, record too.
    await sync([], NOW + 3000);
    expect(sent.cleared).toBe(1);
    expect(native.items.size).toBe(0);
    expect(store.raw).toBe('{}');
  });

  it('keeps the record when the index refuses, so the next sync retries', async () => {
    const store = memoryStore();
    const input = {
      domain: 'rolls' as const,
      desired: [roll('a')],
      store,
      build: BUILD,
      now: NOW,
      clearWhenEmpty: true,
    };
    await syncSpotlightDomain({
      ...input,
      spotlight: createSpotlight(null, () => {}),
    });
    expect(parseIndexedRecord(store.raw)).toEqual({});
    const native = memoryModule();
    await syncSpotlightDomain({
      ...input,
      spotlight: createSpotlight(native, () => {}),
    });
    expect(native.items.size).toBe(1);

    // A refused clear leaves the record as it was.
    const before = store.raw;
    await syncSpotlightDomain({
      ...input,
      desired: [],
      spotlight: createSpotlight(rejecting, () => {}),
    });
    expect(store.raw).toBe(before);
  });

  it('makes no native call to clear a domain with nothing recorded', async () => {
    const { wrapped, sent } = countingSpotlight(memoryModule());
    for (const raw of [undefined, '{}']) {
      const store = memoryStore();
      store.raw = raw;
      expect(
        await syncSpotlightDomain({
          domain: 'recipes',
          desired: [],
          store,
          spotlight: wrapped,
          build: BUILD,
          now: NOW,
          clearWhenEmpty: true,
        })
      ).toEqual({});
    }
    expect(sent.cleared).toBe(0);
  });

  it('under a new build, clears the domain once and sends everything again', async () => {
    const native = memoryModule();
    const store = memoryStore();
    const { wrapped, sent } = countingSpotlight(native);
    const sync = (build: string, spot: Spotlight = wrapped) =>
      syncSpotlightDomain({
        domain: 'rolls',
        desired: [roll('a')],
        store,
        spotlight: spot,
        build,
        now: NOW,
        clearWhenEmpty: true,
      });
    await sync(BUILD);
    expect(sent).toEqual({
      indexed: ['/shoot/film-log/roll/a'],
      removed: [],
      cleared: 0,
    });

    // The index was wiped behind the record's back (a restore, a reinstall).
    native.items.clear();
    await sync(BUILD);
    expect(native.items.size).toBe(0);

    // A refused clear keeps the old build, so the next sync tries again.
    await sync(
      '2026.8.1+13',
      createSpotlight(rejecting, () => {})
    );
    expect(store.build).toBe(BUILD);

    await sync('2026.8.1+13');
    expect(sent.cleared).toBe(1);
    expect(store.build).toBe('2026.8.1+13');
    expect(native.items.has('/shoot/film-log/roll/a')).toBe(true);

    // Same build again: nothing more.
    await sync('2026.8.1+13');
    expect(sent.cleared).toBe(1);
    expect(sent.indexed).toHaveLength(2);
  });

  it('treats a store with no build yet as a new build', async () => {
    const store = memoryStore(null);
    store.raw = JSON.stringify({
      '/shoot/film-log/roll/a': { hash: 'x', at: NOW },
    });
    const { wrapped, sent } = countingSpotlight(memoryModule());
    await syncSpotlightDomain({
      domain: 'rolls',
      desired: [roll('a')],
      store,
      spotlight: wrapped,
      build: BUILD,
      now: NOW,
      clearWhenEmpty: true,
    });
    expect(sent.cleared).toBe(1);
    expect(sent.indexed).toEqual(['/shoot/film-log/roll/a']);
    expect(store.build).toBe(BUILD);
  });
});

describe('pruneSpotlightDomain', () => {
  it('removes recorded ids not kept, and only under the current build', async () => {
    const native = memoryModule();
    const store = memoryStore();
    const index = createSpotlight(native, () => {});
    await syncSpotlightDomain({
      domain: 'rolls',
      desired: [roll('a'), roll('b')],
      store,
      spotlight: index,
      build: BUILD,
      now: 1,
      clearWhenEmpty: true,
    });
    const keep = new Set(['/shoot/film-log/roll/a']);
    await pruneSpotlightDomain({
      domain: 'rolls',
      keep,
      store,
      spotlight: index,
      build: 'other',
    });
    expect(native.items.size).toBe(2);
    await pruneSpotlightDomain({
      domain: 'rolls',
      keep,
      store,
      spotlight: index,
      build: BUILD,
    });
    expect([...native.items.keys()]).toEqual(['/shoot/film-log/roll/a']);
    expect(Object.keys(parseIndexedRecord(store.raw))).toEqual([
      '/shoot/film-log/roll/a',
    ]);
  });
});

describe('appBuildIdentity', () => {
  it('joins version and build, marking what is missing', () => {
    expect(appBuildIdentity('2026.7.3', '12')).toBe('2026.7.3+12');
    expect(appBuildIdentity(undefined, null)).toBe('?+?');
  });
});

describe('createSpotlightRuntime', () => {
  /** A scheduler whose timers run only when the test says so. */
  function manualScheduler() {
    const timers = new Map<number, { run: () => void; ms: number }>();
    let next = 0;
    return {
      timers,
      setTimeout: (run: () => void, ms: number) => {
        next += 1;
        timers.set(next, { run, ms });
        return next;
      },
      clearTimeout: (id: number) => {
        timers.delete(id);
      },
      runAll: () => {
        const due = [...timers.values()];
        timers.clear();
        for (const timer of due) timer.run();
      },
    };
  }
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('does nothing while the bundle loads, then syncs rolls after a delay', async () => {
    const native = memoryModule();
    const { wrapped, sent } = countingSpotlight(native);
    const scheduler = manualScheduler();
    let reads = 0;
    createSpotlightRuntime({
      spotlight: wrapped,
      storeFor: () => memoryStore(),
      build: BUILD,
      rollItems: () => {
        reads += 1;
        return [roll('a')];
      },
      onRollsChanged: () => {},
      scheduler,
      now: () => 1,
    });
    await settle();
    expect(reads).toBe(0);
    expect(sent.indexed).toEqual([]);
    expect([...scheduler.timers.values()].map((t) => t.ms)).toEqual([
      STARTUP_SYNC_DELAY_MS,
    ]);
    scheduler.runAll();
    await settle();
    expect(reads).toBe(1);
    expect(sent.indexed).toEqual(['/shoot/film-log/roll/a']);
  });

  it('holds recipe work and film log changes until the startup delay', async () => {
    const native = memoryModule();
    const { wrapped, sent } = countingSpotlight(native);
    const scheduler = manualScheduler();
    let changed = () => {};
    const runtime = createSpotlightRuntime({
      spotlight: wrapped,
      storeFor: () => memoryStore(),
      build: BUILD,
      rollItems: () => [roll('a')],
      onRollsChanged: (listener) => {
        changed = listener;
      },
      scheduler,
      now: () => 1,
    });
    const recipe: SpotlightItem = {
      id: '/develop/recipes/recipe/c1',
      domain: 'recipes',
      title: 'R',
      description: '',
      keywords: [],
    };
    runtime.syncRecipes([recipe]);
    changed();
    await settle();
    expect(sent).toEqual({ indexed: [], removed: [], cleared: 0 });
    scheduler.runAll();
    await settle();
    expect([...native.items.keys()].sort()).toEqual([
      '/develop/recipes/recipe/c1',
      '/shoot/film-log/roll/a',
    ]);
  });

  it('runs a film log change and the deferred start in the order asked', async () => {
    const native = memoryModule();
    const scheduler = manualScheduler();
    const stores = new Map([
      ['rolls', memoryStore()],
      ['recipes', memoryStore()],
    ]);
    let rolls = [roll('a')];
    let changed = () => {};
    const runtime = createSpotlightRuntime({
      spotlight: createSpotlight(native, () => {}),
      storeFor: (domain) => stores.get(domain) ?? memoryStore(),
      build: BUILD,
      rollItems: () => rolls,
      onRollsChanged: (listener) => {
        changed = listener;
      },
      scheduler,
      now: () => 1,
    });
    changed();
    rolls = [roll('b')];
    scheduler.runAll();
    await settle();
    expect([...native.items.keys()]).toEqual(['/shoot/film-log/roll/b']);

    const recipe: SpotlightItem = {
      id: '/develop/recipes/recipe/c1',
      domain: 'recipes',
      title: 'R',
      description: '',
      keywords: [],
    };
    runtime.syncRecipes([recipe]);
    runtime.pruneRecipes(new Set());
    await settle();
    expect(native.items.has(recipe.id)).toBe(false);
    expect(stores.get('recipes')?.raw).toBe('{}');
  });
});

describe('createSerialQueue', () => {
  it('runs tasks one after another, even after a failure', async () => {
    const order: string[] = [];
    const run = createSerialQueue();
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    run(async () => {
      await wait(10);
      order.push('first');
    });
    run(async () => {
      order.push('second');
      throw new Error('boom');
    });
    await new Promise<void>((resolve) => {
      run(async () => {
        order.push('third');
        resolve();
      });
    });
    expect(order).toEqual(['first', 'second', 'third']);
  });
});

describe('native registration', () => {
  const moduleDir = fileURLToPath(
    new URL('../../modules/dorkroom-shared/', import.meta.url)
  );
  const read = (...parts: string[]) =>
    readFileSync(join(moduleDir, ...parts), 'utf8');

  it('registers the module and the app-delegate subscriber in the one pod', () => {
    const config: unknown = JSON.parse(read('expo-module.config.json'));
    expect(config).toEqual({
      platforms: ['apple'],
      apple: {
        modules: ['DorkroomSharedModule', 'DorkroomSpotlightModule'],
        appDelegateSubscribers: ['DorkroomSpotlightAppDelegateSubscriber'],
      },
    });
    // Autolinking names the classes in ExpoModulesProvider.swift, so they are public.
    expect(read('ios', 'DorkroomSpotlightModule.swift')).toMatch(
      /public final class DorkroomSpotlightModule: Module[\s\S]*Name\("DorkroomSpotlight"\)/
    );
    expect(
      read('ios', 'DorkroomSpotlightAppDelegateSubscriber.swift')
    ).toContain(
      'public class DorkroomSpotlightAppDelegateSubscriber: ExpoAppDelegateSubscriber'
    );
    expect(read('index.ts')).toContain("'DorkroomSpotlight'");
  });

  it('opens only tapped items, leaving the query continuation to expo-router', () => {
    const swift = read('ios', 'DorkroomSpotlight.swift');
    expect(swift).toContain(
      'guard activity.activityType == CSSearchableItemActionType'
    );
    const code = (file: string) =>
      read('ios', file)
        .split('\n')
        .filter((line) => !line.trim().startsWith('//'))
        .join('\n');
    for (const file of [
      'DorkroomSpotlight.swift',
      'DorkroomSpotlightAppDelegateSubscriber.swift',
    ]) {
      expect(code(file), file).not.toContain('CSQueryContinuationActionType');
    }
  });
});

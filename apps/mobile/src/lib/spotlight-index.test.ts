import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  type Camera,
  type FilmRoll,
  type Lens,
  type Shot,
  shotSchema,
} from '@/schemas/film-log.schema';
import { combo, developer, film } from '@/test/fixtures';
import {
  MAX_SPOTLIGHT_RECIPES,
  parseIndexedRecord,
  planSpotlightSync,
  recipePaths,
  recipesNeedIndexing,
  recipeSpotlightItem,
  recipeSpotlightItems,
  recipeSyncAction,
  recordAfterSync,
  rollSpotlightItem,
  rollSpotlightItems,
  SPOTLIGHT_DOMAINS,
  SPOTLIGHT_PATH_PREFIXES,
  SPOTLIGHT_REFRESH_MS,
  type SpotlightItem,
  spotlightItemHash,
  spotlightPath,
} from './spotlight-index';

const MOBILE_ROOT = fileURLToPath(new URL('../..', import.meta.url));

function roll(over: Partial<FilmRoll> & { id: string }): FilmRoll {
  return {
    cameraId: 'cam1',
    process: 'bw',
    status: 'active',
    shots: [],
    startedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

const shot = (over: Partial<Shot> & { id: string }): Shot => ({
  frameNumber: 1,
  source: 'manual',
  ...over,
});

const CAMERAS: Camera[] = [
  { id: 'cam1', name: 'Nikon FM2', format: '35mm', createdAt: '' },
];
const LENSES: Lens[] = [
  { id: 'l1', name: 'Nikkor 50mm f/1.4', createdAt: '' },
  { id: 'l2', name: 'Nikkor 28mm f/2.8', createdAt: '' },
];

const CATALOG = {
  films: [film({ uuid: 'f1', slug: 'hp5', brand: 'Ilford', name: 'HP5 Plus' })],
  developers: [
    developer({
      uuid: 'd1',
      slug: 'ddx',
      manufacturer: 'Ilford',
      name: 'DD-X',
    }),
  ],
  combinations: [
    combo({
      uuid: 'c1',
      filmSlug: 'hp5',
      developerSlug: 'ddx',
      developerId: 'd1',
      customDilution: '1+4',
      shootingIso: 800,
      timeMinutes: 11,
      temperatureC: 20,
      temperatureF: 68,
    }),
  ],
};

describe('rollSpotlightItem', () => {
  it('titles a roll with its label and describes camera, EI, status and frames', () => {
    const item = rollSpotlightItem(
      roll({
        id: 'mfx1-abc',
        name: 'Summer',
        filmStockName: 'Ilford HP5 Plus',
        iso: 800,
        status: 'finished',
        shots: [
          shot({ id: 's1', lensId: 'l1' }),
          shot({ id: 's2', frameNumber: 2, lensId: 'l2' }),
          shot({ id: 's3', frameNumber: 3, lensId: 'l1' }),
        ],
      }),
      CAMERAS,
      LENSES
    );
    expect(item).toEqual({
      id: '/shoot/film-log/roll/mfx1-abc',
      domain: 'rolls',
      title: 'Summer',
      description: 'Nikon FM2 · EI 800 · Shot · 3 frames',
      keywords: [
        'Ilford HP5 Plus',
        'Nikon FM2',
        'Nikkor 50mm f/1.4',
        'Nikkor 28mm f/2.8',
      ],
    });
  });

  it('falls back to the film for the title and leaves out what is missing', () => {
    const item = rollSpotlightItem(
      roll({ id: 'r1', filmStockName: 'Kodak Tri-X', cameraId: 'gone' }),
      CAMERAS,
      LENSES
    );
    expect(item?.title).toBe('Kodak Tri-X');
    expect(item?.description).toBe('In camera · 0 frames');
    expect(item?.keywords).toEqual(['Kodak Tri-X']);
  });

  it('indexes no roll whose id cannot be an app path', () => {
    for (const id of ['', 'a/b', 'a?b', 'a b', '../x', 'x'.repeat(129)]) {
      expect(rollSpotlightItem(roll({ id }), CAMERAS, LENSES), id).toBeNull();
    }
    expect(
      rollSpotlightItems(
        [roll({ id: 'ok' }), roll({ id: 'not ok' })],
        CAMERAS,
        LENSES
      ).map((i) => i.id)
    ).toEqual(['/shoot/film-log/roll/ok']);
  });

  it('never puts a note, place or coordinate in any field', () => {
    const secretShot = shot({
      id: 's1',
      lensId: 'l1',
      notes: 'SECRET-SHOT-NOTE',
      place: 'SECRET-PLACE',
      location: {
        latitude: 51.50735,
        longitude: -0.12776,
        accuracyMeters: 4.75,
        altitudeMeters: 11.25,
        capturedAt: '2026-02-01T10:00:00.000Z',
      },
    });
    // The fixture is a real stored shot: its location survives the schema.
    expect(shotSchema.parse(secretShot).location?.latitude).toBe(51.50735);
    const secretRoll = Object.assign(
      roll({
        id: 'r1',
        name: 'Roll',
        notes: 'SECRET-ROLL-NOTE',
        status: 'developed',
        shots: [secretShot],
        development: {
          developedAt: '2026-02-01T00:00:00.000Z',
          notes: 'SECRET-DEV-NOTE',
        },
      }),
      { place: 'SECRET-ROLL-PLACE', latitude: 48.85837, longitude: 2.29448 }
    );
    const cameras: Camera[] = [{ ...CAMERAS[0], notes: 'SECRET-CAMERA-NOTE' }];
    const lenses: Lens[] = [{ ...LENSES[0], notes: 'SECRET-LENS-NOTE' }];
    const text = JSON.stringify(rollSpotlightItem(secretRoll, cameras, lenses));
    for (const secret of [
      'SECRET',
      '51.50735',
      '-0.12776',
      '4.75',
      '11.25',
      '2026-02-01T10',
      '48.85837',
      '2.29448',
    ]) {
      expect(text).not.toContain(secret);
    }
  });
});

describe('recipeSpotlightItem', () => {
  it('names the recipe as the development record does and describes it', () => {
    expect(recipeSpotlightItem('c1', CATALOG)).toEqual({
      id: '/develop/recipes/recipe/c1',
      domain: 'recipes',
      title: 'Ilford HP5 Plus in Ilford DD-X',
      description: '11m · 1+4 · EI 800 · 20°C',
      keywords: ['Ilford HP5 Plus', 'Ilford DD-X'],
    });
  });

  it('skips a recipe the catalog cannot name', () => {
    expect(recipeSpotlightItem('missing', CATALOG)).toBeNull();
    expect(
      recipeSpotlightItem('c1', { ...CATALOG, developers: [] })
    ).toBeNull();
    expect(recipeSpotlightItem('c1', { ...CATALOG, films: [] })).toBeNull();
    expect(recipeSpotlightItem('c1', {})).toBeNull();
  });

  it('never carries the recipe notes', () => {
    const catalog = {
      ...CATALOG,
      combinations: [
        { ...CATALOG.combinations[0], notes: 'SECRET-RECIPE-NOTE' },
      ],
    };
    expect(JSON.stringify(recipeSpotlightItem('c1', catalog))).not.toContain(
      'SECRET'
    );
  });

  it('keeps the given order, drops repeats and unknowns, and caps the list', () => {
    const many = Array.from({ length: MAX_SPOTLIGHT_RECIPES + 5 }, (_, i) =>
      combo({ uuid: `c${i}`, filmSlug: 'hp5', developerSlug: 'ddx' })
    );
    const catalog = { ...CATALOG, combinations: many };
    const ids = ['c3', 'c3', 'nope', ...many.map((c) => c.uuid)];
    const items = recipeSpotlightItems(ids, catalog);
    expect(items).toHaveLength(MAX_SPOTLIGHT_RECIPES);
    expect(items[0].id).toBe('/develop/recipes/recipe/c3');
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
});

const item = (id: string, title = id): SpotlightItem => ({
  id: `/shoot/film-log/roll/${id}`,
  domain: 'rolls',
  title,
  description: '',
  keywords: [],
});

describe('planSpotlightSync', () => {
  const NOW = 1_794_000_000_000;

  it('indexes everything the first time', () => {
    const desired = [item('a'), item('b')];
    expect(planSpotlightSync({ desired, indexed: {}, now: NOW })).toEqual({
      toIndex: desired,
      toRemove: [],
    });
  });

  it('sends only changed items and removes the ones no longer wanted', () => {
    const a = item('a');
    const b = item('b');
    const indexed = recordAfterSync(
      {},
      { indexedItems: [a, b, item('gone')], removedIds: [] },
      NOW
    );
    const renamed = item('b', 'B renamed');
    expect(
      planSpotlightSync({ desired: [a, renamed, item('c')], indexed, now: NOW })
    ).toEqual({
      toIndex: [renamed, item('c')],
      toRemove: ['/shoot/film-log/roll/gone'],
    });
  });

  it('sends nothing when nothing changed', () => {
    const desired = [item('a')];
    const indexed = recordAfterSync(
      {},
      { indexedItems: desired, removedIds: [] },
      NOW
    );
    expect(planSpotlightSync({ desired, indexed, now: NOW + 1000 })).toEqual({
      toIndex: [],
      toRemove: [],
    });
  });

  it('re-sends an unchanged item once it is old, or dated in the future', () => {
    const desired = [item('a')];
    const indexed = recordAfterSync(
      {},
      { indexedItems: desired, removedIds: [] },
      NOW
    );
    expect(
      planSpotlightSync({ desired, indexed, now: NOW + SPOTLIGHT_REFRESH_MS })
        .toIndex
    ).toEqual(desired);
    expect(
      planSpotlightSync({ desired, indexed, now: NOW - 60_000 }).toIndex
    ).toEqual(desired);
  });

  it('counts a repeated id once', () => {
    expect(
      planSpotlightSync({
        desired: [item('a'), item('a', 'other')],
        indexed: {},
        now: NOW,
      }).toIndex
    ).toEqual([item('a')]);
  });
});

describe('recordAfterSync and parseIndexedRecord', () => {
  it('records accepted items with their hash and drops removed ids', () => {
    const record = recordAfterSync(
      { x: { hash: 'h', at: 1 }, y: { hash: 'h', at: 1 } },
      { indexedItems: [item('a')], removedIds: ['x'] },
      5
    );
    expect(record).toEqual({
      y: { hash: 'h', at: 1 },
      '/shoot/film-log/roll/a': { hash: spotlightItemHash(item('a')), at: 5 },
    });
    expect(parseIndexedRecord(JSON.stringify(record))).toEqual(record);
  });

  it('reads anything malformed as not indexed, entry by entry', () => {
    expect(parseIndexedRecord(undefined)).toEqual({});
    expect(parseIndexedRecord('nope')).toEqual({});
    expect(parseIndexedRecord('[1]')).toEqual({});
    expect(
      parseIndexedRecord(
        JSON.stringify({ a: { hash: 'h', at: 1 }, b: { hash: 2 }, c: null })
      )
    ).toEqual({ a: { hash: 'h', at: 1 } });
  });

  it('hashes what an item shows, stably', () => {
    expect(spotlightItemHash(item('a'))).toBe(spotlightItemHash(item('a')));
    expect(spotlightItemHash(item('a'))).not.toBe(
      spotlightItemHash(item('a', 'other'))
    );
    expect(spotlightItemHash(item('a'))).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('Swift parity', () => {
  const swift = readFileSync(
    join(
      MOBILE_ROOT,
      'modules',
      'dorkroom-shared',
      'ios',
      'DorkroomSpotlight.swift'
    ),
    'utf8'
  );

  it('allows exactly the same path prefixes and domains', () => {
    const prefixes = swift
      .match(/static let pathPrefixes = \[([^\]]*)\]/)?.[1]
      .match(/"[^"]+"/g)
      ?.map((s) => s.slice(1, -1));
    expect(prefixes?.sort()).toEqual(
      Object.values(SPOTLIGHT_PATH_PREFIXES).sort()
    );
    const domains = swift
      .match(/static let domains: Set<String> = \[([^\]]*)\]/)?.[1]
      .match(/"[^"]+"/g)
      ?.map((s) => s.slice(1, -1));
    expect(domains?.sort()).toEqual(Object.values(SPOTLIGHT_DOMAINS).sort());
  });

  it('accepts the same id characters and length', () => {
    const chars = swift.match(/charactersIn: "([^"]+)"/)?.[1] ?? '';
    const max = Number(swift.match(/static let maxIdLength = (\d+)/)?.[1]);
    expect(max).toBe(128);
    // Every character Swift allows is one JS allows, and the reverse.
    for (let code = 32; code < 127; code += 1) {
      const c = String.fromCharCode(code);
      expect(spotlightPath('rolls', c) !== null, c).toBe(chars.includes(c));
    }
    expect(spotlightPath('rolls', 'x'.repeat(max))).not.toBeNull();
    expect(spotlightPath('rolls', 'x'.repeat(max + 1))).toBeNull();
  });
});

describe('recipesNeedIndexing', () => {
  const NOW = 1_794_000_000_000;
  const sentAt = (at: number, ...ids: string[]) =>
    Object.fromEntries(
      ids.map((id) => [`/develop/recipes/recipe/${id}`, { hash: 'h', at }])
    );

  it('wants the catalog only for a recipe missing from the record or due', () => {
    expect(recipesNeedIndexing(['c1'], {}, NOW)).toBe(true);
    expect(recipesNeedIndexing(['c1', 'c2'], sentAt(NOW, 'c1'), NOW)).toBe(
      true
    );
    expect(recipesNeedIndexing(['c1'], sentAt(NOW, 'c1', 'old'), NOW)).toBe(
      false
    );
    expect(
      recipesNeedIndexing(['c1'], sentAt(NOW - SPOTLIGHT_REFRESH_MS, 'c1'), NOW)
    ).toBe(true);
    expect(recipesNeedIndexing(['c1'], sentAt(NOW + 60_000, 'c1'), NOW)).toBe(
      true
    );
  });

  it('ignores ids that cannot be paths, and nothing recent needs nothing', () => {
    expect(recipesNeedIndexing([], {}, NOW)).toBe(false);
    expect(recipesNeedIndexing(['not a path'], {}, NOW)).toBe(false);
  });

  it('looks only at the recipes that would be indexed', () => {
    const ids = Array.from(
      { length: MAX_SPOTLIGHT_RECIPES + 1 },
      (_, i) => `c${i}`
    );
    const record = sentAt(NOW, ...ids.slice(0, MAX_SPOTLIGHT_RECIPES));
    expect(recipesNeedIndexing(ids, record, NOW)).toBe(false);
  });

  it('lists the recent recipes as paths', () => {
    expect([...recipePaths(['c1', 'bad id'])]).toEqual([
      '/develop/recipes/recipe/c1',
    ]);
  });
});

describe('recipeSyncAction', () => {
  it('clears the domain when there are no recent recipes, as before', () => {
    expect(recipeSyncAction([], true, CATALOG)).toEqual({ kind: 'clear' });
    expect(recipeSyncAction([], false, {})).toEqual({ kind: 'clear' });
  });

  it('only prunes when nothing needs the catalog', () => {
    expect(recipeSyncAction(['c1'], false, {})).toEqual({
      kind: 'prune',
      keep: new Set(['/develop/recipes/recipe/c1']),
    });
  });

  it('waits while the catalog loads, or when a list came back empty', () => {
    expect(recipeSyncAction(['c1'], true, {})).toEqual({ kind: 'wait' });
    for (const empty of [
      { ...CATALOG, combinations: [] },
      { ...CATALOG, films: [] },
      { ...CATALOG, developers: [] },
    ]) {
      expect(recipeSyncAction(['c1'], true, empty)).toEqual({ kind: 'wait' });
    }
  });

  it('sends the named recipes once the catalog has loaded', () => {
    const action = recipeSyncAction(['c1'], true, CATALOG);
    expect(action.kind).toBe('sync');
    expect(action.kind === 'sync' ? action.items.map((i) => i.id) : []).toEqual(
      ['/develop/recipes/recipe/c1']
    );
  });
});

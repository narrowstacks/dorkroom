import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { currentRouteLabel, redactAnalyticsUrl, referrerKind } from '../redact';
import {
  type AnalyticsEvents,
  capEventProperties,
  MAX_EVENT_PROPERTIES,
  TRACKED_ROUTES,
} from '../tracked-events';

/**
 * One representative payload per event.
 *
 * `satisfies` keeps each entry checked against its declared shape while leaving
 * the literal types intact, so adding an event without adding a sample here
 * fails to compile. That is the point: the assertions below run against what
 * actually ships, not against a restatement of the types.
 */
const SAMPLES = {
  share: { tool: 'border', method: 'clipboard' },
  share_opened: { tool: 'recipe' },
  recipe_saved: { action: 'created', source: 'manual' },
  recipe_deleted: { scope: 'single' },
  recipe_imported: { ok: true },
  favorite_toggled: { added: true },
  calculator_used: { tool: 'resize', mode: 'enlarger_height' },
  preset_applied: { tool: 'exposure', preset: 15 },
  theme_changed: { theme: 'darkroom' },
  units_changed: { context: 'measurement', unit: 'metric' },
  search_no_results: { tool: 'films', filters: 2 },
  detail_opened: { type: 'film' },
  home_search: { result: 'recipe', count: 4 },
  nav_search: { result: 'list', count: 7 },
  filter_applied: { tool: 'development', filter: 'dilution' },
  app_error: { route: '/border' },
  route_not_found: { referrer: 'external' },
} satisfies AnalyticsEvents;

describe('event catalog', () => {
  it('keeps every event within the Pro-plan property limit', () => {
    for (const [name, properties] of Object.entries(SAMPLES)) {
      expect(
        Object.keys(properties).length,
        `${name} exceeds the plan limit of ${MAX_EVENT_PROPERTIES}`
      ).toBeLessThanOrEqual(MAX_EVENT_PROPERTIES);
    }
  });
});

/**
 * Whether a property type lets arbitrary text through.
 *
 * `{} extends Record<S, 1>` holds only when `S` produces an index signature,
 * i.e. `string` itself or a template literal such as `` `${string}px` ``. A
 * finite union of literals produces required keys, which `{}` lacks. Numbers
 * and booleans are allowed outright: neither can carry something a user typed.
 */
type AdmitsFreeText<T> = [Extract<T, string>] extends [never]
  ? false
  : {} extends Record<Extract<T, string>, 1>
    ? true
    : false;

/** `event.property` for every property whose type admits free text. */
type FreeTextProperties = {
  [E in keyof AnalyticsEvents]: {
    [P in keyof AnalyticsEvents[E] & string]: AdmitsFreeText<
      AnalyticsEvents[E][P]
    > extends true
      ? `${E}.${P}`
      : never;
  }[keyof AnalyticsEvents[E] & string];
}[keyof AnalyticsEvents];

describe('event property types', () => {
  /**
   * CLAUDE.md's second rule for the catalog: closed unions and numbers only,
   * never free text. This is checked by the typechecker (`bun check` covers
   * test files), not at runtime; the `it` is only here so the assertion has a
   * name in the suite.
   *
   * `units_changed.unit` is a known violation, tracked as #438. It is listed
   * here so that nothing else can join it; fixing #438 turns this red until
   * the entry is deleted, which is the intent.
   */
  it('admits no free-text string property beyond the known #438 exception', () => {
    expectTypeOf<FreeTextProperties>().toEqualTypeOf<'units_changed.unit'>();
  });

  it('flags string and template-literal types but not closed unions', () => {
    expectTypeOf<AdmitsFreeText<string>>().toEqualTypeOf<true>();
    expectTypeOf<AdmitsFreeText<`${string}px`>>().toEqualTypeOf<true>();
    expectTypeOf<AdmitsFreeText<'a' | 'b' | null>>().toEqualTypeOf<false>();
    expectTypeOf<AdmitsFreeText<number>>().toEqualTypeOf<false>();
    expectTypeOf<AdmitsFreeText<boolean>>().toEqualTypeOf<false>();
  });
});

describe('capEventProperties', () => {
  it('drops surplus properties deterministically rather than at random', () => {
    expect(capEventProperties({ a: 1, b: 2, c: 3 })).toEqual({ a: 1, b: 2 });
  });

  it('keeps null and false, which are meaningful values', () => {
    expect(capEventProperties({ ok: false, missing: null })).toEqual({
      ok: false,
      missing: null,
    });
  });
});

describe('redactAnalyticsUrl', () => {
  it('strips a base64 border preset out of the URL', () => {
    const result = redactAnalyticsUrl({
      type: 'pageview',
      url: 'https://dorkroom.art/border?preset=eyJuYW1lIjoiOHgxMCJ9',
    });
    expect(result?.url).toBe('https://dorkroom.art/border');
  });

  it('strips a search query and the film being viewed', () => {
    const result = redactAnalyticsUrl({
      type: 'pageview',
      url: 'https://dorkroom.art/films?search=portra&film=kodak-portra-400',
    });
    expect(result?.url).toBe('https://dorkroom.art/films');
  });

  it('strips the hash as well as the query', () => {
    const result = redactAnalyticsUrl({
      type: 'event',
      url: 'https://dorkroom.art/border#preset=abc',
    });
    expect(result?.url).toBe('https://dorkroom.art/border');
  });

  it('preserves the event type', () => {
    const result = redactAnalyticsUrl({
      type: 'event',
      url: 'https://dorkroom.art/stops?x=1',
    });
    expect(result?.type).toBe('event');
  });

  it('drops the event rather than guessing at an unparseable URL', () => {
    expect(
      redactAnalyticsUrl({ type: 'pageview', url: 'not a url' })
    ).toBeNull();
  });
});

/**
 * The routes TanStack Router generated, read from the file rather than
 * imported: `routeTree.gen.ts` pulls in every page module, and this only needs
 * the list of paths.
 */
function generatedRoutes(): string[] {
  const generated = readFileSync(
    join(import.meta.dirname, '../../../../routeTree.gen.ts'),
    'utf8'
  );
  const paths = new Set<string>();
  for (const [, path] of generated.matchAll(/^\s+fullPath: '([^']+)'$/gm)) {
    paths.add(path);
  }
  // The wildcard is the thing TRACKED_ROUTES exists to guard against: it
  // matches any pathname, so it reports as `unknown` rather than as itself.
  paths.delete('/$');
  return Array.from(paths).sort();
}

describe('TRACKED_ROUTES', () => {
  it('matches the routes the router actually generated', () => {
    expect(Array.from(TRACKED_ROUTES).sort()).toEqual(generatedRoutes());
  });
});

describe('currentRouteLabel', () => {
  it('returns the route without the query', () => {
    window.history.replaceState({}, '', '/border?preset=secret');
    expect(currentRouteLabel()).toBe('/border');
  });

  it('ignores a trailing slash', () => {
    window.history.replaceState({}, '', '/films/');
    expect(currentRouteLabel()).toBe('/films');
  });

  it('reports the home route as itself, not as unknown', () => {
    window.history.replaceState({}, '', '/');
    expect(currentRouteLabel()).toBe('/');
  });

  it('refuses a user-controlled path from the wildcard route', () => {
    window.history.replaceState({}, '', '/person@example.com');
    expect(currentRouteLabel()).toBe('unknown');
  });

  it('does not leak a path that merely starts with a known route', () => {
    window.history.replaceState({}, '', '/films-of-jane@example.com');
    expect(currentRouteLabel()).toBe('unknown');
  });

  it('reports every tracked route as itself', () => {
    for (const route of TRACKED_ROUTES) {
      window.history.replaceState({}, '', route);
      expect(currentRouteLabel()).toBe(route);
    }
  });
});

describe('referrerKind', () => {
  const setReferrer = (value: string) => {
    Object.defineProperty(document, 'referrer', {
      value,
      configurable: true,
    });
  };

  it('reports direct when there is no referrer', () => {
    setReferrer('');
    expect(referrerKind()).toBe('direct');
  });

  it('reports internal for a same-origin referrer', () => {
    setReferrer(`${window.location.origin}/films`);
    expect(referrerKind()).toBe('internal');
  });

  it('reports external for another origin', () => {
    setReferrer('https://www.google.com/');
    expect(referrerKind()).toBe('external');
  });

  it('falls back to direct on a malformed referrer', () => {
    setReferrer('::::');
    expect(referrerKind()).toBe('direct');
  });
});

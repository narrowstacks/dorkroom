import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { redirectSystemPath } from '../../app/+native-intent';
import {
  APP_SCHEME,
  resolveIncomingLink,
  resolveLegacyPath,
  toolIdForPath,
} from './deep-link';

describe('resolveLegacyPath', () => {
  const cases: [string, string, string][] = [
    // [description, input, expected]
    ['More detail route, Shoot tool', '/more/meter', '/shoot/meter'],
    ['More detail route, Print tool', '/more/exposure', '/print/exposure'],
    [
      'More detail route, Develop tool',
      '/more/negative-inverter',
      '/develop/negative-inverter',
    ],
    [
      'More detail route keeps its query',
      '/more/border?paper=8x10',
      '/print/border?paper=8x10',
    ],
    ['More detail route keeps its hash', '/more/mat#top', '/print/mat#top'],
    [
      'More detail route keeps a sub-path',
      '/more/lens/x?a=1',
      '/shoot/lens/x?a=1',
    ],
    ['old tab root', '/exposure', '/print/exposure'],
    ['old tab root, hyphenated', '/camera-exposure', '/shoot/camera-exposure'],
    [
      'old tab root, hyphenated id',
      '/negative-inverter',
      '/develop/negative-inverter',
    ],
    ['old lenses route name', '/lenses', '/shoot/lens'],
    [
      'old lenses route with a Home prefill',
      '/lenses?focal=80&to=full-frame',
      '/shoot/lens?focal=80&to=full-frame',
    ],
    ['old tab root without a leading slash', 'meter', '/shoot/meter'],
    ['old tab root with a trailing slash', '/border/', '/print/border'],
    ['Film Log root', '/film-log', '/shoot/film-log'],
    ['Film Log sub-path', '/film-log/roll/abc', '/shoot/film-log/roll/abc'],
    [
      'Film Log with a query',
      '/film-log/shot?rollId=1&shotId=2',
      '/shoot/film-log/shot?rollId=1&shotId=2',
    ],
    ['Recipes root', '/development', '/develop/recipes'],
    [
      'Recipes query',
      '/development?film=hp5-plus&at=9',
      '/develop/recipes?film=hp5-plus&at=9',
    ],
    ['recipe detail', '/development/recipe/abc', '/develop/recipes/recipe/abc'],
    ['Process Timer', '/development/timer', '/develop/recipes/timer'],
    [
      'Process Timer as a More detail route',
      '/more/timer',
      '/develop/recipes/timer',
    ],
    ['Process Timer as a pinned tab root', '/timer', '/develop/recipes/timer'],
    [
      'Process Timer tab root keeps its query',
      '/timer?x=1',
      '/develop/recipes/timer?x=1',
    ],
    ['More settings', '/more/settings', '/shoot/settings'],
    ['More settings with a query', '/more/settings?x=1', '/shoot/settings?x=1'],
    ['old Settings tab root', '/settings', '/shoot/settings'],
    ['More list', '/more', '/'],
    ['More list with a trailing slash', '/more/', '/'],
    ['pin editor', '/more/edit', '/'],
  ];
  it.each(cases)('%s: %s', (_what, input, expected) => {
    expect(resolveLegacyPath(input)).toBe(expected);
  });

  const unchanged = [
    '/',
    '/?x=1',
    '/shoot',
    '/shoot/meter',
    '/print/exposure?stops=1',
    '/develop/recipes',
    '/develop/recipes/timer',
    '/shoot/film-log/roll/abc',
    '/shoot/settings',
    '/print/settings',
    '/does-not-exist',
    '/more/does-not-exist',
    '/recipes',
    '',
  ];
  it.each(unchanged)('passes %j through unchanged', (path) => {
    expect(resolveLegacyPath(path)).toBe(path);
  });

  it('is idempotent: a resolved path resolves to itself', () => {
    for (const [, input] of cases) {
      const once = resolveLegacyPath(input);
      expect(resolveLegacyPath(once)).toBe(once);
    }
  });
});

describe('toolIdForPath', () => {
  const named: [string, string][] = [
    ['/shoot/meter', 'meter'],
    ['/print/border?paper=8x10', 'border'],
    ['/shoot/lens', 'lens'],
    ['/develop/negative-inverter', 'negative-inverter'],
    ['/shoot/film-log', 'film-log'],
    ['/shoot/film-log/roll/abc', 'film-log'],
    ['/develop/recipes', 'recipes'],
    ['/develop/recipes/recipe/abc', 'recipes'],
    ['/develop/recipes/timer', 'timer'],
    // Legacy paths still name their tool.
    ['/lenses', 'lens'],
    ['/more/reciprocity', 'reciprocity'],
    ['/film-log/roll/abc', 'film-log'],
    ['/development/recipe/abc', 'recipes'],
    ['/development/timer', 'timer'],
    ['/more/timer', 'timer'],
    ['/timer', 'timer'],
  ];
  it.each(named)('%s belongs to %s', (path, id) => {
    expect(toolIdForPath(path)).toBe(id);
  });

  const none = [
    '/',
    '/shoot',
    '/develop',
    '/print',
    '/settings',
    '/shoot/settings',
    '/more',
    '/more/edit',
    '/nope',
    // Another phase's tool is not found, so it is no tool's use.
    '/print/meter',
    '/shoot/recipes',
    '/shoot/timer',
  ];
  it.each(none)('%s belongs to no tool', (path) => {
    expect(toolIdForPath(path)).toBeUndefined();
  });
});

describe('resolveIncomingLink', () => {
  const links: [string, string][] = [
    // App Intents and Siri open the bare host form.
    ['dorkroom://meter', '/shoot/meter'],
    ['dorkroom://negative-inverter', '/develop/negative-inverter'],
    ['dorkroom://border', '/print/border'],
    ['dorkroom://lenses', '/shoot/lens'],
    ['dorkroom://more/meter', '/shoot/meter'],
    ['dorkroom:///more/meter', '/shoot/meter'],
    ['dorkroom://exposure?stops=1#x', '/print/exposure?stops=1#x'],
    ['dorkroom://film-log/roll/abc', '/shoot/film-log/roll/abc'],
    ['dorkroom://development/recipe/x', '/develop/recipes/recipe/x'],
    ['dorkroom://development', '/develop/recipes'],
    ['dorkroom://timer', '/develop/recipes/timer'],
    ['dorkroom://more/timer', '/develop/recipes/timer'],
    ['dorkroom://settings', '/shoot/settings'],
    ['dorkroom://more', '/'],
    ['DORKROOM://meter', '/shoot/meter'],
    ['dorkroom://Meter', '/shoot/meter'],
    ['dorkroom://More/Meter?x=1', '/shoot/meter?x=1'],
    ['dorkroom://Lenses', '/shoot/lens'],
    // Only the host folds; ids after it keep their case.
    ['dorkroom://Shoot/meter', '/shoot/meter'],
    ['dorkroom://Develop/recipes/recipe/AbC', '/develop/recipes/recipe/AbC'],
    // A bare path still resolves.
    ['/more/meter', '/shoot/meter'],
  ];
  it.each(links)('%s -> %s', (input, expected) => {
    expect(resolveIncomingLink(input)).toBe(expected);
  });

  const untouched = [
    'dorkroom://',
    'dorkroom://shoot/meter',
    'dorkroom://print/exposure?stops=1',
    'dorkroom://nowhere',
    'https://dorkroom.art/meter',
    'https://dorkroom.art/more/meter',
    'exp+dorkroom://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081',
    'exp://192.168.1.2:8081/--/meter',
    'otherapp://meter',
    '/shoot/meter',
    '/',
    '',
  ];
  it.each(untouched)('passes %j through unchanged', (input) => {
    expect(resolveIncomingLink(input)).toBe(input);
  });
});

describe('redirectSystemPath', () => {
  // expo-router calls it with the full URL, cold (initial) and warm.
  for (const initial of [true, false]) {
    const when = initial ? 'cold' : 'warm';
    it(`rewrites dorkroom:// links, ${when}`, () => {
      const go = (path: string) => redirectSystemPath({ path, initial });
      expect(go('dorkroom://meter')).toBe('/shoot/meter');
      expect(go('dorkroom://more/meter')).toBe('/shoot/meter');
      expect(go('dorkroom://development/recipe/x')).toBe(
        '/develop/recipes/recipe/x'
      );
      expect(go('dorkroom://print/exposure')).toBe('dorkroom://print/exposure');
      expect(go('https://example.com/meter')).toBe('https://example.com/meter');
    });
  }
});

describe('APP_SCHEME', () => {
  it('matches the scheme in app.json', () => {
    const config: { expo: { scheme: string } } = JSON.parse(
      readFileSync(
        join(fileURLToPath(new URL('../..', import.meta.url)), 'app.json'),
        'utf8'
      )
    );
    expect(config.expo.scheme).toBe(APP_SCHEME);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { redirectSystemPath } from '../../app/+native-intent';
import {
  APP_SCHEME,
  logFrameTarget,
  resolveIncomingLink,
  resolveLegacyPath,
  resolveLogFrameLink,
  resolveMissingRollLink,
  splitSearchLink,
  stampTimerLink,
  toolIdForPath,
} from './deep-link';
import { setRolls } from './film-log-storage';
import {
  getSearchLinkSnapshot,
  resetSearchLinks,
} from './home/search-link-store';
import {
  clearPendingLink,
  setCurrentPath,
  takePendingLink,
} from './link-handoff';

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
    ['More settings', '/more/settings', '/settings'],
    ['More settings with a query', '/more/settings?x=1', '/settings?x=1'],
    ['old Settings tab root', '/settings', '/settings'],
    ['Settings with a trailing slash', '/settings/', '/settings'],
    ['retired Shoot Settings', '/shoot/settings', '/settings'],
    ['retired Develop Settings', '/develop/settings', '/settings'],
    ['retired Print Settings', '/print/settings', '/settings'],
    ['retired Settings with a query', '/print/settings?x=1', '/settings?x=1'],
    ['More list', '/more', '/'],
    ['More list with a trailing slash', '/more/', '/'],
    ['pin editor', '/more/edit', '/'],
    ['Search without a query', '/search', '/'],
    ['Search with a trailing slash', '/search/', '/'],
    ['Search with a query', '/search?q=hp5', '/?q=hp5'],
    [
      'Search with an encoded query',
      '/search?q=hp5%20at%20800%20in%20dd-x',
      '/?q=hp5%20at%20800%20in%20dd-x',
    ],
    [
      'Search with a plus and an ampersand escaped',
      '/search?q=a%2Bb%26c',
      '/?q=a%2Bb%26c',
    ],
    ['Search with an empty query', '/search?q=', '/?q='],
    [
      'Search keeps extra params',
      '/search?q=hp5&ref=spotlight',
      '/?q=hp5&ref=spotlight',
    ],
    ['Search with a trailing slash and a query', '/search/?q=hp5', '/?q=hp5'],
    ['Search without a leading slash', 'search?q=hp5', '/?q=hp5'],
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
    '/settings',
    '/does-not-exist',
    '/search/anything',
    '/searching?q=x',
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
    '/develop/settings',
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
    ['dorkroom://search', '/'],
    ['dorkroom://search/', '/'],
    ['dorkroom://search?q=hp5%20at%20800', '/?q=hp5%20at%20800'],
    ['dorkroom:///search?q=hp5', '/?q=hp5'],
    ['dorkroom://Search?q=HP5', '/?q=HP5'],
    ['dorkroom://search?q=hp5&ref=spotlight', '/?q=hp5&ref=spotlight'],
    ['dorkroom://search?q=', '/?q='],
    ['dorkroom:///more/meter', '/shoot/meter'],
    ['dorkroom://exposure?stops=1#x', '/print/exposure?stops=1#x'],
    ['dorkroom://film-log/roll/abc', '/shoot/film-log/roll/abc'],
    ['dorkroom://development/recipe/x', '/develop/recipes/recipe/x'],
    ['dorkroom://development', '/develop/recipes'],
    ['dorkroom://timer', '/develop/recipes/timer'],
    ['dorkroom://more/timer', '/develop/recipes/timer'],
    ['dorkroom://settings/', '/settings'],
    ['dorkroom://shoot/settings', '/settings'],
    ['dorkroom://more/settings', '/settings'],
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
    // Already canonical: expo-router opens it as is.
    'dorkroom://settings',
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
  beforeEach(() => {
    clearPendingLink();
    setCurrentPath('/');
  });

  // expo-router calls it with the full URL, cold (initial) and warm.
  it('rewrites dorkroom:// links, cold', () => {
    const go = (path: string) => redirectSystemPath({ path, initial: true });
    expect(go('dorkroom://meter')).toBe('/shoot/meter');
    expect(go('dorkroom://more/meter')).toBe('/shoot/meter');
    expect(go('dorkroom://development/recipe/x')).toBe(
      '/develop/recipes/recipe/x'
    );
    expect(go('dorkroom://print/exposure')).toBe('dorkroom://print/exposure');
    expect(go('https://example.com/meter')).toBe('https://example.com/meter');
    expect(takePendingLink()).toBeNull();
  });

  // A warm link selects the phase hub and leaves the target for the handoff.
  it('sends a warm phase link to its hub and keeps the target pending', () => {
    const go = (path: string) => redirectSystemPath({ path, initial: false });
    for (const [url, hub, target] of [
      ['dorkroom://meter', '/shoot', '/shoot/meter'],
      ['dorkroom://more/meter', '/shoot', '/shoot/meter'],
      [
        'dorkroom://development/recipe/x',
        '/develop',
        '/develop/recipes/recipe/x',
      ],
      ['dorkroom://print/exposure', '/print', '/print/exposure'],
    ]) {
      expect(go(url), url).toBe(hub);
      expect(takePendingLink(), url).toBe(target);
    }
  });

  it('keeps the query and hash on a handed-over target', () => {
    const go = (path: string) => redirectSystemPath({ path, initial: false });
    expect(go('dorkroom://shoot/film-log?roll=7#top')).toBe('/shoot');
    expect(takePendingLink()).toBe('/shoot/film-log?roll=7#top');
    expect(go('dorkroom://development/recipe/x?a=1')).toBe('/develop');
    expect(takePendingLink()).toBe('/develop/recipes/recipe/x?a=1');
  });

  it('folds the case of a warm link that only needed that', () => {
    const go = (path: string) => redirectSystemPath({ path, initial: false });
    expect(go('dorkroom://Shoot/meter')).toBe('/shoot');
    expect(takePendingLink()).toBe('/shoot/meter');
  });

  it('never hands over a protocol-relative target', () => {
    const go = (path: string) => redirectSystemPath({ path, initial: false });
    expect(go('dorkroom:///shoot/meter')).toBe('/shoot');
    expect(takePendingLink()).toBe('/shoot/meter');
  });

  it('navigates a warm link into the tab on screen directly', () => {
    const go = (path: string) => redirectSystemPath({ path, initial: false });
    setCurrentPath('/shoot/film-log/shot');
    expect(go('dorkroom://meter')).toBe('/shoot/meter');
    expect(go('dorkroom://shoot/film-log')).toBe('dorkroom://shoot/film-log');
    expect(takePendingLink()).toBeNull();
    // From another phase it still goes through the hub.
    setCurrentPath('/print/mat');
    expect(go('dorkroom://meter')).toBe('/shoot');
    expect(takePendingLink()).toBe('/shoot/meter');
  });

  it('opens a search link as plain Home, cold and warm, without a handoff', () => {
    const url = 'dorkroom://search?q=hp5%20at%20800%20in%20dd-x';
    expect(redirectSystemPath({ path: url, initial: true })).toBe('/');
    for (const current of [
      null,
      '/',
      '/shoot/meter',
      '/develop/recipes',
      '/print',
    ]) {
      setCurrentPath(current);
      expect(
        redirectSystemPath({ path: url, initial: false }),
        String(current)
      ).toBe('/');
      expect(takePendingLink(), String(current)).toBeNull();
    }
  });

  it('leaves a warm link outside a phase alone', () => {
    const go = (path: string) => redirectSystemPath({ path, initial: false });
    expect(go('https://example.com/meter')).toBe('https://example.com/meter');
    expect(go('dorkroom://')).toBe('dorkroom://');
    expect(takePendingLink()).toBeNull();
  });
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

describe('stampTimerLink', () => {
  const NOW = 1_794_000_000_000;
  const TIMER = '/develop/recipes/timer';

  it('stamps an app-scheme timer link that has an exposure and no at', () => {
    expect(
      stampTimerLink(`dorkroom://develop/recipes/timer?exposure=60`, NOW)
    ).toBe(`dorkroom://develop/recipes/timer?exposure=60&at=${NOW}`);
  });

  it('stamps a bare path, keeping other params and the hash', () => {
    expect(stampTimerLink(`${TIMER}?exposure=60&label=X`, NOW)).toBe(
      `${TIMER}?exposure=60&label=X&at=${NOW}`
    );
    expect(stampTimerLink(`${TIMER}?exposure=60#top`, NOW)).toBe(
      `${TIMER}?exposure=60&at=${NOW}#top`
    );
  });

  it('stamps the legacy timer path once it is resolved', () => {
    expect(
      stampTimerLink(resolveIncomingLink('dorkroom://timer?exposure=9'), NOW)
    ).toBe(`${TIMER}?exposure=9&at=${NOW}`);
  });

  it('each opening gets its own time, so the same URL twice is two openings', () => {
    const url = `dorkroom://develop/recipes/timer?exposure=60`;
    expect(stampTimerLink(url, NOW)).not.toBe(stampTimerLink(url, NOW + 5));
  });

  it('leaves a link that already has an at, or no exposure, alone', () => {
    const withAt = `${TIMER}?exposure=60&at=5`;
    expect(stampTimerLink(withAt, NOW)).toBe(withAt);
    expect(stampTimerLink(TIMER, NOW)).toBe(TIMER);
    expect(stampTimerLink(`${TIMER}?label=X`, NOW)).toBe(`${TIMER}?label=X`);
  });

  it('leaves other routes and other schemes alone', () => {
    expect(stampTimerLink('/print/exposure?exposure=60', NOW)).toBe(
      '/print/exposure?exposure=60'
    );
    expect(
      stampTimerLink('https://x.test/develop/recipes/timer?exposure=60', NOW)
    ).toBe('https://x.test/develop/recipes/timer?exposure=60');
  });

  it('is applied by the incoming-link hook', () => {
    const out = redirectSystemPath({
      path: 'dorkroom://develop/recipes/timer?exposure=60',
      initial: true,
    });
    expect(out).toMatch(
      /^dorkroom:\/\/develop\/recipes\/timer\?exposure=60&at=\d+$/
    );
  });
});

describe('splitSearchLink', () => {
  const cases: [string, string, string | null][] = [
    ['/?q=hp5', '/', 'hp5'],
    ['/?q=hp5%20at%20800', '/', 'hp5 at 800'],
    ['/?q=hp5+at+800', '/', 'hp5 at 800'],
    ['/?q=a%2Bb%26c', '/', 'a+b&c'],
    ['/?q=', '/', ''],
    ['/?q', '/', ''],
    ['/?q=hp5&ref=spotlight', '/?ref=spotlight', 'hp5'],
    ['/?ref=spotlight&q=hp5', '/?ref=spotlight', 'hp5'],
    ['/?q=hp5&q=fp4', '/', 'hp5'],
    ['/?q=hp5#top', '/#top', 'hp5'],
    ['/?q=hp5&ref=x#top', '/?ref=x#top', 'hp5'],
    ['/?q=%E0%A4%A', '/', '%E0%A4%A'],
    ['/', '/', null],
    ['/?ref=x', '/?ref=x', null],
    ['/?qq=hp5', '/?qq=hp5', null],
    ['/settings?q=hp5', '/settings?q=hp5', null],
    ['/shoot/meter?q=1', '/shoot/meter?q=1', null],
    ['', '', null],
  ];
  it.each(cases)('%s', (input, path, query) => {
    expect(splitSearchLink(input)).toEqual({ path, query });
  });
});

describe('redirectSystemPath search links', () => {
  const go = (path: string, initial: boolean) =>
    redirectSystemPath({ path, initial });
  beforeEach(() => {
    resetSearchLinks();
    clearPendingLink();
    setCurrentPath('/');
  });

  it('records an event and opens Home without q, cold and warm', () => {
    for (const initial of [true, false]) {
      resetSearchLinks();
      expect(go('dorkroom://search?q=hp5%20at%20800', initial)).toBe('/');
      expect(getSearchLinkSnapshot()).toMatchObject({
        query: 'hp5 at 800',
        seq: 1,
      });
    }
  });

  it('keeps other params', () => {
    expect(go('dorkroom://search?q=hp5&ref=spotlight', false)).toBe(
      '/?ref=spotlight'
    );
    expect(go('dorkroom://search?q=hp5&ref=spotlight', true)).toBe(
      '/?ref=spotlight'
    );
  });

  it('records a repeated cold call once (expo-router can re-run it on a re-render)', () => {
    const url = 'dorkroom://search?q=hp5';
    expect(go(url, true)).toBe('/');
    expect(go(url, true)).toBe('/');
    expect(getSearchLinkSnapshot().seq).toBe(1);
    // A warm link is a new event, whatever came before.
    go(url, false);
    expect(getSearchLinkSnapshot().seq).toBe(2);
  });

  it('records the same query twice as two events', () => {
    go('dorkroom://search?q=fp4', false);
    go('dorkroom://search?q=fp4', false);
    expect(getSearchLinkSnapshot().seq).toBe(2);
  });

  it('opens Home and records no event for an empty query, or none', () => {
    expect(go('dorkroom://search?q=', false)).toBe('/');
    expect(go('dorkroom://search', false)).toBe('/');
    expect(go('dorkroom://search?q=%20%20', true)).toBe('/');
    expect(getSearchLinkSnapshot().seq).toBe(0);
  });

  it('opens Home from Settings, another tab, or anywhere, with no dismissal', () => {
    for (const current of ['/settings', '/', '/shoot/meter', '/print', null]) {
      setCurrentPath(current);
      expect(go('dorkroom://search?q=hp5', false), String(current)).toBe('/');
    }
    expect(getSearchLinkSnapshot().seq).toBe(5);
  });

  it('records nothing for any other link', () => {
    setCurrentPath('/settings');
    for (const url of [
      'dorkroom://settings',
      'dorkroom://reciprocity',
      'dorkroom://more',
      'dorkroom://shoot/meter?q=1',
      'https://example.com/?q=hp5',
      'exp+dorkroom://search?q=hp5',
    ]) {
      go(url, false);
      go(url, true);
    }
    expect(getSearchLinkSnapshot().seq).toBe(0);
  });
});

describe('stampTimerLink with start=last', () => {
  const NOW = 1_794_000_000_000;

  it('stamps a start link with no at, like an exposure link', () => {
    expect(
      stampTimerLink('dorkroom://develop/recipes/timer?start=last', NOW)
    ).toBe(`dorkroom://develop/recipes/timer?start=last&at=${NOW}`);
    expect(stampTimerLink('/develop/recipes/timer?start=last', NOW)).toBe(
      `/develop/recipes/timer?start=last&at=${NOW}`
    );
  });

  it('leaves a start link that already has an at alone', () => {
    const link = '/develop/recipes/timer?start=last&at=5';
    expect(stampTimerLink(link, NOW)).toBe(link);
  });

  it('ignores start on any other path', () => {
    expect(stampTimerLink('/shoot/meter?start=last', NOW)).toBe(
      '/shoot/meter?start=last'
    );
  });
});

describe('logFrameTarget', () => {
  it('opens the add-shot form for the meter roll', () => {
    expect(logFrameTarget('r1')).toBe('/shoot/film-log/shot?rollId=r1');
    expect(logFrameTarget('a b')).toBe('/shoot/film-log/shot?rollId=a%20b');
  });

  it('opens the film log list when no roll is active', () => {
    expect(logFrameTarget(undefined)).toBe('/shoot/film-log');
  });
});

describe('resolveLogFrameLink', () => {
  const roll = () => 'r1';

  it('resolves the app-scheme URL and the bare path, any case or query', () => {
    for (const link of [
      'dorkroom://log-frame',
      'dorkroom://log-frame/',
      'DORKROOM://Log-Frame?x=1',
      '/log-frame',
    ]) {
      expect(resolveLogFrameLink(link, roll), link).toBe(
        '/shoot/film-log/shot?rollId=r1'
      );
    }
  });

  it('asks for the roll only for this link', () => {
    let asked = 0;
    const counting = () => {
      asked += 1;
      return 'r1';
    };
    expect(resolveLogFrameLink('dorkroom://meter', counting)).toBe(
      'dorkroom://meter'
    );
    expect(resolveLogFrameLink('https://x.test/log-frame', counting)).toBe(
      'https://x.test/log-frame'
    );
    expect(resolveLogFrameLink('/log-frame/more', counting)).toBe(
      '/log-frame/more'
    );
    expect(asked).toBe(0);
  });

  it('lands on the film log list when the roll cannot be read', () => {
    expect(
      resolveLogFrameLink('dorkroom://log-frame', () => {
        throw new Error('bad film log storage');
      })
    ).toBe('/shoot/film-log');
  });

  it('lands on the film log list with no active roll', () => {
    expect(resolveLogFrameLink('dorkroom://log-frame', () => undefined)).toBe(
      '/shoot/film-log'
    );
  });
});

describe('resolveMissingRollLink', () => {
  const exists = (id: string) => id === 'r1';

  it('keeps a link to a roll that exists', () => {
    for (const link of [
      'dorkroom://shoot/film-log/roll/r1',
      '/shoot/film-log/roll/r1',
      '/shoot/film-log/roll/r1?x=1',
    ]) {
      expect(resolveMissingRollLink(link, exists), link).toBe(link);
    }
  });

  it('sends a link to a deleted roll to the film log list', () => {
    for (const link of [
      'dorkroom://shoot/film-log/roll/gone',
      '/shoot/film-log/roll/gone',
      '/shoot/film-log/roll/gone/',
      'dorkroom://Shoot/Film-Log/Roll/gone',
    ]) {
      expect(resolveMissingRollLink(link, exists), link).toBe(
        '/shoot/film-log'
      );
    }
  });

  it('decodes the id, and lands on the list when the lookup throws', () => {
    expect(
      resolveMissingRollLink('/shoot/film-log/roll/a%20b', (id) => id === 'a b')
    ).toBe('/shoot/film-log/roll/a%20b');
    expect(
      resolveMissingRollLink('/shoot/film-log/roll/r1', () => {
        throw new Error('unreadable');
      })
    ).toBe('/shoot/film-log');
  });

  it('leaves every other link alone', () => {
    for (const link of [
      'dorkroom://shoot/film-log',
      '/shoot/film-log/roll',
      '/shoot/film-log/roll/r1/extra',
      '/shoot/film-log/shot?rollId=gone',
      'https://example.com/shoot/film-log/roll/gone',
    ]) {
      expect(
        resolveMissingRollLink(link, () => false),
        link
      ).toBe(link);
    }
  });
});

// A tapped Spotlight result opens `dorkroom:/<id>`, its id being the app path
// (`DorkroomSpotlightAppDelegateSubscriber`).
describe('Spotlight result links', () => {
  const go = (path: string, initial: boolean) =>
    redirectSystemPath({ path, initial });
  const stripScheme = (link: string) => link.replace(/^dorkroom:\//, '');
  const ROLL = {
    id: 'mfx1-abc',
    cameraId: 'cam1',
    process: 'bw' as const,
    status: 'active' as const,
    shots: [],
    startedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    clearPendingLink();
    setCurrentPath('/');
    setRolls([ROLL]);
  });
  afterEach(() => {
    setRolls([]);
  });

  it('opens a roll, cold and warm through the Shoot hub', () => {
    const url = 'dorkroom://shoot/film-log/roll/mfx1-abc';
    expect(stripScheme(go(url, true))).toBe('/shoot/film-log/roll/mfx1-abc');
    expect(takePendingLink()).toBeNull();
    expect(go(url, false)).toBe('/shoot');
    expect(takePendingLink()).toBe('/shoot/film-log/roll/mfx1-abc');
  });

  it('opens a recipe, cold and warm through the Develop hub', () => {
    const url = 'dorkroom://develop/recipes/recipe/0b7c-uuid';
    expect(stripScheme(go(url, true))).toBe(
      '/develop/recipes/recipe/0b7c-uuid'
    );
    expect(go(url, false)).toBe('/develop');
    expect(takePendingLink()).toBe('/develop/recipes/recipe/0b7c-uuid');
  });

  it('opens the film log for a roll that was deleted, cold and warm', () => {
    const url = 'dorkroom://shoot/film-log/roll/deleted';
    expect(go(url, true)).toBe('/shoot/film-log');
    expect(go(url, false)).toBe('/shoot');
    expect(takePendingLink()).toBe('/shoot/film-log');
  });

  it('opens the film log list from the Shoot tab directly', () => {
    setCurrentPath('/shoot/film-log/roll/mfx1-abc');
    expect(go('dorkroom://shoot/film-log/roll/deleted', false)).toBe(
      '/shoot/film-log'
    );
    expect(takePendingLink()).toBeNull();
  });
});

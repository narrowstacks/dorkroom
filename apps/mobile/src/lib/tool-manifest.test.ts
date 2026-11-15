import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { redirectSystemPath } from '../../app/+native-intent';
import { resolveLegacyPath, toolIdForPath } from './deep-link';
import {
  getSearchLinkSnapshot,
  resetSearchLinks,
} from './home/search-link-store';
import { takePendingLink } from './link-handoff';
import {
  FAVORITES_ROUTE,
  PHASES,
  recordsLastResult,
  SETTINGS_ROUTE,
  TOOLS,
} from './tools';

// Parity and pin tests for the iOS tool manifest (#455). `TOOLS` in
// `tools.ts` is the source of truth; the phase layouts, the `[tool]` routes,
// the legacy-path resolver, the route files and the quick actions and App
// Intents (native, so unchangeable from JS) all have to agree with it. Native
// code can't run under vitest, so the files that hold the rest of the wiring
// are read from disk as text.

const MOBILE_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const TABS_DIR = join(MOBILE_ROOT, 'app', '(tabs)');
const read = (...parts: string[]) =>
  readFileSync(join(MOBILE_ROOT, ...parts), 'utf8');

// The manifest, pinned so a refactor can't reorder, relabel or move a tool
// without a deliberate test change: id, label, icon, canonical route.
const EXPECTED_TOOLS = [
  ['meter', 'Meter', 'sun-medium', '/shoot/meter'],
  ['film-log', 'Film Log', 'film', '/shoot/film-log'],
  ['reciprocity', 'Reciprocity', 'timer', '/shoot/reciprocity'],
  ['camera-exposure', 'Camera Exposure', 'aperture', '/shoot/camera-exposure'],
  ['lens', 'Lenses', 'focus', '/shoot/lens'],
  ['recipes', 'Recipes', 'flask-conical', '/develop/recipes'],
  ['timer', 'Process Timer', 'hourglass', '/develop/recipes/timer'],
  ['negative-inverter', 'Inverter', 'contrast', '/develop/negative-inverter'],
  ['border', 'Border', 'crop', '/print/border'],
  ['exposure', 'Exposure', 'gauge', '/print/exposure'],
  ['resize', 'Resize', 'ruler', '/print/resize'],
  ['mat', 'Mat Cut', 'frame', '/print/mat'],
] as const;

// The phase table from issue #712.
const EXPECTED_PHASES = [
  [
    'shoot',
    'Shoot',
    ['meter', 'film-log', 'reciprocity', 'camera-exposure', 'lens'],
  ],
  ['develop', 'Develop', ['recipes', 'timer', 'negative-inverter']],
  ['print', 'Print', ['border', 'exposure', 'resize', 'mat']],
] as const;

const SCREEN_TOOLS = TOOLS.filter((t) => t.kind === 'screen');

/** Whether a canonical route has a route file under `app/(tabs)`. */
function routeFileExists(route: string): boolean {
  const base = join(TABS_DIR, ...route.split('/').filter(Boolean));
  return existsSync(`${base}.tsx`) || existsSync(join(base, 'index.tsx'));
}

describe('iOS tool registry (pinned)', () => {
  it('keeps the order, labels, icons and routes', () => {
    expect(TOOLS.map((t) => [t.id, t.label, t.icon, t.route])).toEqual(
      EXPECTED_TOOLS.map((row) => [...row])
    );
  });

  it('matches the phase table exactly', () => {
    expect(PHASES.map((p) => [p.id, p.label, p.toolIds])).toEqual(
      EXPECTED_PHASES.map(([id, label, ids]) => [id, label, [...ids]])
    );
  });

  it('puts every tool in exactly one phase', () => {
    const listed = PHASES.flatMap((p) => p.toolIds);
    expect([...listed].sort()).toEqual(TOOLS.map((t) => t.id).sort());
    for (const tool of TOOLS) {
      expect(
        PHASES.filter((p) => p.toolIds.includes(tool.id)).map((p) => p.id),
        tool.id
      ).toEqual([tool.phase]);
    }
  });
});

describe('fixed-layout and answer-first tools', () => {
  it('pins which screens fill the space instead of scrolling', () => {
    expect(TOOLS.filter((t) => t.fixedLayout).map((t) => t.id)).toEqual([
      'meter',
      'negative-inverter',
      'border',
      'resize',
      'mat',
    ]);
  });

  it('flags exactly the five answer-first tools', () => {
    // A pinned header means a large title could never collapse either.
    expect(
      TOOLS.filter((t) => t.answerFirst)
        .map((t) => t.id)
        .sort()
    ).toEqual(['camera-exposure', 'exposure', 'lens', 'reciprocity', 'resize']);
  });

  it('takes the header style from usesLargeTitle in every phase stack', () => {
    expect(read('src', 'components', 'hub', 'phase-stack.tsx')).toMatch(
      /\.\.\.\(usesLargeTitle\(tool\) \? undefined : STANDARD_TITLE\)/
    );
  });

  it('passes toolId to the Readout of every tool that records a last result', () => {
    // The types stop any other tool passing one (`RecordingToolId`); this is the
    // direction they can't check.
    for (const tool of TOOLS.filter((t) => recordsLastResult(t.id))) {
      const source = read('src', 'screens', `${tool.id}-screen.tsx`).replace(
        /\s+/g,
        ' '
      );
      expect(source, tool.id).toContain(`toolId="${tool.id}"`);
    }
  });
});

describe('tool screens', () => {
  const bindings = read('src', 'lib', 'tool-screens.ts');

  it('binds every single-screen tool to a screen, and only those', () => {
    const bound = [
      ...bindings.matchAll(/\n {2}('?)([\w-]+)\1: \w+Screen,/g),
    ].map((m) => m[2]);
    expect(bound.sort()).toEqual(SCREEN_TOOLS.map((t) => t.id).sort());
  });

  it('serves each phase [tool] route with that phase', () => {
    for (const phase of PHASES) {
      expect(read('app', '(tabs)', phase.id, '[tool].tsx')).toContain(
        `<PhaseToolRoute phase="${phase.id}" />`
      );
    }
  });
});

describe('route files', () => {
  it('resolves every tool canonical route to a route file', () => {
    for (const tool of TOOLS) {
      const exists =
        tool.kind === 'screen'
          ? existsSync(join(TABS_DIR, tool.phase, '[tool].tsx'))
          : routeFileExists(tool.route);
      expect(exists, `${tool.id} -> ${tool.route}`).toBe(true);
    }
  });

  it('has a hub, a layout and a [tool] route for each phase', () => {
    for (const phase of PHASES) {
      for (const file of ['index.tsx', '_layout.tsx', '[tool].tsx']) {
        expect(
          existsSync(join(TABS_DIR, phase.id, file)),
          `${phase.id}/${file}`
        ).toBe(true);
      }
      expect(read('app', '(tabs)', phase.id, '_layout.tsx')).toContain(
        "initialRouteName: 'index'"
      );
    }
  });

  it('declares only screens that have a route file', () => {
    for (const phase of PHASES) {
      const layout = read('app', '(tabs)', phase.id, '_layout.tsx');
      for (const [, name] of layout.matchAll(
        /Stack\.Screen\s+name="([^"]+)"/g
      )) {
        expect(
          existsSync(join(TABS_DIR, phase.id, `${name}.tsx`)),
          `${phase.id}: ${name}`
        ).toBe(true);
      }
    }
  });

  it('leaves no orphan route files beside the phase folders and Home', () => {
    const entries = readdirSync(TABS_DIR, { withFileTypes: true })
      .map((e) => e.name.replace(/\.tsx$/, ''))
      .sort();
    expect(entries).toEqual(['(home)', '_layout', 'develop', 'print', 'shoot']);
  });

  it('has one Settings screen, pushed in the Search tab stack', () => {
    expect(SETTINGS_ROUTE).toBe('/settings');
    expect(existsSync(join(TABS_DIR, '(home)', 'settings.tsx'))).toBe(true);
    expect(read('app', '(tabs)', '(home)', 'settings.tsx')).toMatch(
      /SettingsScreen/
    );
    expect(existsSync(join(MOBILE_ROOT, 'app', 'settings.tsx'))).toBe(false);
    for (const phase of PHASES) {
      expect(
        existsSync(join(TABS_DIR, phase.id, 'settings.tsx')),
        phase.id
      ).toBe(false);
    }
    const home = read('app', '(tabs)', '(home)', '_layout.tsx');
    expect(home).toMatch(/name="settings"/);
    expect(home).toContain("initialRouteName: 'index'");
    // A modal would swallow a link that arrives while it is open.
    expect(home).not.toMatch(/presentation:/);
    const stack = read('src', 'components', 'hub', 'phase-stack.tsx');
    expect(stack).not.toMatch(/name="settings"/);
    expect(stack).not.toMatch(/presentation:/);
  });

  it('has Edit favorites beside Settings in the Search tab stack, with no params', () => {
    expect(FAVORITES_ROUTE).toBe('/favorites');
    expect(read('app', '(tabs)', '(home)', 'favorites.tsx')).toMatch(
      /FavoritesScreen/
    );
    for (const phase of PHASES) {
      expect(
        existsSync(join(TABS_DIR, phase.id, 'favorites.tsx')),
        phase.id
      ).toBe(false);
    }
    const home = read('app', '(tabs)', '(home)', '_layout.tsx');
    expect(home).toMatch(/name="favorites"/);
    expect(home).toMatch(
      /name="favorites"\s+options=\{\{ title: 'Edit favorites', \.\.\.STANDARD_TITLE \}\}/
    );
    // An outside link can open the screen but cannot pass it anything.
    const screen = read('src', 'screens', 'favorites-screen.tsx');
    expect(screen).not.toMatch(/useLocalSearchParams|useGlobalSearchParams/);
    // It belongs to no tool and no phase, so it is never "recently used".
    expect(toolIdForPath(FAVORITES_ROUTE)).toBeUndefined();
    expect(resolveLegacyPath(FAVORITES_ROUTE)).toBe(FAVORITES_ROUTE);
  });

  it('opens Edit favorites from an app link, cold and warm, without a handoff', () => {
    for (const url of ['dorkroom://favorites', 'dorkroom://Favorites']) {
      for (const initial of [true, false]) {
        const landed = redirectSystemPath({ path: url, initial }).replace(
          /^dorkroom:\//,
          ''
        );
        expect(landed.toLowerCase(), url).toBe('/favorites');
        expect(takePendingLink()).toBeNull();
      }
    }
  });

  it('has no gear on the hubs', () => {
    expect(
      existsSync(
        join(MOBILE_ROOT, 'src', 'components', 'hub', 'header-buttons.tsx')
      )
    ).toBe(false);
    expect(read('src', 'components', 'hub', 'phase-stack.tsx')).not.toMatch(
      /HubHeaderRight/
    );
  });
});

describe('tab layout', () => {
  const layout = read('app', '(tabs)', '_layout.tsx');

  it('lists the phases in order, then Home as the Search tab', () => {
    // The triggers come from PHASES, so the order test above covers them.
    expect(layout).toContain('PHASES.map');
    expect(layout.indexOf('PHASES.map')).toBeLessThan(
      layout.indexOf('name="(home)"')
    );
    expect(layout).toContain("initialRouteName: '(home)'");
    expect(read('app', '(tabs)', '(home)', 'index.tsx')).toMatch(/HomeScreen/);
    expect(existsSync(join(TABS_DIR, 'index.tsx'))).toBe(false);
  });

  it('gives the Search tab the search role with its own icon and label', () => {
    const start = layout.indexOf('<NativeTabs.Trigger name="(home)"');
    expect(start).toBeGreaterThan(-1);
    const trigger = layout.slice(
      start,
      layout.indexOf('</NativeTabs.Trigger>', start)
    );
    // The search role gives Search its own button when the bar shrinks (see
    // the tabs notes in CLAUDE.md). A system item without its own icon and
    // label shows the stock icon and the route name "(home)" as its title.
    expect(trigger).toMatch(
      /^<NativeTabs\.Trigger name="\(home\)" role="search">/
    );
    expect(trigger).toMatch(
      /<NativeTabs\.Trigger\.Icon\s+sf="magnifyingglass"/
    );
    expect(trigger).toMatch(
      /<NativeTabs\.Trigger\.Label[\s\S]*>\s*Search\s*<\/NativeTabs\.Trigger\.Label>/
    );
  });

  it('gives every phase a tab symbol', () => {
    for (const phase of PHASES) {
      expect(layout, phase.id).toMatch(new RegExp(`${phase.id}: '[\\w.]+'`));
    }
  });
});

describe('legacy entry points still land on a tool', () => {
  const canonicalOf = (id: string) => TOOLS.find((t) => t.id === id)?.route;

  it('every tool screen resolves from its More route and its old tab root', () => {
    for (const tool of SCREEN_TOOLS) {
      const oldRoot = tool.id === 'lens' ? 'lenses' : tool.id;
      expect(resolveLegacyPath(`/more/${tool.id}`), tool.id).toBe(tool.route);
      expect(resolveLegacyPath(`/${oldRoot}`), tool.id).toBe(tool.route);
    }
  });

  it('the Search link resolves to Home, keeping its query', () => {
    expect(resolveLegacyPath('/search?q=hp5%20at%20800')).toBe(
      '/?q=hp5%20at%20800'
    );
    expect(resolveLegacyPath('/search')).toBe('/');
  });

  it('every quick action href resolves to an existing tool', () => {
    const config: unknown = JSON.parse(read('app.json'));
    const hrefs = [
      ...JSON.stringify(config).matchAll(/"href":\s*"([^"]+)"/g),
    ].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const resolved = resolveLegacyPath(href);
      expect(
        TOOLS.some((t) => t.route === resolved),
        `${href} -> ${resolved}`
      ).toBe(true);
      expect(
        redirectSystemPath({ path: `dorkroom:/${href}`, initial: true }),
        href
      ).toBe(resolved);
    }
  });

  describe('App Intents', () => {
    const swift = read(
      'plugins',
      'with-app-intents',
      'swift',
      'OpenPageIntent.swift'
    );
    const cases = [
      ...swift.matchAll(
        /case \.(\w+): return URL\(string: "dorkroom:\/\/([^"]*)"\)/g
      ),
    ].map((m) => ({ page: m[1], path: `/${m[2]}` }));
    // A case's String raw value is its name unless it declares one, which is
    // how a hyphenated tool id (`negative-inverter`) maps to a Swift identifier.
    const declared = [
      ...swift.matchAll(/^\s*case (\w+)(?: = "([^"]+)")?$/gm),
    ].map((m) => ({ page: m[1], toolId: m[2] ?? m[1] }));
    const toolIdOf = new Map(declared.map((d) => [d.page, d.toolId]));

    it('declares a deep link for every DorkroomPage case', () => {
      expect(cases.map((c) => c.page).sort()).toEqual(
        declared.map((d) => d.page).sort()
      );
      expect(declared.length).toBeGreaterThan(0);
    });

    it('every page deep-links to that tool', () => {
      for (const { page, path } of cases) {
        const toolId = toolIdOf.get(page);
        expect(SCREEN_TOOLS.map((t) => t.id)).toContain(toolId);
        expect(resolveLegacyPath(path), page).toBe(canonicalOf(toolId ?? ''));
      }
    });

    it('the exact intent URLs reach the tool through redirectSystemPath, cold and warm', () => {
      expect(cases.length).toBeGreaterThan(0);
      for (const { page, path } of cases) {
        const toolId = toolIdOf.get(page);
        // The Swift string, scheme included, as expo-router receives it.
        const url = `dorkroom:/${path}`;
        const canonical = canonicalOf(toolId ?? '') ?? '';
        expect(redirectSystemPath({ path: url, initial: true }), url).toBe(
          canonical
        );
        // Warm, the phase hub shows first and the tool is opened on top of it.
        expect(redirectSystemPath({ path: url, initial: false }), url).toBe(
          `/${canonical.split('/')[1]}`
        );
        expect(takePendingLink(), url).toBe(canonical);
      }
    });

    it('the light meter intent deep-links to the meter tool', () => {
      const meter = read(
        'plugins',
        'with-app-intents',
        'swift',
        'OpenLightMeterIntent.swift'
      );
      const match = meter.match(/dorkroom:\/\/([^"]*)"/);
      expect(match?.[1]).toBe('meter');
      expect(resolveLegacyPath(`/${match?.[1]}`)).toBe('/shoot/meter');
      const meterUrl = `dorkroom://${match?.[1]}`;
      expect(redirectSystemPath({ path: meterUrl, initial: true })).toBe(
        '/shoot/meter'
      );
      expect(redirectSystemPath({ path: meterUrl, initial: false })).toBe(
        '/shoot'
      );
      expect(takePendingLink()).toBe('/shoot/meter');
    });
  });
});

describe('Ask Dorkroom intent', () => {
  const intents = (...file: string[]) =>
    read('plugins', 'with-app-intents', ...file);
  const swift = intents('swift', 'AskDorkroomIntent.swift');
  const prefix = swift.match(/"(dorkroom:\/\/search\?q=)"/)?.[1] ?? '';
  const allowed = swift.match(/charactersIn: "([^"]+)"/)?.[1] ?? '';

  /** The question as `searchURL(for:)` builds it: trimmed, UTF-8, unreserved kept. */
  const intentUrl = (question: string) =>
    prefix +
    [...new TextEncoder().encode(question.trim())]
      .map((byte) => {
        const c = String.fromCharCode(byte);
        return byte < 128 && allowed.includes(c)
          ? c
          : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
      })
      .join('');

  it('opens the Search link and keeps only RFC 3986 unreserved characters', () => {
    expect(prefix).toBe('dorkroom://search?q=');
    expect([...allowed].sort().join('')).toBe(
      [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~']
        .sort()
        .join('')
    );
  });

  it('is compiled into the app and offered as an App Shortcut without a free-text phrase', () => {
    expect(intents('index.js')).toContain("'AskDorkroomIntent.swift'");
    const shortcuts = intents('swift', 'DorkroomShortcuts.swift');
    expect(shortcuts).toContain('intent: AskDorkroomIntent()');
    // App Shortcut phrases cannot hold a String parameter, and every one must
    // name the app; an app may declare at most 10 App Shortcuts.
    const phrases = [...shortcuts.matchAll(/^\s*"([^"]*)",?$/gm)].map(
      (m) => m[1]
    );
    expect(phrases.length).toBeGreaterThanOrEqual(14);
    for (const phrase of phrases) {
      expect(phrase).toContain('\\(.applicationName)');
      expect(phrase).not.toMatch(/\\\(\.(?!applicationName)/);
    }
    expect(shortcuts.match(/AppShortcut\(/g)?.length).toBeLessThanOrEqual(10);
  });

  it('a question reaches Home and is recorded as a search, cold and warm', () => {
    for (const question of [
      'how long for HP5 at 800 in DD-X?',
      '  reciprocity for 30s on HP5  ',
      'a & b = c + d #1 / 50%',
      'Fomapan 100 in Rodinal 1+50 at 20°C',
    ]) {
      const url = intentUrl(question);
      for (const initial of [true, false]) {
        resetSearchLinks();
        expect(redirectSystemPath({ path: url, initial }), url).toBe('/');
        expect(getSearchLinkSnapshot(), url).toEqual({
          query: question.trim(),
          seq: 1,
        });
        expect(takePendingLink()).toBeNull();
      }
    }
    resetSearchLinks();
  });
});

describe('Control Center controls', () => {
  const swift = read(
    'plugins',
    'with-widget-controls',
    'swift',
    'ControlLinkIntent.swift'
  );
  const links = [
    ...swift.matchAll(
      /case \.(\w+): return URL\(string: "dorkroom:\/\/([^"]*)"\)/g
    ),
  ].map((m) => ({ link: m[1], url: `dorkroom://${m[2]}` }));

  it('declares a deep link for each of the three buttons', () => {
    expect(links.map((l) => l.link).sort()).toEqual([
      'logFrame',
      'openMeter',
      'startLastTimer',
    ]);
  });

  it('every control URL reaches its screen through redirectSystemPath, cold and warm', () => {
    const NOW = Date.now();
    const expected = {
      // The add-shot form needs an active roll; with none (as here) the link
      // lands on the film log list (see `logFrameTarget`).
      logFrame: /^\/shoot\/film-log$/,
      openMeter: /^\/shoot\/meter$/,
      // Stamped with its arrival time, so every press is a new opening.
      startLastTimer: /^\/develop\/recipes\/timer\?start=last&at=\d+$/,
    } satisfies Record<string, RegExp>;
    const patternOf = (link: string) =>
      Object.entries(expected).find(([name]) => name === link)?.[1] ?? /^$/;
    for (const { link, url } of links) {
      // A canonical link comes back as the URL itself, which expo-router
      // strips to its path (`dorkroom://develop/...` is `/develop/...`).
      const cold = redirectSystemPath({ path: url, initial: true }).replace(
        /^dorkroom:\//,
        ''
      );
      expect(cold, url).toMatch(patternOf(link));
      if (link === 'startLastTimer') {
        expect(Number(cold.split('at=')[1])).toBeGreaterThanOrEqual(NOW);
      }
      // Warm, the phase hub shows first and the target opens on top of it.
      const warm = redirectSystemPath({ path: url, initial: false });
      expect(warm, url).toBe(`/${cold.split('/')[1]}`);
      expect(takePendingLink(), url).toMatch(patternOf(link));
    }
  });
});

describe('removed pinning', () => {
  it('leaves no pin or More code behind', () => {
    for (const file of [
      ['src', 'hooks', 'use-pinned-tabs.ts'],
      ['src', 'lib', 'tab-bar-settings.ts'],
      ['src', 'lib', 'tab-icons.ts'],
      ['app', '(tabs)', 'more'],
    ]) {
      expect(existsSync(join(MOBILE_ROOT, ...file)), file.join('/')).toBe(
        false
      );
    }
  });
});

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveToolPath } from './deep-link';
import { TOOLS } from './tools';

// Parity and pin tests for the iOS tool manifest (#455). `TOOLS` in
// `tools.ts` is the source of truth; the tabs layout, the More detail route,
// the deep-link resolver, the route files, the tab icons, and the App Intents
// all have to agree with it. Native code can't run under vitest, so the files
// that hold the rest of the wiring are read from disk as text.

const MOBILE_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const TABS_DIR = join(MOBILE_ROOT, 'app', '(tabs)');
const read = (...parts: string[]) =>
  readFileSync(join(MOBILE_ROOT, ...parts), 'utf8');

// Today's registry, pinned so a refactor can't reorder or relabel the More
// screen or the pin editor without a deliberate test change.
const EXPECTED_TOOLS = [
  ['border', 'Border', 'crop', '/more/border', 'printing'],
  ['resize', 'Resize', 'ruler', '/more/resize', 'printing'],
  ['exposure', 'Exposure', 'gauge', '/more/exposure', 'printing'],
  ['mat', 'Mat Cut', 'frame', '/more/mat', 'printing'],
  ['reciprocity', 'Reciprocity', 'timer', '/more/reciprocity', 'film'],
  ['film-log', 'Film Log', 'film', '/film-log', 'film'],
  ['recipes', 'Recipes', 'flask-conical', '/development', 'film'],
  ['lens', 'Lenses', 'focus', '/more/lens', 'camera'],
  [
    'camera-exposure',
    'Camera Exposure',
    'aperture',
    '/more/camera-exposure',
    'camera',
  ],
  ['meter', 'Meter', 'sun-medium', '/more/meter', 'camera'],
  ['settings', 'Settings', 'settings', '/more/settings', 'system'],
] as const;

// Tool id -> route file under app/(tabs) for every single-screen tool that can
// be pinned as a tab. Film Log and Recipes are permanent directory tabs.
const EXPECTED_TAB_ROUTES = {
  border: 'index',
  resize: 'resize',
  exposure: 'exposure',
  mat: 'mat',
  reciprocity: 'reciprocity',
  lens: 'lenses',
  'camera-exposure': 'camera-exposure',
  meter: 'meter',
  settings: 'settings',
} as const;

const EXPECTED_TAB_IDS = Object.keys(EXPECTED_TAB_ROUTES);

describe('iOS tool registry (pinned)', () => {
  it('keeps the order, labels, icons, routes and categories', () => {
    expect(
      TOOLS.map((t) => [t.id, t.label, t.icon, t.route, t.category])
    ).toEqual(EXPECTED_TOOLS.map((row) => [...row]));
  });
});

describe('tab route names', () => {
  it('TOOLS declares exactly the pinned tab routes', () => {
    expect(
      Object.fromEntries(
        TOOLS.filter((t) => t.tabRoute !== undefined).map((t) => [
          t.id,
          t.tabRoute,
        ])
      )
    ).toEqual(EXPECTED_TAB_ROUTES);
  });

  it('each route file re-exports the screen TOOL_SCREENS binds to its tool', () => {
    const bindings = read('src', 'lib', 'tool-screens.ts');
    for (const [id, route] of Object.entries(EXPECTED_TAB_ROUTES)) {
      const routeScreen = read('app', '(tabs)', `${route}.tsx`).match(
        /\b(\w+Screen)\b/
      )?.[1];
      const key = id.includes('-') ? `'${id}'` : id;
      const boundScreen = bindings.match(
        new RegExp(`\\n  ${key}: \\{\\s*screen: (\\w+),`)
      )?.[1];
      expect(routeScreen, route).toBeDefined();
      expect(boundScreen, id).toBe(routeScreen);
    }
  });

  it('each tab route resolves back to its tool when unpinned', () => {
    for (const [id, route] of Object.entries(EXPECTED_TAB_ROUTES)) {
      const path = route === 'index' ? '/' : `/${route}`;
      expect(resolveToolPath(path, [])).toBe(`/more/${id}`);
      expect(resolveToolPath(path, [id])).toBe(path);
    }
  });

  it('has a route file for each tab route and no orphan route files', () => {
    const routeFiles = readdirSync(TABS_DIR, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.tsx'))
      .map((e) => e.name.replace(/\.tsx$/, ''))
      .filter((name) => name !== '_layout')
      .sort();
    expect(routeFiles).toEqual(Object.values(EXPECTED_TAB_ROUTES).sort());
  });
});

describe('tab icons', () => {
  it('ships a PNG at every scale for each tab tool and permanent tab', () => {
    for (const id of [...EXPECTED_TAB_IDS, 'film-log', 'recipes', 'more']) {
      for (const suffix of ['', '@2x', '@3x']) {
        expect(
          existsSync(
            join(MOBILE_ROOT, 'assets', 'tab-icons', `${id}${suffix}.png`)
          ),
          `${id}${suffix}.png`
        ).toBe(true);
      }
    }
  });

  it('TOOL_SCREENS requires tab-icons/<id>.png for each tab tool', () => {
    const bindings = read('src', 'lib', 'tool-screens.ts');
    const required = [
      ...bindings.matchAll(
        /require\('\.\.\/\.\.\/assets\/tab-icons\/([\w-]+)\.png'\)/g
      ),
    ].map((m) => m[1]);
    expect(required).toEqual(EXPECTED_TAB_IDS);
  });

  it('generate-tab-icons.mjs rasterizes the same Lucide icon TOOLS names', () => {
    const script = read('scripts', 'generate-tab-icons.mjs');
    for (const tool of TOOLS) {
      const key = tool.id.includes('-') ? `'${tool.id}'` : tool.id;
      expect(script, tool.id).toContain(`${key}: '${tool.icon}',`);
    }
  });
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

  it('declares a deep link for every DorkroomPage case', () => {
    const declared = [...swift.matchAll(/^\s*case (\w+)$/gm)].map((m) => m[1]);
    expect(cases.map((c) => c.page).sort()).toEqual([...declared].sort());
    expect(declared.length).toBeGreaterThan(0);
  });

  it('every page is a tab tool whose deep link lands on that tool', () => {
    for (const { page, path } of cases) {
      expect(EXPECTED_TAB_IDS).toContain(page);
      expect(resolveToolPath(path, [])).toBe(`/more/${page}`);
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
    expect(resolveToolPath(`/${match?.[1]}`, [])).toBe('/more/meter');
  });
});

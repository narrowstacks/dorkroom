import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { tabBarMinimizeBehavior } from './tab-bar-minimize';
import { getTool, TOOLS } from './tools';

const MOBILE_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const read = (...parts: string[]) =>
  readFileSync(join(MOBILE_ROOT, ...parts), 'utf8');

const TOOL_ROUTES = TOOLS.map((tool) => tool.route);

// The list screens whose path asks for minimizing. The prop alone does nothing
// for a list inside a stack inside a tab: each needs the `TabBarScrollView`
// wrapper (see `tab-bar-scroll-view.tsx`).
const MINIMIZING_SCREENS = [
  ['src', 'screens', 'development', 'recipe-list-screen.tsx'],
  ['src', 'screens', 'film-log', 'film-list-screen.tsx'],
  ['src', 'screens', 'film-log', 'roll-detail-screen.tsx'],
];

describe('tabBarMinimizeBehavior', () => {
  it.each(['/develop/recipes', '/shoot/film-log', '/shoot/film-log/roll/abc'])(
    'minimizes on %s',
    (path) => {
      expect(tabBarMinimizeBehavior(path)).toBe('onScrollDown');
    }
  );

  it.each([
    '/develop/recipes/',
    '/develop/recipes?film=hp5',
    '/shoot/film-log/?x=1',
    '/shoot/film-log/roll/abc/',
    '/shoot/film-log/roll/abc?x=1#h',
  ])('tolerates a trailing slash, query and hash: %s', (path) => {
    expect(tabBarMinimizeBehavior(path)).toBe('onScrollDown');
  });

  it.each([
    '/',
    '/settings',
    '/shoot',
    '/develop',
    '/print',
    '/shoot/meter',
    '/shoot/lens',
    '/print/exposure',
    '/print/border',
    '/develop/negative-inverter',
    '/develop/recipes/timer',
    '/develop/recipes/recipe/abc',
    '/shoot/film-log/roll',
    '/shoot/film-log/roll/',
    '/shoot/film-log/roll/abc/extra',
    '/shoot/film-log/roll-form',
    '/shoot/film-log/shot?rollId=1',
    '/shoot/film-log/gear',
    '',
  ])('keeps the full bar on %j', (path) => {
    expect(tabBarMinimizeBehavior(path)).toBe('never');
  });
});

describe('minimizing list screens', () => {
  it.each(MINIMIZING_SCREENS)(
    'wraps its list in TabBarScrollView: %s/%s/%s',
    (...parts) => {
      const source = read(...parts);
      expect(source).toContain(
        "import { TabBarScrollView } from '@/components/tab-bar-scroll-view'"
      );
      expect(source).toMatch(
        /<TabBarScrollView>[\s\S]*<FlatList[\s\S]*<\/TabBarScrollView>/
      );
    }
  );

  it('minimizes on exactly the three routes, so a path and a wrapper go together', () => {
    const recipes = getTool('recipes')?.route ?? '';
    const filmLog = getTool('film-log')?.route ?? '';
    const routes = [recipes, filmLog, `${filmLog}/roll/abc`];
    expect(routes).toHaveLength(MINIMIZING_SCREENS.length);
    for (const route of routes) {
      expect(tabBarMinimizeBehavior(route), route).toBe('onScrollDown');
    }
    // Every other tool route, and the pages beside the lists, keep the bar.
    const others = [
      ...[...TOOL_ROUTES].filter((route) => !routes.includes(route)),
      `${recipes}/timer`,
      `${recipes}/recipe/abc`,
      `${filmLog}/gear`,
      `${filmLog}/roll-form`,
      `${filmLog}/roll-map`,
      `${filmLog}/shot`,
    ];
    for (const route of others) {
      expect(tabBarMinimizeBehavior(route), route).toBe('never');
    }
  });
});

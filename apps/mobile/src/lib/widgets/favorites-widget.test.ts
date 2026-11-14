// The Favorites widget's layout, compiled and rendered as the extension would,
// with only the runtime's globals reachable (src/test/widget-runtime.ts), and
// its pure props builder.
import { join } from 'node:path';
import type { WidgetFamily } from 'expo-widgets';
import { describe, expect, it } from 'vitest';
import { MAX_FAVORITES } from '@/lib/favorites';
import { TOOLS } from '@/lib/tools';
import {
  compileWidgetExport,
  envFor,
  evaluateWidget,
  layoutProblems,
  missingFromExpoUi,
  textOf,
  walk,
} from '@/test/widget-runtime';
import {
  buildFavoritesWidgetProps,
  EDIT_FAVORITES_URL,
  FAVORITES_PER_FAMILY,
  type FavoritesWidgetProps,
  HOME_WIDGET_URL,
  TOOL_WIDGET_SYMBOLS,
  toolWidgetSymbol,
  toolWidgetUrl,
} from './favorites-widget-props';

const COMPONENTS = [
  'HStack',
  'Image',
  'Link',
  'Spacer',
  'Text',
  'VStack',
] as const;
const MODIFIERS = [
  'background',
  'containerBackground',
  'cornerRadius',
  'font',
  'foregroundStyle',
  'frame',
  'lineLimit',
  'minimumScaleFactor',
  'padding',
  'truncationMode',
  'widgetURL',
] as const;
const FAMILIES: WidgetFamily[] = ['systemSmall', 'systemMedium'];
const ALL = TOOLS.map((t) => t.id);

const STATES: Array<[string, FavoritesWidgetProps]> = [
  ['empty', buildFavoritesWidgetProps([])],
  ['one', buildFavoritesWidgetProps(['timer'])],
  ['three', buildFavoritesWidgetProps(['meter', 'timer', 'exposure'])],
  ['five', buildFavoritesWidgetProps(ALL.slice(0, 5))],
  ['full', buildFavoritesWidgetProps(ALL.slice(0, MAX_FAVORITES))],
];

describe('buildFavoritesWidgetProps', () => {
  it('keeps the app order and gives each cell its fixed name, symbol, hue and link', () => {
    const props = buildFavoritesWidgetProps(['timer', 'meter', 'exposure']);
    expect(
      props.cells.map((c) => [c.id, c.name, c.symbol, c.accent, c.url])
    ).toEqual([
      [
        'timer',
        'Timer',
        'hourglass',
        '#2dd4bf',
        'dorkroom://develop/recipes/timer',
      ],
      ['meter', 'Meter', 'sun.max', '#facc15', 'dorkroom://shoot/meter'],
      [
        'exposure',
        'Exposure',
        'gauge.with.dots.needle.50percent',
        '#fb7185',
        'dorkroom://print/exposure',
      ],
    ]);
    expect(props.url).toBe(HOME_WIDGET_URL);
  });

  it('opens Edit favorites while there are none', () => {
    const props = buildFavoritesWidgetProps([]);
    expect(props.cells).toEqual([]);
    expect(props.url).toBe(EDIT_FAVORITES_URL);
  });

  it('drops unknown and repeated ids and caps the cells', () => {
    expect(
      buildFavoritesWidgetProps(['gone', 'lens', 'lens']).cells.map((c) => c.id)
    ).toEqual(['lens']);
    expect(buildFavoritesWidgetProps(ALL).cells).toHaveLength(MAX_FAVORITES);
    expect(FAVORITES_PER_FAMILY.systemMedium).toBe(MAX_FAVORITES);
  });

  it('has a symbol for every tool, and a link to its canonical route', () => {
    for (const tool of TOOLS) {
      expect(toolWidgetSymbol(tool.id), tool.id).toBeTruthy();
      expect(toolWidgetUrl(tool)).toBe(`dorkroom:/${tool.route}`);
    }
    expect(Object.keys(TOOL_WIDGET_SYMBOLS).sort()).toEqual([...ALL].sort());
  });

  it('carries only ids, fixed names, symbols, colours and links', () => {
    const props = buildFavoritesWidgetProps(ALL);
    for (const cell of props.cells) {
      expect(Object.keys(cell).sort()).toEqual(
        ['accent', 'id', 'name', 'symbol', 'url'].sort()
      );
    }
    expect(JSON.stringify(props).length).toBeLessThan(2000);
  });
});

describe('favorites widget layout', () => {
  const source = compileWidgetExport(
    join(__dirname, 'favorites-widget.tsx'),
    'favoritesWidget'
  );
  const render = evaluateWidget<FavoritesWidgetProps>(
    source,
    COMPONENTS,
    MODIFIERS
  );
  const links = (props: FavoritesWidgetProps, family: WidgetFamily) =>
    [...walk(render(props, envFor(family)))]
      .filter((el) => el.type === 'Link')
      .map((el) => el.props.destination);

  it('is a function string that names nothing outside itself', () => {
    expect(source.startsWith('function')).toBe(true);
    expect(() => render(STATES[4][1], envFor('systemMedium'))).not.toThrow();
  });

  it('only names runtime globals that exist in the installed @expo/ui', () => {
    expect(missingFromExpoUi(COMPONENTS, MODIFIERS)).toEqual([]);
  });

  it('renders every family in every state with one widgetURL and one-line names', () => {
    for (const family of FAMILIES) {
      for (const [state, props] of STATES) {
        expect(
          layoutProblems(render(props, envFor(family)), props.url, [
            props.emptyTitle,
            props.emptyHint,
          ]),
          `${family} ${state}`
        ).toEqual([]);
      }
    }
  });

  it('draws up to 4 cells small and 8 medium, each a link into its tool, in order', () => {
    const full = STATES[4][1];
    expect(links(full, 'systemSmall')).toEqual(
      full.cells.slice(0, 4).map((c) => c.url)
    );
    expect(links(full, 'systemMedium')).toEqual(full.cells.map((c) => c.url));
    expect(textOf(render(full, envFor('systemSmall')))).toEqual(
      full.cells.slice(0, 4).map((c) => c.name)
    );
  });

  it('keeps the grid shape with fewer favorites than cells', () => {
    const three = STATES[2][1];
    for (const family of FAMILIES) {
      const tree = [...walk(render(three, envFor(family)))];
      expect(
        tree.filter((el) => el.type === 'HStack'),
        family
      ).toHaveLength(2);
      expect(links(three, family), family).toHaveLength(3);
    }
  });

  it('boxes every glyph at 22pt and lets every name shrink to 0.6', () => {
    // A taller symbol (sun.max, timer, scope) squeezed its cell's name, which
    // shrank, until each glyph got one fixed box; "Reciprocity" needs 0.6 to
    // fit a quarter of a small widget (seen on the iOS 27.0 Simulator).
    const full = STATES[4][1];
    for (const family of FAMILIES) {
      const cells = [...walk(render(full, envFor(family)))].filter(
        (el) => el.type === 'Link'
      );
      for (const cell of cells) {
        const inside = [...walk(cell.props.children ?? null)];
        const glyph = inside.find((el) => el.type === 'Image');
        const glyphFrame = glyph?.props.modifiers?.find(
          (m) => m.modifier === 'frame'
        );
        expect(glyphFrame?.args[0], family).toMatchObject({
          width: 22,
          height: 22,
        });
        const name = inside.find((el) => el.type === 'Text');
        const scale = name?.props.modifiers?.find(
          (m) => m.modifier === 'minimumScaleFactor'
        );
        expect(scale?.args[0], family).toBe(0.6);
      }
      expect(cells.length, family).toBeGreaterThan(0);
    }
  });

  it('prompts to choose favorites while there are none', () => {
    const props = STATES[0][1];
    for (const family of FAMILIES) {
      expect(textOf(render(props, envFor(family)))).toEqual(
        expect.arrayContaining([props.emptyTitle, props.emptyHint])
      );
      expect(links(props, family)).toEqual([]);
    }
  });
});

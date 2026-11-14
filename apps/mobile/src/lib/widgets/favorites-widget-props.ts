// Pure builder of the "Favorites" widget's props (#734): the user's favorite
// tools in the app's order, each with its fixed short name, SF Symbol, phase
// hue and link. Only tool ids and these fixed strings reach the widget; no user
// data.
import type { Image } from '@expo/ui/swift-ui';
import type { ComponentProps } from 'react';
import { MAX_FAVORITES } from '@/lib/favorites';
import { getTool, type Tool } from '@/lib/tools';
import { ACCENT, PHASE_ACCENT } from '@/theme/accents';
import { type WidgetPalette, widgetPalette } from './widget-palette';

/** Matches the `name` of the widget in app.json's `expo-widgets` entry. */
export const FAVORITES_WIDGET_NAME = 'FavoritesWidget';

/** The Edit favorites screen, in the Search tab's stack (`/favorites`). */
export const EDIT_FAVORITES_URL = 'dorkroom://favorites';

/** Home (`/search` is a legacy path for `/`). A tap between the cells lands here. */
export const HOME_WIDGET_URL = 'dorkroom://search';

/** How many cells each family draws: 2 x 2 small, 4 x 2 medium. */
export const FAVORITES_PER_FAMILY = {
  systemSmall: 4,
  systemMedium: 8,
} as const;

export type WidgetSymbol = NonNullable<
  ComponentProps<typeof Image>['systemName']
>;

/**
 * Each tool's glyph in the widget: an SF Symbol close to its Lucide icon in the
 * app (the widget cannot draw Lucide). Keyed by tool id; a test checks every
 * tool has one.
 */
export const TOOL_WIDGET_SYMBOLS = {
  meter: 'sun.max',
  'film-log': 'film',
  reciprocity: 'timer',
  'camera-exposure': 'camera.aperture',
  lens: 'scope',
  recipes: 'flask',
  timer: 'hourglass',
  'negative-inverter': 'circle.lefthalf.filled',
  border: 'crop',
  exposure: 'gauge.with.dots.needle.50percent',
  resize: 'ruler',
  mat: 'square.dashed',
} as const satisfies Record<string, WidgetSymbol>;

const SYMBOL_BY_ID = new Map<string, WidgetSymbol>(
  Object.entries(TOOL_WIDGET_SYMBOLS)
);

/** A tool's widget glyph; undefined for an id the table does not know. */
export function toolWidgetSymbol(id: string): WidgetSymbol | undefined {
  return SYMBOL_BY_ID.get(id);
}

/**
 * A shorter name where the tool's label would not fit a quarter of a small
 * widget. Every other tool shows its label.
 */
const SHORT_NAMES = new Map([
  ['camera-exposure', 'Camera EV'],
  ['timer', 'Timer'],
]);

export function toolWidgetName(tool: Tool): string {
  return SHORT_NAMES.get(tool.id) ?? tool.label;
}

/** The tool's canonical route as an app link: `dorkroom://develop/recipes/timer`. */
export function toolWidgetUrl(tool: Tool): string {
  return `dorkroom:/${tool.route}`;
}

const CELL_FILL = '#1c1c1e';

export interface FavoriteCell {
  id: string;
  name: string;
  symbol: WidgetSymbol;
  /** The phase hue, literal hex (the widget never takes the safelight red). */
  accent: string;
  url: string;
}

export interface FavoritesWidgetProps {
  /** The favorites in the app's order, at most `MAX_FAVORITES`. Empty: the prompt. */
  cells: FavoriteCell[];
  /** The widget's one `widgetURL`: Home, or Edit favorites while there are none. */
  url: string;
  emptyTitle: string;
  emptyHint: string;
  palette: WidgetPalette;
  /** The fill behind each cell: one step up from the background. */
  cellFill: string;
}

export function buildFavoritesWidgetProps(
  favoriteIds: readonly string[]
): FavoritesWidgetProps {
  const cells: FavoriteCell[] = [];
  for (const id of favoriteIds) {
    const tool = getTool(id);
    const symbol = toolWidgetSymbol(id);
    if (!tool || !symbol || cells.some((cell) => cell.id === id)) continue;
    cells.push({
      id,
      name: toolWidgetName(tool),
      symbol,
      accent: ACCENT[PHASE_ACCENT[tool.phase]],
      url: toolWidgetUrl(tool),
    });
    if (cells.length === MAX_FAVORITES) break;
  }
  return {
    cells,
    url: cells.length === 0 ? EDIT_FAVORITES_URL : HOME_WIDGET_URL,
    emptyTitle: 'No favorites yet',
    emptyHint: 'Tap to choose the tools you use most.',
    palette: widgetPalette('rose'),
    cellFill: CELL_FILL,
  };
}

// Pure half of Home's favorites row (#734): what it shows, how big its tiles
// get, and how much room the scroll content leaves for it. The row is pinned
// over the bottom of Home, just above the tab bar (and the timer pill), so the
// tools sit under the thumb while the results scroll behind it.
import { PANEL_MAX_WIDTH } from '@/components/stage/stage-layout';
import { getTool, type Tool } from '@/lib/tools';

export type FavoritesBarItem =
  | { kind: 'tool'; tool: Tool }
  /** The one quiet tile with no favorites: opens Edit favorites. */
  | { kind: 'add' }
  /** Trails the favorites: opens Edit favorites. */
  | { kind: 'edit' };

/** The row's tiles: each favorite in order, then Edit; or Add favorites alone. */
export function favoritesBarItems(
  favoriteIds: readonly string[]
): FavoritesBarItem[] {
  const tools: FavoritesBarItem[] = [];
  for (const id of favoriteIds) {
    const tool = getTool(id);
    if (tool) tools.push({ kind: 'tool', tool });
  }
  return tools.length === 0 ? [{ kind: 'add' }] : [...tools, { kind: 'edit' }];
}

/**
 * The largest Dynamic Type scale a tile's label follows. Past it the label
 * stays put and the row scrolls sideways, so the row never grows into the
 * results: at 2x a 15pt label is 30pt, a tile about 54pt tall.
 */
export const FAVORITE_TILE_MAX_FONT_SCALE = 2;

/** A tile's glyph, scaled with the text up to the label's cap. */
export function favoriteTileIconSize(fontScale: number): number {
  const scale = Math.min(
    FAVORITE_TILE_MAX_FONT_SCALE,
    Math.max(1, Number.isFinite(fontScale) ? fontScale : 1)
  );
  return Math.round(18 * scale);
}

/** Space between the row and the tab bar (or the timer pill) under it. */
export const FAVORITES_BAR_GAP = 8;

/**
 * Where the row's bottom edge sits, from the screen's bottom: above this
 * screen's own bottom inset (the tab bar, the timer pill while a run is going,
 * and the home indicator; the tab's safe area grows with the pill) plus a gap.
 */
export function favoritesBarBottom(bottomInset: number): number {
  return Math.max(0, bottomInset) + FAVORITES_BAR_GAP;
}

/**
 * Whether the row shows. While the keyboard is up on Home itself (the search
 * field is focused) it is hidden: it would sit under the keyboard, still
 * reachable by VoiceOver, and its room in the scroll content would push results
 * away. A keyboard raised in another tab or a pushed screen leaves Home's row
 * and its spacer alone, so Home does not change behind the user's back.
 */
export function showsFavoritesBar(
  keyboardHeight: number,
  homeFocused: boolean
): boolean {
  return !(homeFocused && keyboardHeight > 0);
}

/**
 * The room Home's scroll view reserves at its bottom for the row (a content
 * inset, `Screen`'s `contentBottomInset`): the row's last measured height and
 * the gap under it, so the last result can be scrolled clear of it. Nothing
 * until the row has been measured. It deliberately has no keyboard term and
 * keeps the last height while the row is hidden for the keyboard: React
 * Native's keyboard handler uses the larger of the keyboard and this inset,
 * and a change of the inset while the keyboard is up would overwrite the
 * keyboard's.
 */
export function favoritesContentInset(lastBarHeight: number): number {
  if (!(lastBarHeight > 0)) return 0;
  return Math.ceil(lastBarHeight) + FAVORITES_BAR_GAP;
}

/** What VoiceOver reads for a tile. */
export function favoritesBarItemLabel(item: FavoritesBarItem): string {
  if (item.kind === 'tool') return item.tool.label;
  return item.kind === 'add' ? 'Add favorites' : 'Edit favorites';
}

export function favoritesBarItemHint(item: FavoritesBarItem): string {
  return item.kind === 'tool'
    ? `Opens ${item.tool.label}.`
    : 'Choose and order the tools in this row.';
}

/** Where the row sits across the window. */
export interface BarFrame {
  left: number;
  width: number;
}

/** Side margin of the row, matching `Screen`'s padding. */
export const FAVORITES_BAR_SIDE = 16;

/**
 * The row's width and left edge: the window less the side margins and the
 * side safe-area insets, capped at the stage panel's 560pt and centred, so a
 * wide iPad window keeps a phone-sized row.
 */
export function favoritesBarFrame(
  windowWidth: number,
  insetLeft: number,
  insetRight: number
): BarFrame {
  const start = insetLeft + FAVORITES_BAR_SIDE;
  const room = Math.max(
    0,
    windowWidth - start - insetRight - FAVORITES_BAR_SIDE
  );
  const width = Math.min(room, PANEL_MAX_WIDTH);
  return { left: start + (room - width) / 2, width };
}

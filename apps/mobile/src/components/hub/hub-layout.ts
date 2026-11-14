import type { LastResults } from '@/lib/last-result-store';
import type { Tool } from '@/lib/tools';

/** One row of the tile grid. */
export interface TileRow<T> {
  items: T[];
  /** A lone last tile spans both columns as a wide row, so an odd count
   * leaves no empty cell. */
  wide: boolean;
}

/**
 * Splits items into rows of two for the tile grid. With an odd count the last
 * row holds one item and is `wide`: it spans both columns.
 */
export function tileRows<T>(items: readonly T[]): TileRow<T>[] {
  const rows: TileRow<T>[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const pair = items.slice(i, i + 2);
    rows.push({ items: pair, wide: pair.length === 1 });
  }
  return rows;
}

/** The line under a tile's label: the tool's last result, else its blurb. */
export function tileSecondaryLine(tool: Tool, results: LastResults): string {
  return results[tool.id]?.text ?? tool.blurb;
}

/** Gap between tiles, across and down. */
export const TILE_GAP = 16;

/**
 * The width of each of the two tile columns: half the content width minus half
 * the gap. A number, so a tile's width never depends on its text.
 */
export function tileWidth(windowWidth: number, sidePadding: number): number {
  return Math.max(
    0,
    Math.floor((windowWidth - 2 * sidePadding - TILE_GAP) / 2)
  );
}

/** Widest the hub's content grows. On an iPad two tiles stay phone-sized. */
export const HUB_MAX_WIDTH = 560;

/** The hub's width: the window, capped. */
export function hubWidth(windowWidth: number): number {
  return Math.min(windowWidth, HUB_MAX_WIDTH);
}

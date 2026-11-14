import { MAX_FAVORITES } from '@/lib/favorites';

// The words of a hub tile's favorite marking (#734), pure so they are tested.

/** The context menu item and the VoiceOver action. */
export function favoriteActionLabel(favorite: boolean): string {
  return favorite ? 'Remove from favorites' : 'Add to favorites';
}

/** Why Add is disabled, when it is; nothing otherwise. */
export function favoriteMenuSubtitle(
  favorite: boolean,
  favoritesFull: boolean
): string | undefined {
  return !favorite && favoritesFull
    ? `Favorites are full (${MAX_FAVORITES}). Remove one first.`
    : undefined;
}

/** What VoiceOver reads for a tile: the label, its line, and "favorite". */
export function toolTileLabel(
  label: string,
  secondary: string,
  favorite: boolean
): string {
  return `${label}, ${secondary}${favorite ? ', favorite' : ''}`;
}

/** The favorite star's size and its inset from the tile's top and right edges. */
export const STAR_SIZE = 14;
export const STAR_INSET = 12;
/** The tile's own padding (`Surface`'s `p-5`). */
const TILE_PADDING = 20;
const STAR_GAP = 8;

/**
 * Right padding for a tile's text column, so a favorite's star never overlaps
 * the text: the star's reach into the tile past the tile's padding, plus a gap.
 */
export function favoriteStarClearance(favorite: boolean): number {
  return favorite
    ? Math.max(0, STAR_INSET + STAR_SIZE + STAR_GAP - TILE_PADDING)
    : 0;
}

/** VoiceOver's hint: what a double-tap does, and why Add is unavailable when full. */
export function toolTileHint(
  favorite: boolean,
  favoritesFull: boolean
): string {
  const reason = favoriteMenuSubtitle(favorite, favoritesFull);
  return reason ? `Opens the tool. ${reason}` : 'Opens the tool.';
}

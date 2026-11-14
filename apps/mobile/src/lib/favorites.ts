import { parseRecentIds } from './recent-list';
import { getTool, type Phase, PHASES, type Tool } from './tools';

// The user's favorite tools (#734): an ordered list of tool ids, shown as the
// row at the bottom of Home and in the Favorites widget. Pure, so the rules are
// tested apart from the MMKV store that keeps the list (`favorites-store.ts`).
// Only tool ids are stored: no user text.

/** The most favorites kept: the medium widget's 4 x 2 grid. */
export const MAX_FAVORITES = 8;

const isTool = (id: string) => getTool(id) !== undefined;

/**
 * A stored value back to a list of favorites, tolerant of anything: malformed
 * JSON is an empty list, non-string entries and ids that are no longer tools
 * are dropped one by one, duplicates keep their first place, and the list is
 * capped at `MAX_FAVORITES`.
 */
export function parseFavoriteIds(raw: string | undefined): string[] {
  return parseRecentIds(raw).filter(isTool).slice(0, MAX_FAVORITES);
}

/** Whether `id` can be added: a tool, not already there, and room left. */
export function canAddFavorite(list: readonly string[], id: string): boolean {
  return isTool(id) && !list.includes(id) && list.length < MAX_FAVORITES;
}

/** `id` added at the end; the list unchanged when it cannot be added. */
export function addFavorite(list: readonly string[], id: string): string[] {
  return canAddFavorite(list, id) ? [...list, id] : [...list];
}

export function removeFavorite(list: readonly string[], id: string): string[] {
  return list.filter((entry) => entry !== id);
}

/** Removes a favorite, or adds it at the end (when there is room). */
export function toggleFavorite(list: readonly string[], id: string): string[] {
  return list.includes(id) ? removeFavorite(list, id) : addFavorite(list, id);
}

/**
 * `id` moved by `delta` places (-1 up, +1 down), clamped to the list's ends.
 * An id not in the list, or a move past an end, leaves it unchanged.
 */
export function moveFavorite(
  list: readonly string[],
  id: string,
  delta: number
): string[] {
  const from = list.indexOf(id);
  if (from === -1) return [...list];
  const to = Math.min(list.length - 1, Math.max(0, from + Math.trunc(delta)));
  if (to === from) return [...list];
  const next = list.filter((entry) => entry !== id);
  next.splice(to, 0, id);
  return next;
}

/** Whether two lists hold the same ids in the same order. */
export function sameFavorites(
  a: readonly string[],
  b: readonly string[]
): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

export interface FavoritesEditorSections {
  /** The favorites, in order. */
  favorites: Tool[];
  /** The other tools by phase, in hub order; a phase with none left is absent. */
  others: { phase: Phase; label: string; tools: Tool[] }[];
  /** No room for another favorite. */
  full: boolean;
}

/** What the Edit favorites screen lists. */
export function favoritesEditorSections(
  list: readonly string[]
): FavoritesEditorSections {
  const favorites = list
    .map((id) => getTool(id))
    .filter((tool): tool is Tool => tool !== undefined);
  const chosen = new Set(list);
  const others = PHASES.map((phase) => ({
    phase: phase.id,
    label: phase.label,
    tools: phase.toolIds
      .filter((id) => !chosen.has(id))
      .map((id) => getTool(id))
      .filter((tool): tool is Tool => tool !== undefined),
  })).filter((section) => section.tools.length > 0);
  return { favorites, others, full: favorites.length >= MAX_FAVORITES };
}

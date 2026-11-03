import type { HomeLinkTarget } from '@dorkroom/logic';
import { resolveToolPath } from '@/lib/deep-link';
import { LINK_OPENED_PARAM } from '@/lib/link-prefill';
import { getTool } from '@/lib/tools';

/** A route the web home search can point at. */
export type HomeRoute = HomeLinkTarget['to'];

/**
 * The iOS tool each web route stands for. The names differ by platform: the
 * web `/stops` is the iOS Exposure tab, and the web `/exposure` is iOS Camera
 * Exposure (#266). The web has no film database page, so `/films` opens the
 * recipe browser, which lists a film's recipes.
 */
export const TOOL_ID_BY_HOME_ROUTE = {
  '/border': 'border',
  '/stops': 'exposure',
  '/resize': 'resize',
  '/lenses': 'lens',
  '/mat': 'mat',
  '/reciprocity': 'reciprocity',
  '/exposure': 'camera-exposure',
  '/negative-inverter': 'negative-inverter',
  '/development': 'recipes',
  '/films': 'recipes',
} as const satisfies Record<HomeRoute, string>;

function queryOf(search: Readonly<Record<string, string | undefined>>): string {
  const pairs = Object.entries(search).flatMap(([key, value]) =>
    value === undefined
      ? []
      : [`${encodeURIComponent(key)}=${encodeURIComponent(value)}`]
  );
  return pairs.length > 0 ? `?${pairs.join('&')}` : '';
}

/**
 * Where an answer or a result opens on iOS, as an expo-router path.
 *
 * A calculator's link params become search params on its route; the screen
 * reads them with the calculator's `link.read` (see `link-prefill.ts`). A
 * pinned tool opens on its tab, an unpinned one in the More stack, as deep
 * links do. A recipe opens its detail screen; a film or developer opens the
 * recipe browser filtered to it.
 *
 * @param opened - Distinguishes one opening from the last, so the same answer
 *   opened twice applies twice. Omit in tests for a stable path.
 */
export function homeDestination(
  target: HomeLinkTarget,
  pinned: readonly string[],
  opened?: number
): string {
  if (target.to === '/development' || target.to === '/films') {
    const search = target.search;
    if ('recipe' in search && search.recipe) {
      return `/development/recipe/${encodeURIComponent(search.recipe)}`;
    }
    const film = search.film;
    const developer = 'developer' in search ? search.developer : undefined;
    // The browser keeps its state while its tab is open, so a filtered
    // opening carries the marker too: the same film opened twice re-applies.
    const filtered = film !== undefined || developer !== undefined;
    return `/development${queryOf({
      film,
      developer,
      [LINK_OPENED_PARAM]:
        opened !== undefined && filtered ? String(opened) : undefined,
    })}`;
  }
  const toolId = TOOL_ID_BY_HOME_ROUTE[target.to];
  const tabRoute = getTool(toolId)?.tabRoute;
  const search = { ...target.search };
  // Only a prefilled link needs the marker; a bare tool has nothing to re-apply.
  const prefilled = Object.keys(search).length > 0;
  const query = queryOf(
    opened !== undefined && prefilled
      ? { ...search, [LINK_OPENED_PARAM]: String(opened) }
      : search
  );
  return resolveToolPath(`/${tabRoute ?? toolId}${query}`, pinned);
}

/** Where a tool opens from Home's "recently used": its tab if pinned, else its More route. */
export function toolHref(toolId: string, pinned: readonly string[]): string {
  const tool = getTool(toolId);
  if (!tool) return '/';
  return tool.tabRoute === undefined
    ? String(tool.route)
    : resolveToolPath(`/${tool.tabRoute}`, pinned);
}

/** Where a bare tool result (no prefill) opens. */
export function homeRouteDestination(
  route: HomeRoute,
  pinned: readonly string[]
): string {
  return toolHref(TOOL_ID_BY_HOME_ROUTE[route], pinned);
}

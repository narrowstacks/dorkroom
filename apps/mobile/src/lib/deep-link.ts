// Tool id <-> tab-route-name mapping, duplicated locally from
// `app/(tabs)/_layout.tsx`'s `ROUTE_NAME` so this pure module doesn't import
// from a route file. Keep both in sync when a new pinnable tool is added.
const ROUTE_NAME_TO_TOOL_ID = new Map([
  ['index', 'border'],
  ['exposure', 'exposure'],
  ['reciprocity', 'reciprocity'],
  ['resize', 'resize'],
  ['meter', 'meter'],
  ['mat', 'mat'],
  ['lenses', 'lens'],
  ['camera-exposure', 'camera-exposure'],
  ['settings', 'settings'],
]);

/** Splits a leading path segment from the rest (query/fragment/sub-path). */
function splitFirstSegment(path: string) {
  const queryOrHashIndex = path.search(/[?#]/);
  const pathOnly =
    queryOrHashIndex === -1 ? path : path.slice(0, queryOrHashIndex);
  const suffix = queryOrHashIndex === -1 ? '' : path.slice(queryOrHashIndex);
  const trimmed = pathOnly.replace(/^\/+/, '');
  const slashIndex = trimmed.indexOf('/');
  const segment = slashIndex === -1 ? trimmed : trimmed.slice(0, slashIndex);
  const remainder = slashIndex === -1 ? '' : trimmed.slice(slashIndex);
  return { segment, rest: remainder + suffix };
}

/** Map an incoming path to a route that is actually reachable.
 *  Tab-root tool paths (e.g. "/exposure") are only navigable while that
 *  tool's trigger is pinned into the native tab bar; otherwise the tool
 *  lives at "/more/<id>". Non-tool paths pass through untouched. */
export function resolveToolPath(
  path: string,
  pinned: readonly string[]
): string {
  const { segment, rest } = splitFirstSegment(path);

  // "/" (root) maps to the border tool's tab route.
  const routeName = segment === '' ? 'index' : segment;
  const toolId = ROUTE_NAME_TO_TOOL_ID.get(routeName);

  // Not a recognized single-screen tool tab route (e.g. "/film-log",
  // "/more", "/development", unknown paths) — pass through unchanged.
  if (!toolId) return path;

  if (pinned.includes(toolId)) return path;

  return `/more/${toolId}${rest}`;
}

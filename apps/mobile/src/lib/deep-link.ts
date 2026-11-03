import { getTool, getToolIdForTabRoute } from '@/lib/tools';

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
 *  lives at "/more/<id>". Non-tool paths pass through untouched, and so does
 *  the root "/", which is Home (the border calculator is at "/border"). */
export function resolveToolPath(
  path: string,
  pinned: readonly string[]
): string {
  const { segment, rest } = splitFirstSegment(path);

  const toolId = getToolIdForTabRoute(segment);

  // Not a recognized single-screen tool tab route (e.g. "/", "/film-log",
  // "/more", "/development", unknown paths) — pass through unchanged.
  if (!toolId) return path;

  if (pinned.includes(toolId)) return path;

  return `/more/${toolId}${rest}`;
}

/** The tool a current path belongs to, for "recently used". Handles a tool's
 *  tab route ("/lenses"), its More-stack route ("/more/lens") and the two
 *  multi-screen sections. Home, More and unknown paths belong to no tool. */
export function toolIdForPath(path: string): string | undefined {
  const { segment, rest } = splitFirstSegment(path);
  if (segment === 'film-log') return 'film-log';
  if (segment === 'development') return 'recipes';
  if (segment === 'more') {
    const id = splitFirstSegment(rest).segment;
    return getTool(id)?.id;
  }
  return getToolIdForTabRoute(segment);
}

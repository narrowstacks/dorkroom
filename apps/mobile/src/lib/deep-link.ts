import {
  getTool,
  getToolPhase,
  HOME_ROUTE,
  isPhase,
  SETTINGS_ROUTE,
  TOOLS,
} from '@/lib/tools';

/** Splits a path into its non-empty segments and its `?query#hash` suffix. */
function splitPath(path: string) {
  const suffixIndex = path.search(/[?#]/);
  const pathOnly = suffixIndex === -1 ? path : path.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? '' : path.slice(suffixIndex);
  return { segments: pathOnly.split('/').filter(Boolean), suffix };
}

// A segment may itself be a path (a tool's canonical route), so strip the
// extra leading slash it brings.
const join = (segments: readonly string[], suffix: string) =>
  `/${segments.join('/').replace(/^\/+/, '')}${suffix}`;

/**
 * Old tab-root route names that are not the tool id. Every other tab route was
 * named for its tool (`/exposure`); `lens` lived at `/lenses`.
 */
const LEGACY_TAB_ROUTE_IDS = new Map([['lenses', 'lens']]);

// Settings was once a root screen, then one per phase stack
// (`/shoot/settings`, `/develop/settings`, `/print/settings`). It is one screen
// in the Search tab's stack now, so every one of those paths lands there.
const RETIRED_PHASE_SETTINGS = new Set([
  '/shoot/settings',
  '/develop/settings',
  '/print/settings',
]);

/**
 * Section tools that were once reachable as a pinned tab root (`/timer`) or a
 * More detail route (`/more/timer`). The Process Timer was the only one; Film
 * Log and Recipes had their own paths, handled below.
 */
const LEGACY_SECTION_TOOL_IDS = new Set(['timer']);

/**
 * The canonical path of a tool that had a tab root or More detail route: a
 * single-screen tool, or the Process Timer. Undefined for anything else.
 */
function screenToolPath(id: string): string | undefined {
  const tool = getTool(id);
  if (tool === undefined) return undefined;
  if (tool.kind === 'screen') return tool.route;
  return LEGACY_SECTION_TOOL_IDS.has(tool.id) ? tool.route : undefined;
}

/**
 * Map a path from before the Shoot / Develop / Print tabs to where it lives
 * now. Quick actions, App Intents, `dorkroom://` links and old shares still
 * carry these paths and cannot be changed without a native build.
 *
 * - `/more/<id>` and the old tab roots (`/exposure`, `/lenses`...) to `/<phase>/<id>`;
 *   `/more/timer` and `/timer` to `/develop/recipes/timer`
 * - `/film-log...` to `/shoot/film-log...`, `/development...` to `/develop/recipes...`
 * - `/more/settings` and the retired per-phase Settings paths to `/settings`;
 *   `/more` and `/more/edit` to Home
 *
 * Query, hash and any sub-path are kept. Canonical and unknown paths come back
 * unchanged.
 */
export function resolveLegacyPath(path: string): string {
  const { segments, suffix } = splitPath(path);
  const [first, second, ...rest] = segments;
  if (first === undefined) return path;

  if (first === 'more') {
    if (second === undefined || second === 'edit')
      return `${HOME_ROUTE}${suffix}`;
    if (second === 'settings') return `${SETTINGS_ROUTE}${suffix}`;
    const toolPath = screenToolPath(second);
    return toolPath === undefined ? path : join([toolPath, ...rest], suffix);
  }
  if (first === 'film-log') return join(['shoot', ...segments], suffix);
  if (first === 'development') {
    return join(['develop', 'recipes', ...segments.slice(1)], suffix);
  }

  if (first === 'settings') return `${SETTINGS_ROUTE}${suffix}`;
  if (
    segments.length === 2 &&
    RETIRED_PHASE_SETTINGS.has(`/${first}/${second}`)
  ) {
    return `${SETTINGS_ROUTE}${suffix}`;
  }
  const toolPath = screenToolPath(LEGACY_TAB_ROUTE_IDS.get(first) ?? first);
  if (toolPath === undefined) return path;
  return join([toolPath, ...segments.slice(1)], suffix);
}

// Longest route first, so the Process Timer (`/develop/recipes/timer`) wins
// over the Recipes section that contains it.
const SECTION_TOOLS = TOOLS.filter((t) => t.kind === 'section').sort(
  (a, b) => b.route.length - a.route.length
);

/**
 * The tool a path belongs to, for "recently used". Accepts canonical and
 * legacy paths. Home, Settings, the hubs and unknown paths belong to no tool.
 */
export function toolIdForPath(path: string): string | undefined {
  const { segments } = splitPath(resolveLegacyPath(path));
  const [phase, second] = segments;
  if (phase === undefined || !isPhase(phase) || second === undefined) {
    return undefined;
  }
  const canonical = `/${segments.join('/')}`;
  const section = SECTION_TOOLS.find(
    (t) => canonical === t.route || canonical.startsWith(`${t.route}/`)
  );
  if (section) return section.id;
  const tool = getTool(second);
  return tool?.kind === 'screen' && getToolPhase(second) === phase
    ? tool.id
    : undefined;
}

/** Lower-cases the first path segment, and the second when the first is `more`. */
function lowerLeadingSegments(rest: string): string {
  const lowerHost = rest.replace(/^[^/?#]*/, (host) => host.toLowerCase());
  return lowerHost.toLowerCase().startsWith('more/')
    ? lowerHost.replace(/^more\/[^/?#]*/, (head) => head.toLowerCase())
    : lowerHost;
}

/** The URL scheme of this app; must match `scheme` in `app.json` (tested). */
export const APP_SCHEME = 'dorkroom';

const URL_SCHEME = /^([a-z][a-z0-9+.-]*):\/\/(.*)$/i;

/**
 * What expo-router hands `redirectSystemPath`: a full URL for a deep link
 * (`dorkroom://meter`, `dorkroom://more/meter?x=1`) or a bare path. The host
 * of an app-scheme URL is its first path segment. Returns the canonical path
 * when the input is one of this app's legacy links, and the input itself
 * otherwise: other schemes (`https://`, `exp+dorkroom://`), canonical links
 * and anything unrecognised pass through for expo-router to handle.
 */
export function resolveIncomingLink(input: string): string {
  const match = URL_SCHEME.exec(input);
  if (match === null) return resolveLegacyPath(input);
  const [, scheme, rest] = match;
  if (scheme.toLowerCase() !== APP_SCHEME) return input;
  // Hosts are case-insensitive, so `dorkroom://Meter` is `dorkroom://meter`;
  // so is the tool id after `more/`. Later segments (recipe ids) keep their case.
  const original = `/${rest.replace(/^\/+/, '')}`;
  const path = `/${lowerLeadingSegments(rest.replace(/^\/+/, ''))}`;
  const resolved = resolveLegacyPath(path);
  // A link that only needed case-folding (`dorkroom://Shoot/meter`) is rewritten
  // too, to the folded path.
  return resolved === path && path === original ? input : resolved;
}

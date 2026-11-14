import { LINK_OPENED_PARAM } from '@/lib/link-prefill';
import { TIMER_EXPOSURE_PARAM, TIMER_START_PARAM } from '@/lib/next-step';
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
 * - `/search?q=...` (the Ask Dorkroom App Intent sends it) to Home with
 *   the query string, `/?q=...`; `redirectSystemPath` then strips `q` and
 *   records it as a search event (`splitSearchLink`), which Home applies
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

  // Only the bare path: `/search/anything` is not a link we know.
  if (first === 'search' && second === undefined) {
    return `${HOME_ROUTE}${suffix}`;
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

interface AppLinkParts {
  /** Everything before the query: the app-scheme URL's head or the bare path. */
  head: string;
  /** The path, `/develop/recipes/timer` for `dorkroom://develop/recipes/timer`. */
  path: string;
  query: string;
  hash: string;
}

/**
 * Splits an app-scheme URL or a bare path into its parts; null for a link with
 * another scheme (`https://`, `exp+dorkroom://`).
 */
function appLinkParts(link: string): AppLinkParts | null {
  const hashIndex = link.indexOf('#');
  const beforeHash = hashIndex === -1 ? link : link.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : link.slice(hashIndex);
  const queryIndex = beforeHash.indexOf('?');
  const head = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : beforeHash.slice(queryIndex + 1);
  const scheme = URL_SCHEME.exec(head);
  if (scheme !== null && scheme[1].toLowerCase() !== APP_SCHEME) return null;
  const path = scheme === null ? head : `/${scheme[2]}`;
  return { head, path, query, hash };
}

/** Whether `path` is `route`, ignoring case and trailing slashes. */
const samePath = (path: string, route: string) =>
  path.replace(/\/+$/, '').toLowerCase() === route.toLowerCase();

/** Timer link params that make an opening (and so get an `at`). */
const TIMER_OPENING_PARAMS: readonly string[] = [
  TIMER_EXPOSURE_PARAM,
  TIMER_START_PARAM,
];

/**
 * Gives an incoming link to the Process Timer that carries an exposure or a
 * `start` but no `at` the time it arrived (`at=<now ms>`), so every opening is
 * ordered and an older timer screen can never re-apply a stale one. This is the
 * form an App Intent or a Control Center control builds
 * (`dorkroom://develop/recipes/timer?exposure=60`, `...?start=last`); the same
 * URL opened twice is two openings. Accepts the app-scheme URL or a bare path;
 * any other link comes back unchanged. Pure: `now` is passed in.
 */
export function stampTimerLink(link: string, now: number): string {
  const parts = appLinkParts(link);
  const timerRoute = getTool('timer')?.route;
  if (parts === null || timerRoute === undefined) return link;
  if (!samePath(parts.path, timerRoute)) return link;

  const { head, query, hash } = parts;
  const keys = query.split('&').map((pair) => pair.split('=')[0]);
  if (
    !keys.some((key) => TIMER_OPENING_PARAMS.includes(key)) ||
    keys.includes(LINK_OPENED_PARAM)
  ) {
    return link;
  }
  const stamped = `${LINK_OPENED_PARAM}=${Math.floor(now)}`;
  return `${head}?${query === '' ? stamped : `${query}&${stamped}`}${hash}`;
}

/** The Control Center "Log a frame" link, `dorkroom://log-frame`. */
export const LOG_FRAME_PATH = '/log-frame';

/**
 * Where "Log a frame" lands: the add-shot form for the roll the light meter
 * logs to, or the film log list when there is no active roll (the form would
 * only say to start one, or pick a finished roll). Pure.
 */
export function logFrameTarget(meterRollId: string | undefined): string {
  const filmLog = getTool('film-log')?.route ?? '/shoot/film-log';
  return meterRollId === undefined
    ? filmLog
    : `${filmLog}/shot?rollId=${encodeURIComponent(meterRollId)}`;
}

/**
 * Rewrites the "Log a frame" link (app-scheme URL or bare path, any query is
 * dropped) to `logFrameTarget`; any other link comes back unchanged.
 * `meterRollId` is only asked for when the link is this one, and if it throws
 * (unreadable film log storage) the link lands on the film log list: the raw
 * `/log-frame` would match no route.
 */
export function resolveLogFrameLink(
  link: string,
  meterRollId: () => string | undefined
): string {
  const parts = appLinkParts(link);
  if (parts === null || !samePath(parts.path, LOG_FRAME_PATH)) return link;
  let rollId: string | undefined;
  try {
    rollId = meterRollId();
  } catch {
    rollId = undefined;
  }
  return logFrameTarget(rollId);
}

const ROLL_PATH = /^\/shoot\/film-log\/roll\/([^/]+)\/?$/i;

/**
 * A link to one roll (`/shoot/film-log/roll/<id>`: a Spotlight result, the
 * roll widget) whose roll no longer exists lands on the film log list instead
 * of an empty roll screen. `rollExists` is only asked for such a link; if it
 * throws (unreadable film log storage) the link also lands on the list. Any
 * other link, and a link to a roll that exists, comes back unchanged. Pure.
 */
export function resolveMissingRollLink(
  link: string,
  rollExists: (id: string) => boolean
): string {
  const parts = appLinkParts(link);
  if (parts === null) return link;
  const match = ROLL_PATH.exec(parts.path);
  if (match === null) return link;
  let id = match[1];
  try {
    id = decodeURIComponent(id);
  } catch {
    // A malformed escape is looked up as written.
  }
  let exists = false;
  try {
    exists = rollExists(id);
  } catch {
    exists = false;
  }
  return exists ? link : (getTool('film-log')?.route ?? '/shoot/film-log');
}

/** A query-string key or value as text: `+` is a space, bad escapes stay as written. */
function decodeQueryText(text: string): string {
  const spaced = text.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(spaced);
  } catch {
    return spaced;
  }
}

export interface SearchLinkSplit {
  path: string;
  query: string | null;
}

/**
 * Splits a Home search link (`/?q=hp5&ref=spotlight`) into the path to open
 * and the query to apply: the path is Home without `q` (other params and the
 * hash stay), and `query` is the first `q` decoded, `null` when the link has
 * none. Any other path comes back unchanged with `query: null`.
 */
export function splitSearchLink(path: string): SearchLinkSplit {
  const suffixIndex = path.search(/[?#]/);
  if (suffixIndex === -1) return { path, query: null };
  const pathOnly = path.slice(0, suffixIndex);
  if (pathOnly.replace(/\/+$/, '') !== '') return { path, query: null };
  const hashIndex = path.indexOf('#');
  const hash = hashIndex === -1 ? '' : path.slice(hashIndex);
  const queryString =
    path[suffixIndex] === '?'
      ? path.slice(suffixIndex + 1, hashIndex === -1 ? undefined : hashIndex)
      : '';
  let query: string | null = null;
  const kept: string[] = [];
  for (const pair of queryString.split('&')) {
    if (pair === '') continue;
    const eq = pair.indexOf('=');
    const key = decodeQueryText(eq === -1 ? pair : pair.slice(0, eq));
    if (key === 'q') {
      query ??= eq === -1 ? '' : decodeQueryText(pair.slice(eq + 1));
    } else {
      kept.push(pair);
    }
  }
  if (query === null) return { path, query: null };
  return {
    path: `${HOME_ROUTE}${kept.length > 0 ? `?${kept.join('&')}` : ''}${hash}`,
    query,
  };
}

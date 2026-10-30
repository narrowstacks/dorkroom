import {
  type BreakpointName,
  BREAKPOINTS,
  MOBILE_MAX_WIDTH,
} from '@dorkroom/logic';
import { useCallback, useSyncExternalStore } from 'react';
import { type AnyMediaQueryList, hasGlobal, matchMediaQuery } from '../lib/dom';

/**
 * Media query for "at or above this breakpoint", the same condition a
 * Tailwind `sm:` / `md:` / ... utility applies under.
 */
export function breakpointQuery(name: BreakpointName): string {
  return `(min-width: ${BREAKPOINTS[name]}px)`;
}

/** Media query for the mobile layout: `MOBILE_MAX_WIDTH` (768px) and below. */
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_MAX_WIDTH}px)`;

function canMatchMedia(): boolean {
  return hasGlobal('window') && hasGlobal('matchMedia');
}

function subscribe(query: string, onChange: () => void): () => void {
  if (!canMatchMedia()) return () => undefined;

  const list: AnyMediaQueryList = matchMediaQuery(query);

  // Safari <14 and the legacy bundle's WebKit only have `addListener`.
  if (list.addEventListener === undefined) {
    list.addListener(onChange);
    return () => list.removeListener(onChange);
  }

  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
}

function readMatches(query: string): boolean {
  return canMatchMedia() && matchMediaQuery(query).matches;
}

// Prerendering has no viewport; `false` is the SSR-safe answer.
function serverSnapshot(): boolean {
  return false;
}

/**
 * Subscribes to one media query. `useSyncExternalStore` reads the current
 * value during render, so the first client render is already correct and no
 * effect re-syncs it.
 */
function useMediaQuery(query: string): boolean {
  // Stable per query, so React subscribes once rather than on every render.
  const subscribeToQuery = useCallback(
    (onChange: () => void) => subscribe(query, onChange),
    [query]
  );
  return useSyncExternalStore(
    subscribeToQuery,
    () => readMatches(query),
    serverSnapshot
  );
}

/**
 * Whether the viewport is at or above a named Tailwind breakpoint, i.e.
 * whether the matching `sm:` / `md:` / ... utilities currently apply.
 *
 * @example
 * ```tsx
 * const isSmUp = useBreakpoint('sm'); // true from 640px
 * ```
 */
export function useBreakpoint(name: BreakpointName): boolean {
  return useMediaQuery(breakpointQuery(name));
}

/**
 * Whether the viewport renders the mobile layout (768px and below, see
 * `MOBILE_MAX_WIDTH`). Every page shares this one definition.
 *
 * On the server (SSR/SSG) it is `false`, to avoid hydration mismatches.
 */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_MEDIA_QUERY);
}

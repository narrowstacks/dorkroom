import type { BeforeSendEvent } from '@vercel/analytics';
import type { RouteLabel, TrackedRoute } from './events';
import { TRACKED_ROUTES } from './events';

/**
 * Drop everything after the path before an event leaves the browser.
 *
 * Dorkroom puts real user input in query strings. `/border?preset=` is a base64
 * blob of someone's print dimensions, `/films?search=` is whatever they typed,
 * and `/development` carries the film, developer, and recipe they were looking
 * at. None of it is needed to read a pageview: the dashboard groups by path
 * anyway. Vercel applies `beforeSend` to custom events as well as pageviews, so
 * this covers both.
 *
 * @returns the event with a bare origin + pathname URL, or `null` to drop the
 *   event entirely when the URL cannot be parsed.
 */
export function redactAnalyticsUrl(
  event: BeforeSendEvent
): BeforeSendEvent | null {
  try {
    const { origin, pathname } = new URL(event.url);
    return { ...event, url: `${origin}${pathname}` };
  } catch {
    // An unparseable URL is not worth guessing at. Losing one event beats
    // sending an unknown string to a third party.
    return null;
  }
}

/**
 * The current route as a closed label, safe to attach to an event.
 *
 * Used instead of `window.location.pathname` because the wildcard route matches
 * anything: a visitor who lands on `/person@example.com` and triggers a render
 * error would otherwise put that string into `app_error`. `beforeSend` strips
 * the event's own `url`, but a property is a separate field and slips past it,
 * so the narrowing has to happen here. Anything off the list reports `unknown`,
 * which is also the honest answer for a 404.
 */
export function currentRouteLabel(): RouteLabel {
  if (globalThis.window === undefined) {
    return 'unknown';
  }
  // Trailing slashes are a routing detail, not a different page.
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  return isTrackedRoute(pathname) ? pathname : 'unknown';
}

function isTrackedRoute(pathname: string): pathname is TrackedRoute {
  // SAFETY: widening a `readonly TrackedRoute[]` to `readonly string[]` so
  // `includes` accepts an arbitrary pathname. Every element is a string, and
  // the array is never written through this view.
  const routes: readonly string[] = TRACKED_ROUTES;
  return routes.includes(pathname);
}

/**
 * Where a visitor came from, without recording the referrer itself.
 *
 * On a 404 this is the whole question: an `internal` miss is a broken link we
 * shipped, an `external` one is usually a stale shared URL, and `direct` is
 * typically a typo or a bot.
 */
export function referrerKind(): 'internal' | 'external' | 'direct' {
  if (globalThis.document === undefined || !document.referrer) {
    return 'direct';
  }
  try {
    return new URL(document.referrer).origin === window.location.origin
      ? 'internal'
      : 'external';
  } catch {
    return 'direct';
  }
}

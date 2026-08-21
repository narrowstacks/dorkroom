import type { BeforeSendEvent } from '@vercel/analytics';

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
 * The current route as a bare pathname, safe to attach to an event.
 *
 * Used instead of `window.location.href` so a crash on `/border?preset=...`
 * reports `/border` and nothing else. `beforeSend` already strips the event's
 * own `url`, but a property is a separate field and would otherwise slip past.
 */
export function currentRoutePath(): string {
  if (globalThis.window === undefined) {
    return '';
  }
  // Bounded here rather than in the event layer: this is the one place an
  // unbounded string enters, and Vercel silently truncates past 255 anyway.
  return window.location.pathname.slice(0, 255);
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

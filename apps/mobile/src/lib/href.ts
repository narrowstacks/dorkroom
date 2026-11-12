import type { Href } from 'expo-router';

/**
 * A path built at runtime (a tool's canonical route, a Home destination with
 * its query string) as an expo-router `Href`.
 */
export function toHref(path: string): Href {
  // SAFETY: the paths come from `tools.ts` and `home/destination.ts`, whose
  // tests check each against the route files; the typed-routes union cannot
  // express query strings or computed segments.
  return path as Href;
}

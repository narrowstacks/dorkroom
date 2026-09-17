import { track } from '@vercel/analytics';

/** A tool that can hand the user a shareable link. */
export type ShareTool = 'border' | 'recipe' | 'custom_recipe';

/** How a share link actually reached the user. */
export type ShareMethod = 'native' | 'clipboard' | 'manual';

/** Calculators, named after their route. */
export type CalculatorTool =
  | 'border'
  | 'stops'
  | 'resize'
  | 'reciprocity'
  | 'lenses'
  | 'exposure'
  | 'mat';

/** The two browse-and-filter pages. */
export type BrowseTool = 'films' | 'development';

/**
 * Which sub-mode of a calculator produced the result. This is the split that
 * pageviews cannot see: whether /resize is used for print sizes or enlarger
 * heights, whether /border runs symmetric or asymmetric, and which variable
 * /exposure was asked to solve for.
 */
export type CalculatorMode =
  | 'default'
  | 'print_size'
  | 'enlarger_height'
  | 'symmetric'
  | 'asymmetric'
  | 'shutter'
  | 'aperture'
  | 'iso';

export type FilmsFilter = 'color' | 'iso' | 'brand' | 'status';

export type DevelopmentFilter =
  | 'developer_type'
  | 'dilution'
  | 'iso'
  | 'recipe_type'
  | 'favorites';

/**
 * Every route the app can render, in the order the router declares them.
 *
 * `app_error` needs to say *where* a crash happened, and the obvious answer,
 * `window.location.pathname`, is user-controlled: the wildcard route matches
 * anything, so a crash while rendering `/person@example.com` would put that
 * free text on the wire. Bounding the length does not make it private. A closed
 * list does, at the cost of one edit whenever a route is added, which
 * `analytics.test.ts` enforces against the generated route tree.
 */
export const TRACKED_ROUTES = [
  '/',
  '/border',
  '/development',
  '/exposure',
  '/films',
  '/lenses',
  '/mat',
  '/privacy',
  '/reciprocity',
  '/resize',
  '/settings',
  '/stops',
] as const;

export type TrackedRoute = (typeof TRACKED_ROUTES)[number];

/** A known route, or `unknown` for anything the wildcard route caught. */
export type RouteLabel = TrackedRoute | 'unknown';

export type ThemeName =
  | 'light'
  | 'dark'
  | 'darkroom'
  | 'high-contrast'
  | 'system';

/**
 * Every custom event and the exact properties it carries.
 *
 * Two rules govern this map, and both are load-bearing:
 *
 * 1. **At most two properties per event.** Vercel Web Analytics accepts two on
 *    the Pro plan; eight requires the Web Analytics Plus add-on. A third key
 *    does not fail the build, it silently loses data in production. See
 *    `MAX_EVENT_PROPERTIES` for the runtime guard and the test that pins it.
 * 2. **Closed unions and numbers only, never free text.** Nothing the user
 *    typed or named may reach the wire: no search queries, film or developer
 *    names, recipe names, print dimensions, or URLs. Widening any of these to a
 *    bare `string` removes the only thing keeping user input out of the
 *    payload, so a new property gets a union or it does not get added.
 */
export interface AnalyticsEvents {
  /** A share link was produced. Pairs with `share_opened` to give a real
   *  viral coefficient rather than a raw share count. */
  share: { tool: ShareTool; method: ShareMethod };
  /** Someone arrived on a link that another user shared. */
  share_opened: { tool: ShareTool };
  recipe_saved: { action: 'created' | 'updated'; source: 'manual' | 'import' };
  recipe_deleted: { scope: 'single' | 'all' };
  recipe_imported: { ok: boolean };
  favorite_toggled: { added: boolean };
  calculator_used: { tool: CalculatorTool; mode: CalculatorMode };
  /** `preset` is always a number (an EV, a focal length, a duration in
   *  seconds), never a user-supplied preset name. */
  preset_applied: { tool: CalculatorTool; preset: number };
  theme_changed: { theme: ThemeName };
  units_changed: { context: 'measurement' | 'volume'; unit: string };
  /** `filters` is how many filters were active when the search dead-ended.
   *  The query itself is deliberately not sent. */
  search_no_results: { tool: BrowseTool; filters: number };
  detail_opened: { type: 'film' | 'recipe' };
  filter_applied: { tool: BrowseTool; filter: FilmsFilter | DevelopmentFilter };
  /** `route` is one of the app's known routes, or `unknown`. Never the raw
   *  pathname: the wildcard route would let a visitor choose the value. */
  app_error: { route: RouteLabel };
  route_not_found: { referrer: 'internal' | 'external' | 'direct' };
}

export type AnalyticsEventName = keyof AnalyticsEvents;

/** The Pro-plan ceiling. Raising this requires the Plus add-on, not just an edit. */
export const MAX_EVENT_PROPERTIES = 2;

/** The property value types Vercel Web Analytics accepts. */
export type AnalyticsValue = string | number | boolean | null;

/**
 * Enforce the plan's property ceiling.
 *
 * The event map already fixes the names and value types at every call site, so
 * nothing here re-checks them. What it does guard is the count: Vercel drops
 * surplus properties without complaining, and this keeps that loss to a
 * deterministic first-two rather than whatever key order the caller happened to
 * write. Values that need bounding are bounded where they are read, in
 * `./redact`, not here.
 */
export function capEventProperties(
  properties: Record<string, AnalyticsValue>
): Record<string, AnalyticsValue> {
  const entries = Object.entries(properties);
  return Object.fromEntries(entries.slice(0, MAX_EVENT_PROPERTIES));
}

/**
 * Send one custom event.
 *
 * Every call is typed against `AnalyticsEvents`, so the property names and the
 * set of legal values are fixed at the call site rather than assembled from
 * whatever the surrounding component happens to hold.
 */
export function trackEvent<N extends AnalyticsEventName>(
  name: N,
  properties: AnalyticsEvents[N]
): void {
  track(name, capEventProperties(properties));
}

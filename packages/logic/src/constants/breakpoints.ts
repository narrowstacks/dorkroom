/* ------------------------------------------------------------------ *
   breakpoints.ts
   -------------------------------------------------------------
   Named viewport breakpoints, shared by every responsive decision
   -------------------------------------------------------------
   Pure numbers and predicates only: the DOM subscriptions live in
   @dorkroom/ui (`useBreakpoint`, `useIsMobile`).
\* ------------------------------------------------------------------ */

/**
 * Tailwind CSS 4's default breakpoints in pixels (`sm` = 40rem, `md` = 48rem,
 * ...). The app's theme does not override them, so `BREAKPOINTS.md` is the
 * width at which a `md:` utility starts to apply.
 *
 * @public
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/** @public */
export type BreakpointName = keyof typeof BREAKPOINTS;

/**
 * Widest viewport that renders the mobile layout. Inclusive: iPad portrait
 * (exactly 768px) gets the mobile layout on every page, one pixel past where
 * Tailwind's `md:` utilities begin.
 *
 * @public
 */
export const MOBILE_MAX_WIDTH = BREAKPOINTS.md;

/**
 * Whether a viewport width renders the mobile layout (`width <= 768`).
 *
 * @public
 */
export function isMobileWidth(width: number): boolean {
  return width <= MOBILE_MAX_WIDTH;
}

/**
 * Whether a width is at or above a breakpoint, matching Tailwind's
 * `min-width` semantics (`sm:` applies from 640px up).
 *
 * @public
 */
export function isAtLeastBreakpoint(
  width: number,
  name: BreakpointName
): boolean {
  return width >= BREAKPOINTS[name];
}

/* ------------------------------------------------------------------ *
   breakpoints.ts
   -------------------------------------------------------------
   Named viewport breakpoints, shared by every responsive decision
   -------------------------------------------------------------
   Pure numbers and predicates only: the DOM subscriptions live in
   @dorkroom/ui (`useBreakpoint`, `useIsMobile`, `useColumnCount`).
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

/**
 * Container width from which the mobile card grid shows two columns instead
 * of one.
 *
 * @public
 */
export const MOBILE_TWO_COLUMN_MIN_WIDTH = 480;

/**
 * Card-grid column count for a container width.
 *
 * Desktop follows the Tailwind grid steps: 1 column below `sm`, 2 from `sm`,
 * 3 from `lg`, 4 from `xl`. Mobile shows 1 column below
 * {@link MOBILE_TWO_COLUMN_MIN_WIDTH} and 2 from it.
 *
 * @param width - Container width in pixels (not the viewport)
 * @param isMobile - Whether the page is in its mobile layout
 *
 * @public
 */
export function columnCountForWidth(width: number, isMobile: boolean): number {
  if (isMobile) return width >= MOBILE_TWO_COLUMN_MIN_WIDTH ? 2 : 1;
  if (isAtLeastBreakpoint(width, 'xl')) return 4;
  if (isAtLeastBreakpoint(width, 'lg')) return 3;
  if (isAtLeastBreakpoint(width, 'sm')) return 2;
  return 1;
}
